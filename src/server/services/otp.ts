// COD phone OTP (ARCHITECTURE §6.3). Codes are stored only as an HMAC; the
// plaintext lives in the outbox row until SENT, then is redacted.
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { notify } from "@/server/services/notify";

const PURPOSE = "cod";
const TTL_MINUTES = 10;
const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30_000;
const MAX_SENDS_PER_HOUR = 5;

export class OtpError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

/** "+91 98765-43210" and "+919876543210" are the same phone. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s-]/g, "");
}

function hashCode(phone: string, code: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set.");
  return createHmac("sha256", secret).update(`${PURPOSE}:${phone}:${code}`).digest("hex");
}

export async function sendCodOtp(rawPhone: string): Promise<{ ttlMinutes: number; cooldownSeconds: number }> {
  const phone = normalizePhone(rawPhone);
  const now = Date.now();

  const recent = await prisma.otpChallenge.findMany({
    where: { phone, purpose: PURPOSE, createdAt: { gte: new Date(now - 3_600_000) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent[0] && now - recent[0].createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new OtpError("Please wait a few seconds before requesting another code.", 429);
  }
  if (recent.length >= MAX_SENDS_PER_HOUR) {
    throw new OtpError("Too many codes requested. Please try again later.", 429);
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");

  // Only the newest code is valid: retire any outstanding ones.
  await prisma.otpChallenge.updateMany({
    where: { phone, purpose: PURPOSE, consumed: false },
    data: { consumed: true },
  });
  const challenge = await prisma.otpChallenge.create({
    data: {
      phone,
      purpose: PURPOSE,
      codeHash: hashCode(phone, code),
      expiresAt: new Date(now + TTL_MINUTES * 60_000),
    },
  });

  const { sent } = await notify({
    template: "cod.otp",
    data: { code, ttlMinutes: TTL_MINUTES },
    to: phone,
    priority: "HIGH",
    dedupeKey: `otp:challenge:${challenge.id}`,
    maxAttempts: 1, // a late OTP is useless; the customer retries instead
  });
  if (!sent) {
    await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumed: true } });
    throw new OtpError("We couldn't send the code. Please try again.", 502);
  }

  return { ttlMinutes: TTL_MINUTES, cooldownSeconds: RESEND_COOLDOWN_MS / 1000 };
}

/**
 * Verify and consume the current code for this phone. Returns the challenge id
 * so the caller can release it if the order then fails to be created.
 */
export async function consumeCodOtp(rawPhone: string, code: string): Promise<number> {
  const phone = normalizePhone(rawPhone);
  const challenge = await prisma.otpChallenge.findFirst({
    where: { phone, purpose: PURPOSE, consumed: false },
    orderBy: { id: "desc" },
  });

  if (!challenge) {
    throw new OtpError("No active code for this number. Please request a new one.");
  }
  if (challenge.expiresAt.getTime() < Date.now()) {
    throw new OtpError("Your code has expired. Please request a new one.");
  }
  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new OtpError("Too many incorrect attempts. Please request a new code.");
  }

  const expected = Buffer.from(challenge.codeHash, "hex");
  const actual = Buffer.from(hashCode(phone, code), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await prisma.otpChallenge.updateMany({
      where: { id: challenge.id, attempts: { lt: MAX_VERIFY_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    throw new OtpError("Incorrect code. Please check and try again.");
  }

  // Conditional update: two concurrent submits can't both consume the same code.
  const { count } = await prisma.otpChallenge.updateMany({
    where: { id: challenge.id, consumed: false },
    data: { consumed: true },
  });
  if (count !== 1) throw new OtpError("This code was already used. Please request a new one.");

  return challenge.id;
}

/** Give the code back if the order couldn't be placed (e.g. stock ran out). */
export async function releaseCodOtp(challengeId: number): Promise<void> {
  await prisma.otpChallenge.update({ where: { id: challengeId }, data: { consumed: false } });
}
