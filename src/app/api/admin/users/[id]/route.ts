import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requirePermission, hasPermission } from "@/server/lib/admin-auth";
import bcrypt from "bcryptjs";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = Number(id);
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const session = await requireAdmin();
  const isSelf = session.userId === numId;

  if (body.changePassword) {
    if (isSelf) {
      if (!body.currentPassword) {
        return NextResponse.json({ error: "Current password required." }, { status: 400 });
      }
      const user = await prisma.adminUser.findUnique({ where: { id: numId } });
      if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
    } else {
      if (!hasPermission(session, "users.manage")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const target = await prisma.adminUser.findUnique({ where: { id: numId }, include: { role: true } });
      if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (target.role.isSystem && !session.isSystem) {
        return NextResponse.json({ error: "Only the owner can change the owner's password." }, { status: 403 });
      }
    }

    if (!body.newPassword || body.newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    }

    const hash = await bcrypt.hash(body.newPassword, 12);
    await prisma.adminUser.update({ where: { id: numId }, data: { passwordHash: hash } });
    return NextResponse.json({ ok: true, message: "Password updated." });
  }

  if (!hasPermission(session, "users.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.adminUser.findUnique({ where: { id: numId }, include: { role: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (target.role.isSystem && !session.isSystem) {
    return NextResponse.json({ error: "Only the owner can edit the owner account." }, { status: 403 });
  }

  if (body.roleId) {
    const targetRole = await prisma.role.findUnique({ where: { id: body.roleId } });
    if (targetRole?.isSystem && !session.isSystem) {
      return NextResponse.json({ error: "Only the owner can assign the owner role." }, { status: 403 });
    }
  }

  const data: Record<string, unknown> = {};
  if (body.name) data.name = body.name;
  if (body.email) data.email = body.email;
  if (body.roleId) data.roleId = body.roleId;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 12);

  const user = await prisma.adminUser.update({
    where: { id: numId },
    data,
    select: { id: true, name: true, email: true, isActive: true },
  });

  return NextResponse.json({ user });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("users.manage");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.adminUser.findUnique({
    where: { id: Number(id) },
    include: { role: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role.isSystem) return NextResponse.json({ error: "Cannot delete owner account." }, { status: 403 });

  await prisma.adminUser.delete({ where: { id: user.id } });
  return NextResponse.json({ ok: true });
}
