import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPaymentSignature } from "@/server/lib/razorpay";
import { clearCartToken } from "@/server/lib/cart-token";
import { queueOrderConfirmation } from "@/server/services/notify";
import { markOrderPaid } from "@/server/services/order";

const schema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment data." }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const valid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!valid) {
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({
    where: { rzpOrderId: razorpay_order_id },
    include: { order: true },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
  }

  const result = await markOrderPaid({
    paymentId: payment.id,
    rzpPaymentId: razorpay_payment_id,
    rzpSignature: razorpay_signature,
  });

  await clearCartToken();

  if (result.status === "confirmed") {
    await queueOrderConfirmation(payment.orderId, payment.order.email);
  }
  if (result.status === "paid_needs_refund") {
    return NextResponse.json(
      { error: "Payment received, but this order had expired and an item sold out. You'll be refunded in full." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    success: true,
    orderNo: payment.order.orderNo,
    trackingToken: payment.order.trackingToken,
  });
}
