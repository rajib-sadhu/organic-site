import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/server/lib/razorpay";
import { queueOrderConfirmation } from "@/server/services/notify";
import { markOrderPaid } from "@/server/services/order";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const eventType: string = event.event;
  const paymentEntity = event.payload?.payment?.entity;

  if (eventType !== "payment.captured" && eventType !== "payment.failed") {
    return NextResponse.json({ status: "ignored" });
  }
  if (!paymentEntity) {
    return NextResponse.json({ status: "ignored" });
  }

  const rzpOrderId: string = paymentEntity.order_id;
  const payment = await prisma.payment.findFirst({
    where: { rzpOrderId },
    include: { order: { select: { email: true } } },
  });
  if (!payment) {
    console.warn(`[webhook] No payment record for rzpOrderId=${rzpOrderId}`);
    return NextResponse.json({ status: "no_match" });
  }

  if (eventType === "payment.captured") {
    const result = await markOrderPaid({
      paymentId: payment.id,
      rzpPaymentId: String(paymentEntity.id),
      rawWebhook: event,
    });
    if (result.status === "confirmed") {
      await queueOrderConfirmation(payment.orderId, payment.order.email);
    }
    return NextResponse.json({ status: result.status });
  }

  // payment.failed is sent for every failed attempt, and the customer can
  // retry in the same checkout. Record it, but keep the order and its stock —
  // the order is only cancelled when it expires unpaid (see payment-expiry).
  await prisma.payment.updateMany({
    where: { id: payment.id, status: { not: "PAID" } },
    data: { status: "FAILED", rawWebhook: event },
  });
  return NextResponse.json({ status: "failed_attempt_recorded" });
}
