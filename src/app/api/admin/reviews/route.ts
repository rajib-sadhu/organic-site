import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/lib/admin-auth";

export async function GET(req: Request) {
  try {
    await requirePermission("products.view");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "PENDING";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        product: { select: { name: true, slug: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      rating: r.rating,
      title: r.title,
      body: r.body,
      isVerified: r.isVerified,
      status: r.status,
      product: r.product,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function PATCH(req: Request) {
  try {
    await requirePermission("products.edit");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.status) {
    return NextResponse.json({ error: "Missing id or status." }, { status: 400 });
  }

  const validStatuses = ["PENDING", "APPROVED", "REJECTED"];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const review = await prisma.review.update({
    where: { id: body.id },
    data: { status: body.status },
    include: { product: { select: { id: true } } },
  });

  if (body.status === "APPROVED" || body.status === "REJECTED") {
    const stats = await prisma.review.aggregate({
      where: { productId: review.productId, status: "APPROVED" },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.product.update({
      where: { id: review.productId },
      data: {
        ratingAvg: stats._avg.rating ?? 0,
        ratingCount: stats._count,
      },
    });
  }

  return NextResponse.json({ review: { id: review.id, status: review.status } });
}
