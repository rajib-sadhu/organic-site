import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/lib/admin-auth";

export async function GET() {
  try {
    await requirePermission("settings.manage");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let settings = await prisma.setting.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await prisma.setting.create({ data: { id: 1 } });
  }

  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  try {
    await requirePermission("settings.manage");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const settings = await prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1, ...body },
    update: body,
  });

  return NextResponse.json({ settings });
}
