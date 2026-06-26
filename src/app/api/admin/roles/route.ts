import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/lib/admin-auth";

export async function GET() {
  try {
    await requirePermission("users.view");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roles = await prisma.role.findMany({
    orderBy: { id: "asc" },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json({
    roles: roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      userCount: r._count.users,
      permissions: r.permissions.map((rp) => rp.permission.key),
    })),
  });
}

export async function POST(req: Request) {
  try {
    await requirePermission("roles.manage");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name || !Array.isArray(body.permissions)) {
    return NextResponse.json({ error: "Missing name or permissions." }, { status: 400 });
  }

  const perms = await prisma.permission.findMany({
    where: { key: { in: body.permissions } },
    select: { id: true },
  });

  const role = await prisma.role.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      permissions: {
        create: perms.map((p) => ({ permissionId: p.id })),
      },
    },
  });

  return NextResponse.json({ role }, { status: 201 });
}
