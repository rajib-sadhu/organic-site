// Catalog data access (storefront, read-only).
//
// Every query is wrapped in `safe()` so the storefront degrades gracefully when
// the database is not yet configured/seeded: pages render empty states instead
// of crashing the build or dev server. Once DATABASE_URL is set and seeded, real
// data flows through automatically (pages use ISR — see `revalidate`).
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const desc = "desc" as Prisma.SortOrder;
const asc = "asc" as Prisma.SortOrder;

async function safe<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[catalog] ${label} failed (DB not ready?):`, (err as Error).message);
    return fallback;
  }
}

const productSelect = {
  id: true,
  slug: true,
  name: true,
  tagline: true,
  shortDescription: true,
  description: true,
  isFeatured: true,
  ratingAvg: true,
  ratingCount: true,
  tags: true,
  highlights: true,
  benefits: true,
  howToUse: true,
  ingredients: true,
  nutritionInfo: true,
  shelfLife: true,
  storage: true,
  metaTitle: true,
  metaDescription: true,
  metaKeywords: true,
  images: {
    orderBy: [{ isThumbnail: desc }, { sortOrder: asc }],
    select: { url: true, alt: true, isThumbnail: true },
  },
  variants: {
    where: { isActive: true },
    orderBy: { pricePaise: asc },
    select: { id: true, label: true, sku: true, pricePaise: true, mrpPaise: true, weightGrams: true, stock: true },
  },
  category: { select: { slug: true, name: true } },
};

export type CatalogVariant = {
  id: number; label: string; sku: string; pricePaise: number;
  mrpPaise: number | null; weightGrams: number | null; stock: number;
};

export type CatalogProduct = {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  shortDescription: string | null;
  description: string;
  isFeatured: boolean;
  ratingAvg: number;
  ratingCount: number;
  tags: string[];
  highlights: string[];
  benefits: string[];
  howToUse: string | null;
  ingredients: string | null;
  nutritionInfo: Record<string, string> | null;
  shelfLife: string | null;
  storage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  images: { url: string; alt: string | null; isThumbnail: boolean }[];
  variants: CatalogVariant[];
  category: { slug: string; name: string };
};

export type CatalogCategory = { slug: string; name: string };

export function getFeaturedProducts(limit = 6): Promise<CatalogProduct[]> {
  return safe(
    () =>
      prisma.product.findMany({
        where: { isActive: true, isFeatured: true },
        select: productSelect,
        orderBy: { createdAt: "desc" },
        take: limit,
      }) as unknown as Promise<CatalogProduct[]>,
    [],
    "getFeaturedProducts",
  );
}

export function getAllProducts(categorySlug?: string): Promise<CatalogProduct[]> {
  return safe(
    () =>
      prisma.product.findMany({
        where: {
          isActive: true,
          ...(categorySlug ? { category: { slug: categorySlug } } : {}),
        },
        select: productSelect,
        orderBy: { createdAt: "desc" },
      }) as unknown as Promise<CatalogProduct[]>,
    [],
    "getAllProducts",
  );
}

export function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  return safe(
    () =>
      prisma.product.findFirst({
        where: { slug, isActive: true },
        select: productSelect,
      }) as unknown as Promise<CatalogProduct | null>,
    null,
    "getProductBySlug",
  );
}

export function getCategories(): Promise<CatalogCategory[]> {
  return safe(
    () =>
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { slug: true, name: true },
      }),
    [],
    "getCategories",
  );
}

export function getAllProductSlugs(): Promise<{ slug: string }[]> {
  return safe(
    () => prisma.product.findMany({ where: { isActive: true }, select: { slug: true } }),
    [],
    "getAllProductSlugs",
  );
}
