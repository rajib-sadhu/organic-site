import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/server/lib/razorpay";
import { queueOrderConfirmation } from "@/server/services/notify";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const eventType: string = event.event;

  if (eventType === "payment.captured") {
    const paymentEntity = event.payload?.payment?.entity;
    if (!paymentEntity) {
      return NextResponse.json({ status: "ignored" });
    }

    const rzpOrderId: string = paymentEntity.order_id;
    const rzpPaymentId: string = paymentEntity.id;

    const payment = await prisma.payment.findFirst({
      where: { rzpOrderId },
      include: { order: { select: { email: true } } },
    });

    if (!payment) {
      console.warn(`[webhook] No payment record for rzpOrderId=${rzpOrderId}`);
      return NextResponse.json({ status: "no_match" });
    }

    // Idempotent: skip if already paid
    if (payment.status === "PAID") {
      return NextResponse.json({ status: "already_processed" });
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          rzpPaymentId,
          status: "PAID",
          rawWebhook: event,
        },
      }),
      prisma.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: "PAID", status: "CONFIRMED" },
      }),
    ]);

    await queueOrderConfirmation(payment.orderId, payment.order.email);

    return NextResponse.json({ status: "captured" });
  }

  if (eventType === "payment.failed") {
    const paymentEntity = event.payload?.payment?.entity;
    if (!paymentEntity) {
      return NextResponse.json({ status: "ignored" });
    }

    const rzpOrderId: string = paymentEntity.order_id;

    const payment = await prisma.payment.findFirst({
      where: { rzpOrderId },
    });

    if (payment && payment.status !== "PAID") {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED", rawWebhook: event },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: "FAILED", status: "CANCELLED" },
        }),
      ]);

      // Release reserved stock
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: payment.orderId },
      });
      for (const item of orderItems) {
        await prisma.productVariant.updateMany({
          where: { sku: item.sku },
          data: { stock: { increment: item.qty } },
        });
      }
    }

    return NextResponse.json({ status: "failed" });
  }

  return NextResponse.json({ status: "ignored" });
}
