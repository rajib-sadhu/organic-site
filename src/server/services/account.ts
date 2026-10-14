// Optional customer accounts (ARCHITECTURE §6.6): registration, password and
// email-code login, email verification, password reset, and guest-order linking.
// Secrets (codes, link tokens) are stored only as an HMAC; the plaintext lives
// in the outbox row until SENT, then is redacted.
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";
import { notify } from "@/server/services/notify";
import { AccountError } from "@/server/lib/customer-auth";
import type { CustomerTokenType } from "@/generated/prisma/client";

const BCRYPT_COST = 12;
const CODE_TTL_MINUTES = 10;
const VERIFY_TTL_MINUTES = 60 * 24;
const RESET_TTL_MINUTES = 60;
const MAX_CODE_ATTEMPTS = 5;
const SEND_COOLDOWN_MS = 30_000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_PASSWORD_FAILS = 5;
const PASSWORD_LOCK_MS = 15 * 60_000;
const FROM_ORDER_WINDOW_MS = 24 * 3_600_000;

export const MIN_PASSWORD_LENGTH = 8;

// Compared against when the email has no account, so a miss takes as long as a wrong password.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("not-a-real-password", BCRYPT_COST));

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hmac(value: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set.");
  return createHmac("sha256", secret).update(`customer-token:${value}`).digest("hex");
}

/** Codes are short, so the hash is salted with the row's own expiry (unique per issue). */
function codeHash(email: string, expiresAt: Date, code: string) {
  return hmac(`LOGIN_CODE:${email}:${expiresAt.getTime()}:${code}`);
}

function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

// ---------- rate limits ----------

