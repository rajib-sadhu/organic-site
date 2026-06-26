import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "admin_token";
const MAX_AGE_REMEMBER = 60 * 60 * 24 * 30; // 30 days
const MAX_AGE_SESSION = 60 * 60 * 24; // 1 day

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set.");
  return new TextEncoder().encode(secret);
}

export type AdminSession = {
  userId: number;
  email: string;
  name: string;
  roleId: number;
  roleName: string;
  isSystem: boolean;
  permissions: string[];
};

export async function createAdminToken(session: AdminSession, rememberMe = false): Promise<string> {
  const maxAge = rememberMe ? MAX_AGE_REMEMBER : MAX_AGE_SESSION;
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${maxAge}s`)
    .setIssuedAt()
    .sign(getSecret());
}

export async function setAdminCookie(token: string, rememberMe = false) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: rememberMe ? MAX_AGE_REMEMBER : MAX_AGE_SESSION,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export function hasPermission(session: AdminSession, key: string): boolean {
  if (session.isSystem) return true;
  return session.permissions.includes(key);
}

export async function requirePermission(key: string): Promise<AdminSession> {
  const session = await requireAdmin();
  if (!hasPermission(session, key)) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function buildSession(userId: number): Promise<AdminSession> {
  const user = await prisma.adminUser.findUniqueOrThrow({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    roleId: user.role.id,
    roleName: user.role.name,
    isSystem: user.role.isSystem,
    permissions: user.role.permissions.map((rp) => rp.permission.key),
  };
}
