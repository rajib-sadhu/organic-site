import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/lib/admin-auth";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await requirePermission("users.view");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, isActive: true,
      role: { select: { id: true, name: true, isSystem: true } },
      createdAt: true,
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
  });
}

export async function POST(req: Request) {
  try {
    await requirePermission("users.manage");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.password || !body?.roleId) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const existing = await prisma.adminUser.findUnique({ where: { email: body.email } });
  if (existing) return NextResponse.json({ error: "Email already exists." }, { status: 409 });

  const hash = await bcrypt.hash(body.password, 12);
  const user = await prisma.adminUser.create({
    data: { name: body.name, email: body.email, passwordHash: hash, roleId: body.roleId },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
