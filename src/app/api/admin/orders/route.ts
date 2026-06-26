import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/lib/admin-auth";

export async function GET(req: Request) {
  try {
    await requirePermission("orders.view");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const method = url.searchParams.get("method");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (method) where.paymentMethod = method;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      select: {
        id: true, orderNo: true, status: true, paymentMethod: true, paymentStatus: true,
        totalPaise: true, shipName: true, email: true, createdAt: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    orders: orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function PATCH(req: Request) {
  try {
    await requirePermission("orders.update_status");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.status) {
    return NextResponse.json({ error: "Missing id or status." }, { status: 400 });
  }

  const validStatuses = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id: body.id },
    data: { status: body.status },
    select: { id: true, orderNo: true, status: true },
  });

  return NextResponse.json({ order });
}
