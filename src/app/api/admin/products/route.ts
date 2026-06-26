import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/lib/admin-auth";
import { productSchema } from "@/schema/product";

export async function GET(req: Request) {
  try {
    await requirePermission("products.view");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const search = url.searchParams.get("q") ?? "";
  const categoryId = url.searchParams.get("category") ? Number(url.searchParams.get("category")) : undefined;
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (search) where.name = { contains: search };
  if (categoryId) where.categoryId = categoryId;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        category: { select: { name: true } },
        variants: {
          select: { id: true, label: true, sku: true, pricePaise: true, mrpPaise: true, weightGrams: true, stock: true, isActive: true },
        },
        images: { select: { id: true, url: true, alt: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products: products.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: Request) {
  try {
    await requirePermission("products.create");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { variants, nutritionInfo, ...data } = parsed.data;

  const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
  }

  const skus = variants.map((v) => v.sku);
  const dupes = await prisma.productVariant.findMany({ where: { sku: { in: skus } }, select: { sku: true } });
  if (dupes.length) {
    return NextResponse.json({ error: `Duplicate SKU(s): ${dupes.map((d) => d.sku).join(", ")}` }, { status: 409 });
  }

  const product = await prisma.product.create({
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
      variants: {
        create: variants.map((v) => ({
          label: v.label,
          sku: v.sku,
          pricePaise: v.pricePaise,
          mrpPaise: v.mrpPaise,
          weightGrams: v.weightGrams,
          stock: v.stock,
          isActive: v.isActive,
        })),
      },
    },
    include: { variants: true },
  });

  return NextResponse.json({ product }, { status: 201 });
}
