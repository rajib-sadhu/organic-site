import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { OrderDetail, type OrderView } from "@/components/order/OrderDetail";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Order Status", robots: { index: false } };

export default async function OrderTrackingPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;

  const order = await prisma.order.findUnique({
    where: { trackingToken: token },
    include: { items: true },
  });

  if (!order) notFound();

  const view: OrderView = {
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
  };

  return (
    <div className="py-12 sm:py-16">
      <Container className="mx-auto max-w-2xl">
        <OrderDetail order={view} />
      </Container>
    </div>
  );
}
