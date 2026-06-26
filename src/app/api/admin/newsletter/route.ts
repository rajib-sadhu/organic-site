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
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = 50;

  const [subscribers, total, activeCount] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { unsubAt: null } }),
  ]);

  return NextResponse.json({
    subscribers: subscribers.map((s) => ({
      id: s.id,
      email: s.email,
      isConfirmed: s.isConfirmed,
      source: s.source,
      createdAt: s.createdAt.toISOString(),
      unsubAt: s.unsubAt?.toISOString() ?? null,
    })),
    total,
    activeCount,
    page,
    pages: Math.ceil(total / limit),
  });
}
