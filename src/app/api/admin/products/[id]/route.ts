import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/lib/admin-auth";
import { productSchema } from "@/schema/product";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("products.view");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
    include: {
      category: { select: { id: true, name: true } },
      variants: { orderBy: { id: "asc" } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    product: {
      ...product,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      variants: product.variants.map((v) => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      })),
    },
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("products.edit");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);
  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { variants, nutritionInfo, ...data } = parsed.data;

  const slugConflict = await prisma.product.findFirst({
    where: { slug: data.slug, id: { not: numId } },
  });
  if (slugConflict) {
    return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
  }

  const existingVariants = await prisma.productVariant.findMany({
    where: { productId: numId },
    select: { id: true },
  });
  const existingIds = new Set(existingVariants.map((v) => v.id));
  const incomingIds = new Set(variants.filter((v) => v.id).map((v) => v.id!));
  const toDelete = [...existingIds].filter((vid) => !incomingIds.has(vid));

  const skuCheck = variants.map((v) => v.sku);
  const dupes = await prisma.productVariant.findMany({
    where: { sku: { in: skuCheck }, productId: { not: numId } },
    select: { sku: true },
  });
  if (dupes.length) {
    return NextResponse.json({ error: `Duplicate SKU(s): ${dupes.map((d) => d.sku).join(", ")}` }, { status: 409 });
  }

  const product = await prisma.$transaction(async (tx) => {
    if (toDelete.length) {
      await tx.productVariant.deleteMany({ where: { id: { in: toDelete } } });
    }

    for (const v of variants) {
      if (v.id && existingIds.has(v.id)) {
        await tx.productVariant.update({
          where: { id: v.id },
          data: { label: v.label, sku: v.sku, pricePaise: v.pricePaise, mrpPaise: v.mrpPaise, weightGrams: v.weightGrams, stock: v.stock, isActive: v.isActive },
        });
      } else {
        await tx.productVariant.create({
          data: { productId: numId, label: v.label, sku: v.sku, pricePaise: v.pricePaise, mrpPaise: v.mrpPaise, weightGrams: v.weightGrams, stock: v.stock, isActive: v.isActive },
        });
      }
    }

    return tx.product.update({
      where: { id: numId },
      data: {
        ...data,
        tagline: data.tagline || null,
        shortDescription: data.shortDescription || null,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        metaKeywords: data.metaKeywords || null,
        howToUse: data.howToUse || null,
        ingredients: data.ingredients || null,
        shelfLife: data.shelfLife || null,
        storage: data.storage || null,
        nutritionInfo: nutritionInfo ?? Prisma.DbNull,
      },
      include: { variants: true },
    });
  });

  return NextResponse.json({ product });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("products.delete");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.product.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
