import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/lib/admin-auth";

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("products.edit");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const image = await prisma.productImage.findUnique({ where: { id: Number(id) } });
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.productImage.updateMany({
      where: { productId: image.productId },
      data: { isThumbnail: false },
    }),
    prisma.productImage.update({
      where: { id: image.id },
      data: { isThumbnail: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