async function assertCanSend(email: string, purpose: CustomerTokenType) {
  const now = Date.now();
  const recent = await prisma.customerToken.findMany({
    where: { email, purpose, createdAt: { gte: new Date(now - 3_600_000) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent[0] && now - recent[0].createdAt.getTime() < SEND_COOLDOWN_MS) {
    throw new AccountError("Please wait a few seconds before requesting another email.", 429);
  }
  if (recent.length >= MAX_SENDS_PER_HOUR) {
    throw new AccountError("Too many emails requested. Please try again later.", 429);
  }
}

// Password failures per email. In memory: the app runs as one PM2 process (ecosystem.config.js).
const passwordFails = new Map<string, { count: number; until: number }>();

function assertNotLocked(email: string) {
  const entry = passwordFails.get(email);
  if (entry && entry.count >= MAX_PASSWORD_FAILS && entry.until > Date.now()) {
    throw new AccountError("Too many failed attempts. Try again in 15 minutes, or log in with an email code.", 429);
  }
}

function recordPasswordFail(email: string) {
  const now = Date.now();
  const entry = passwordFails.get(email);
  const fresh = !entry || entry.until <= now;
  passwordFails.set(email, { count: fresh ? 1 : entry.count + 1, until: now + PASSWORD_LOCK_MS });
}

// ---------- guest order linking ----------

/**
 * Attach past guest orders placed with this email. Only call once the customer has
 * proved they own the inbox (verify link, email code, password reset).
 */
async function linkGuestOrders(customerId: number, email: string) {
  await prisma.order.updateMany({ where: { email, customerId: null }, data: { customerId } });
}

async function markVerified(customer: { id: number; email: string; emailVerifiedAt: Date | null }) {
  if (!customer.emailVerifiedAt) {
    await prisma.customer.update({ where: { id: customer.id }, data: { emailVerifiedAt: new Date() } });
  }
  await linkGuestOrders(customer.id, customer.email);
}

// ---------- links (verify / reset) ----------

async function issueLink(customer: { id: number; email: string }, purpose: "VERIFY_EMAIL" | "RESET_PASSWORD", ttlMinutes: number) {
  await assertCanSend(customer.email, purpose);
  const token = randomBytes(32).toString("base64url");
  // Only the newest link works.
  await prisma.customerToken.updateMany({
    where: { customerId: customer.id, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.customerToken.create({
    data: {
      purpose,
      email: customer.email,
      customerId: customer.id,
      secretHash: hmac(`${purpose}:${token}`),
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
    },
  });
  return token;
}

/** Validate and consume a link token. Conditional update, so a double click can't use it twice. */
async function consumeLink(token: string, purpose: "VERIFY_EMAIL" | "RESET_PASSWORD") {
  const row = await prisma.customerToken.findUnique({
    where: { secretHash: hmac(`${purpose}:${token}`) },
    include: { customer: true },
  });
  if (!row || row.purpose !== purpose || !row.customer) throw new AccountError("This link is invalid.");
  if (row.consumedAt) throw new AccountError("This link has already been used.");
  if (row.expiresAt.getTime() < Date.now()) throw new AccountError("This link has expired. Please request a new one.");
  const { count } = await prisma.customerToken.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (count !== 1) throw new AccountError("This link has already been used.");
  return row.customer;
}

export async function sendVerificationEmail(customerId: number) {
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  if (customer.emailVerifiedAt) return;
  const token = await issueLink(customer, "VERIFY_EMAIL", VERIFY_TTL_MINUTES);
  await notify({
    template: "account.verify_email",
    data: { url: `${siteConfig.url}/account/verify/${token}`, name: customer.name },
    to: customer.email,
    priority: "HIGH",
  }, { wait: false });
}

export async function verifyEmail(token: string) {
  const customer = await consumeLink(token, "VERIFY_EMAIL");
  if (!customer.isActive) throw new AccountError("This account is disabled.", 403);
  await markVerified(customer);
  return customer;
}

// ---------- registration & password login ----------

export async function register(input: { name: string; email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const existing = await prisma.customer.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new AccountError("An account with this email already exists. Log in instead.", 409);

  const customer = await prisma.customer.create({
    data: { email, name: input.name.trim(), passwordHash: await bcrypt.hash(input.password, BCRYPT_COST) },
  });
  await sendVerificationEmail(customer.id).catch((e) => console.error("[account] verify email failed:", e));
  return customer;
}

export async function loginWithPassword(rawEmail: string, password: string) {
  const email = normalizeEmail(rawEmail);
  assertNotLocked(email);
  const customer = await prisma.customer.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, customer?.passwordHash ?? (await getDummyHash()));
  if (!customer || !customer.passwordHash || !ok) {
    recordPasswordFail(email);
    throw new AccountError(
      customer && !customer.passwordHash
        ? "This account has no password yet. Log in with an email code, then set one."
        : "Incorrect email or password.",
      401,
    );
  }
  if (!customer.isActive) throw new AccountError("This account is disabled.", 403);
  passwordFails.delete(email);
  return customer;
}

// ---------- email code login (also signs up) ----------

export async function sendLoginCode(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  const customer = await prisma.customer.findUnique({ where: { email }, select: { id: true, isActive: true } });
  if (customer && !customer.isActive) throw new AccountError("This account is disabled.", 403);
  await assertCanSend(email, "LOGIN_CODE");

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);
  await prisma.customerToken.updateMany({
    where: { email, purpose: "LOGIN_CODE", consumedAt: null },
    data: { consumedAt: new Date() },
  });
  const row = await prisma.customerToken.create({
    data: { purpose: "LOGIN_CODE", email, customerId: customer?.id ?? null, secretHash: codeHash(email, expiresAt, code), expiresAt },
  });

  const { sent } = await notify({
    template: "account.login_code",
    data: { code, ttlMinutes: CODE_TTL_MINUTES },
    to: email,
    priority: "HIGH",
    dedupeKey: `account:code:${row.id}`,
    maxAttempts: 1, // a late code is useless; the customer asks again
  });
  if (!sent) {
    await prisma.customerToken.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
    throw new AccountError("We couldn't send the code. Please try again.", 502);
  }
  return { ttlMinutes: CODE_TTL_MINUTES, cooldownSeconds: SEND_COOLDOWN_MS / 1000 };
}

/** Verify the code; creates the account on first login. The code proves the inbox, so the email is verified. */
export async function loginWithCode(rawEmail: string, code: string) {
  const email = normalizeEmail(rawEmail);
  const row = await prisma.customerToken.findFirst({
    where: { email, purpose: "LOGIN_CODE", consumedAt: null },
    orderBy: { id: "desc" },
  });
  if (!row) throw new AccountError("No active code for this email. Please request a new one.");
  if (row.expiresAt.getTime() < Date.now()) throw new AccountError("Your code has expired. Please request a new one.");
  if (row.attempts >= MAX_CODE_ATTEMPTS) throw new AccountError("Too many incorrect attempts. Please request a new code.");

  if (!safeEqualHex(row.secretHash, codeHash(email, row.expiresAt, code))) {
    await prisma.customerToken.updateMany({
      where: { id: row.id, attempts: { lt: MAX_CODE_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    throw new AccountError("Incorrect code. Please check and try again.");
  }
  const { count } = await prisma.customerToken.updateMany({
    where: { id: row.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (count !== 1) throw new AccountError("This code was already used. Please request a new one.");

  const existing = await prisma.customer.findUnique({ where: { email } });
  const customer = existing ?? (await prisma.customer.upsert({ where: { email }, create: { email }, update: {} }));
  if (!customer.isActive) throw new AccountError("This account is disabled.", 403);
  await markVerified(customer);
  return { customer, created: !existing };
}

// ---------- password reset & change ----------

/** Always succeeds from the caller's view, so it can't be used to discover which emails have accounts. */
export async function requestPasswordReset(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer || !customer.isActive) return;
  const token = await issueLink(customer, "RESET_PASSWORD", RESET_TTL_MINUTES);
  await notify({
    template: "account.reset_password",
    data: { url: `${siteConfig.url}/account/reset/${token}`, ttlMinutes: RESET_TTL_MINUTES },
    to: email,
    priority: "HIGH",
  }, { wait: false });
}

export async function resetPassword(token: string, password: string) {
  const customer = await consumeLink(token, "RESET_PASSWORD");
  if (!customer.isActive) throw new AccountError("This account is disabled.", 403);
  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash: await bcrypt.hash(password, BCRYPT_COST), tokenVersion: { increment: 1 } },
  });
  passwordFails.delete(customer.email);
  await markVerified(customer); // the link proved the inbox
  return updated;
}

/** Changing (or first setting) a password logs out every other device. */
export async function changePassword(customerId: number, currentPassword: string | undefined, newPassword: string) {
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  if (customer.passwordHash) {
    if (!currentPassword || !(await bcrypt.compare(currentPassword, customer.passwordHash))) {
      throw new AccountError("Your current password is incorrect.", 401);
    }
  }
  return prisma.customer.update({
    where: { id: customerId },
    data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_COST), tokenVersion: { increment: 1 } },
  });
}

// ---------- account from an order (confirmation page) ----------

/**
 * "Create an account" after checkout. The tracking token proves the shopper has this order,
 * so it's linked right away; other guest orders wait for email verification.
 */
export async function registerFromOrder(trackingToken: string, password: string) {
  const order = await prisma.order.findUnique({ where: { trackingToken } });
  if (!order) throw new AccountError("Order not found.", 404);
  if (order.customerId) throw new AccountError("This order is already linked to an account.", 409);
  // The tracking link is long-lived (it's in the confirmation email); only honour it right after checkout.
  if (Date.now() - order.createdAt.getTime() > FROM_ORDER_WINDOW_MS) {
    throw new AccountError("This offer has expired. Create an account from the Log in page instead.", 410);
  }

  const email = normalizeEmail(order.email);
  const existing = await prisma.customer.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new AccountError("An account with this email already exists. Log in to see this order.", 409);

  const customer = await prisma.customer.create({
    data: {
      email,
      name: order.shipName,
      phone: order.phone,
      passwordHash: await bcrypt.hash(password, BCRYPT_COST),
      shipName: order.shipName,
      shipLine1: order.shipLine1,
      shipLine2: order.shipLine2,
      shipCity: order.shipCity,
      shipState: order.shipState,
      shipPincode: order.shipPincode,
    },
  });
  await prisma.order.update({ where: { id: order.id }, data: { customerId: customer.id } });
  await sendVerificationEmail(customer.id).catch((e) => console.error("[account] verify email failed:", e));
  return customer;
}
