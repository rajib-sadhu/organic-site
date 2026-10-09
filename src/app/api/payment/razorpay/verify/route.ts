import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPaymentSignature } from "@/server/lib/razorpay";
import { clearCartToken } from "@/server/lib/cart-token";
import { queueOrderConfirmation } from "@/server/services/notify";

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

  if (payment.status === "PAID") {
    return NextResponse.json({
      success: true,
      orderNo: payment.order.orderNo,
      trackingToken: payment.order.trackingToken,
    });
  }

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { rzpPaymentId: razorpay_payment_id, rzpSignature: razorpay_signature, status: "PAID" },
    }),
    prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: "PAID", status: "CONFIRMED" },
    }),
  ]);

  await clearCartToken();

  await queueOrderConfirmation(payment.orderId, payment.order.email);

  return NextResponse.json({
    success: true,
    orderNo: payment.order.orderNo,
    trackingToken: payment.order.trackingToken,
  });
}
