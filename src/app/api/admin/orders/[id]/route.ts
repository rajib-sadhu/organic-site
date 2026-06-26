import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/lib/admin-auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("orders.view");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);
  if (!numId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: numId },
    include: {
      items: true,
      invoice: { select: { invoiceNo: true, pdfPath: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    order: {
      id: order.id,
      orderNo: order.orderNo,
      trackingToken: order.trackingToken,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      email: order.email,
      phone: order.phone,
      shipName: order.shipName,
      shipLine1: order.shipLine1,
      shipLine2: order.shipLine2,
      shipCity: order.shipCity,
      shipState: order.shipState,
      shipPincode: order.shipPincode,
      subtotalPaise: order.subtotalPaise,
      discountPaise: order.discountPaise,
      shippingPaise: order.shippingPaise,
      codFeePaise: order.codFeePaise,
      totalPaise: order.totalPaise,
      couponCode: order.couponCode,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((i) => ({
        productName: i.productName,
        variantLabel: i.variantLabel,
        sku: i.sku,
        qty: i.qty,
        unitPaise: i.unitPaise,
        linePaise: i.linePaise,
      })),
      invoice: order.invoice,
    },
  });
}
