import { NextResponse } from "next/server";
import { accountRoute, parseBody } from "@/server/lib/account-route";
import { prisma } from "@/lib/prisma";
import { wishlistSchema } from "@/schema/account";
import { requireCustomer } from "@/server/lib/customer-auth";

async function list(customerId: number) {
  const rows = await prisma.customerWishlistItem.findMany({
    where: { customerId, variant: { isActive: true, product: { isActive: true } } },
    orderBy: { createdAt: "asc" },
    select: {
      variant: {
        select: {
          id: true, label: true, pricePaise: true,
          product: { select: { slug: true, name: true, images: { orderBy: [{ isThumbnail: "desc" }, { sortOrder: "asc" }], take: 1, select: { url: true } } } },
        },
      },
    },
  });
  return rows.map(({ variant: v }) => ({
    variantId: v.id,
    productSlug: v.product.slug,
    productName: v.product.name,
    variantLabel: v.label,
    pricePaise: v.pricePaise,
    image: v.product.images[0]?.url,
  }));
}

export function GET() {
  return accountRoute(async () => {
    const session = await requireCustomer();
    return NextResponse.json({ items: await list(session.id) });
  });
}

/** Add variants (also used on login to merge this browser's wishlist into the account). */
export function POST(req: Request) {
  return accountRoute(async () => {
    const session = await requireCustomer();
    const { variantIds } = await parseBody(req, wishlistSchema);
    if (variantIds.length) {
      const existing = await prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true } });
      await prisma.customerWishlistItem.createMany({
        data: existing.map((v) => ({ customerId: session.id, variantId: v.id })),
        skipDuplicates: true,
      });
    }
    return NextResponse.json({ items: await list(session.id) });
  });
}

export function DELETE(req: Request) {
  return accountRoute(async () => {
    const session = await requireCustomer();
    const { variantIds } = await parseBody(req, wishlistSchema);
    await prisma.customerWishlistItem.deleteMany({ where: { customerId: session.id, variantId: { in: variantIds } } });
    return NextResponse.json({ items: await list(session.id) });
  });
}
