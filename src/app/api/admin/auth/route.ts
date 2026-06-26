import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { buildSession, createAdminToken, setAdminCookie, clearAdminCookie, getAdminSession } from "@/server/lib/admin-auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const remember = parsed.data.rememberMe ?? false;
  const session = await buildSession(user.id);
  const token = await createAdminToken(session, remember);
  await setAdminCookie(token, remember);

  return NextResponse.json({ success: true, user: { name: session.name, email: session.email, role: session.roleName } });
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user: { id: session.userId, name: session.name, email: session.email, role: session.roleName, permissions: session.permissions, isSystem: session.isSystem } });
}

export async function DELETE() {
  await clearAdminCookie();
  return NextResponse.json({ success: true });
}
