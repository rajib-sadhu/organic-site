import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const submitSchema = z.object({
  productId: z.number().int().min(1),
  authorName: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().min(10).max(2000),
  email: z.string().email().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = Number(url.searchParams.get("productId"));
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });

  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = 10;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { productId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      select: {
        id: true,
        authorName: true,
        rating: true,
        title: true,
        body: true,
        isVerified: true,
        createdAt: true,
      },
    }),
    prisma.review.count({ where: { productId, status: "APPROVED" } }),
  ]);

  const stats = await prisma.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: true,
  });

  return NextResponse.json({
    reviews: reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    total,
    page,
    pages: Math.ceil(total / limit),
    stats: {
      avg: stats._avg.rating ?? 0,
      count: stats._count,
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { productId, authorName, rating, title, body: reviewBody, email } = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: productId, isActive: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  let isVerified = false;
  let customerId: number | null = null;

  if (email) {
    const hasOrder = await prisma.orderItem.findFirst({
      where: {
        order: { email, status: { in: ["DELIVERED", "SHIPPED", "CONFIRMED"] } },
        productName: product.name,
      },
    });
    if (hasOrder) isVerified = true;

    const customer = await prisma.customer.findUnique({ where: { email } });
    if (customer) customerId = customer.id;
  }

  await prisma.review.create({
    data: {
      productId,
      customerId,
      authorName,
      rating,
      title: title || null,
      body: reviewBody,
      isVerified,
      status: "PENDING",
    },
  });

  return NextResponse.json({ message: "Review submitted! It will appear after moderation." }, { status: 201 });
}
