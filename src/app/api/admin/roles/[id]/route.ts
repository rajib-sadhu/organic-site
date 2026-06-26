import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/lib/admin-auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("roles.manage");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);

  const role = await prisma.role.findUnique({ where: { id: numId } });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role.isSystem) return NextResponse.json({ error: "Cannot edit system role." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.name || !Array.isArray(body.permissions)) {
    return NextResponse.json({ error: "Missing name or permissions." }, { status: 400 });
  }

  const perms = await prisma.permission.findMany({
    where: { key: { in: body.permissions } },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: numId } });
    await tx.role.update({
      where: { id: numId },
      data: {
        name: body.name,
        description: body.description ?? null,
        permissions: {
          create: perms.map((p) => ({ permissionId: p.id })),
        },
      },
    });
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("roles.manage");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);

  const role = await prisma.role.findUnique({ where: { id: numId } });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role.isSystem) return NextResponse.json({ error: "Cannot delete system role." }, { status: 403 });

  const userCount = await prisma.adminUser.count({ where: { roleId: numId } });
  if (userCount > 0) return NextResponse.json({ error: "Role has assigned users. Reassign them first." }, { status: 400 });

  await prisma.role.delete({ where: { id: numId } });
  return NextResponse.json({ ok: true });
}
