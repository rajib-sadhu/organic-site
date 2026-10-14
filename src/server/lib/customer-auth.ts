// Customer sessions (ARCHITECTURE §6.6). Fully separate from admin auth: own
// cookie, own table. The JWT carries tokenVersion; every read re-checks it
// against the DB so a password change/reset or deactivation logs out all
// devices immediately.
import { createHmac } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/server/services/settings";
import type { CustomerAccountMode } from "@/generated/prisma/client";

const COOKIE_NAME = "customer_token";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// A key derived from AUTH_SECRET, not AUTH_SECRET itself: admin tokens are signed with the raw
// secret, so a customer token could otherwise be pasted into the admin cookie and verify.
let key: Uint8Array | null = null;
function getSecret() {
  if (key) return key;
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set.");
  key = new Uint8Array(createHmac("sha256", secret).update("customer-session-v1").digest());
  return key;
}
const AUDIENCE = "customer";

export type CustomerSession = {
  id: number;
  email: string;
  name: string | null;
  verified: boolean;
};

export async function startCustomerSession(customer: { id: number; tokenVersion: number }) {
  const token = await new SignJWT({ cid: customer.id, tv: customer.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function endCustomerSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/** The logged-in customer, or null. Also null whenever accounts are switched OFF. */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let cid: number, tv: number;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { audience: AUDIENCE });
    cid = Number(payload.cid);
    tv = Number(payload.tv);
  } catch {
    return null;
  }

  if ((await getAccountMode()) === "OFF") return null;

  const customer = await prisma.customer.findUnique({
    where: { id: cid },
    select: { id: true, email: true, name: true, emailVerifiedAt: true, isActive: true, tokenVersion: true },
  });
  if (!customer || !customer.isActive || customer.tokenVersion !== tv) return null;
  return { id: customer.id, email: customer.email, name: customer.name, verified: !!customer.emailVerifiedAt };
}

export async function getAccountMode(): Promise<CustomerAccountMode> {
  return (await getSettings()).customerAccounts;
}

export class AccountError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

/** For account API routes: throws a 404 when accounts are OFF, 401 when not logged in. */
export async function requireCustomer(): Promise<CustomerSession> {
  if ((await getAccountMode()) === "OFF") throw new AccountError("Not found.", 404);
  const session = await getCustomerSession();
  if (!session) throw new AccountError("Please log in.", 401);
  return session;
}

export async function requireAccountsEnabled(): Promise<CustomerAccountMode> {
  const mode = await getAccountMode();
  if (mode === "OFF") throw new AccountError("Not found.", 404);
  return mode;
}
