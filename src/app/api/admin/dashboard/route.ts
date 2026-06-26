import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/lib/admin-auth";

export async function GET() {
  try {
    await requirePermission("dashboard.view");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 86400000);

  const [
    revenueToday,
    revenue7d,
    revenue30d,
    ordersByStatus,
    recentOrders,
    topProducts,
    lowStockVariants,
    methodSplit,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { totalPaise: true },
      _count: true,
      where: { createdAt: { gte: todayStart }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
    }),
    prisma.order.aggregate({
      _sum: { totalPaise: true },
      _count: true,
      where: { createdAt: { gte: sevenDaysAgo }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
    }),
    prisma.order.aggregate({
      _sum: { totalPaise: true },
      _count: true,
      where: { createdAt: { gte: thirtyDaysAgo }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNo: true, status: true, totalPaise: true, paymentMethod: true, shipName: true, createdAt: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productName"],
      _sum: { qty: true, linePaise: true },
      orderBy: { _sum: { linePaise: "desc" } },
      take: 5,
    }),
    prisma.productVariant.findMany({
      where: { stock: { lte: 5 }, isActive: true },
      select: { id: true, label: true, sku: true, stock: true, product: { select: { name: true } } },
      orderBy: { stock: "asc" },
      take: 10,
    }),
    prisma.order.groupBy({
      by: ["paymentMethod"],
      _count: true,
      _sum: { totalPaise: true },
      where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
    }),
  ]);

  return NextResponse.json({
    revenue: {
      today: { paise: revenueToday._sum.totalPaise ?? 0, count: revenueToday._count },
      week: { paise: revenue7d._sum.totalPaise ?? 0, count: revenue7d._count },
      month: { paise: revenue30d._sum.totalPaise ?? 0, count: revenue30d._count },
    },
    ordersByStatus: ordersByStatus.map((s) => ({ status: s.status, count: s._count })),
    recentOrders: recentOrders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
    topProducts: topProducts.map((p) => ({
      name: p.productName,
      qty: p._sum.qty ?? 0,
      revenuePaise: p._sum.linePaise ?? 0,
    })),
    lowStock: lowStockVariants.map((v) => ({
      productName: v.product.name,
      variant: v.label,
      sku: v.sku,
      stock: v.stock,
    })),
    methodSplit: methodSplit.map((m) => ({
      method: m.paymentMethod,
      count: m._count,
      paise: m._sum.totalPaise ?? 0,
    })),
  });
}
