import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  orderNo: z.string().min(1).max(30),
  email: z.string().email(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid order number and email." }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { orderNo: parsed.data.orderNo, email: parsed.data.email },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.json({ error: "No order found with that number and email." }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      orderNo: order.orderNo,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt.toISOString(),
      shipName: order.shipName,
      shipLine1: order.shipLine1,
      shipLine2: order.shipLine2,
      shipCity: order.shipCity,
      shipState: order.shipState,
      shipPincode: order.shipPincode,
      email: order.email,
      phone: order.phone,
      subtotalPaise: order.subtotalPaise,
      discountPaise: order.discountPaise,
      shippingPaise: order.shippingPaise,
      codFeePaise: order.codFeePaise,
      totalPaise: order.totalPaise,
      couponCode: order.couponCode,
      items: order.items.map((i) => ({
        productName: i.productName,
        variantLabel: i.variantLabel,
        qty: i.qty,
        unitPaise: i.unitPaise,
        linePaise: i.linePaise,
      })),
    },
  });
}
