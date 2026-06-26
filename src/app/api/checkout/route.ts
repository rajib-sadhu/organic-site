import { NextResponse } from "next/server";
import { checkoutSchema } from "@/schema/checkout";
import { getCartToken, clearCartToken } from "@/server/lib/cart-token";
import * as cartRepo from "@/server/repositories/cart";
import { createOrder } from "@/server/services/order";
import { createRazorpayOrder, getPublicKeyId } from "@/server/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmation } from "@/server/services/email";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message);
    return NextResponse.json({ error: messages.join(" ") }, { status: 400 });
  }

  const token = await getCartToken();
  if (!token) {
    return NextResponse.json({ error: "No active cart." }, { status: 400 });
  }

  const cart = await cartRepo.findCart(token);
  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const { paymentMethod, ...address } = parsed.data;

  try {
    const order = await createOrder({ cart, address, paymentMethod });

    await cartRepo.setEmail(cart.id, address.email);

    if (paymentMethod === "RAZORPAY") {
      const rzpOrder = await createRazorpayOrder(order.totalPaise, order.orderNo);

      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "razorpay",
          rzpOrderId: String(rzpOrder.id),
          amountPaise: order.totalPaise,
          status: "PENDING",
        },
      });

      return NextResponse.json({
        success: true,
        requiresPayment: true,
        orderNo: order.orderNo,
        orderId: order.id,
        trackingToken: order.trackingToken,
        totalPaise: order.totalPaise,
        razorpay: {
          keyId: getPublicKeyId(),
          orderId: rzpOrder.id,
          amount: order.totalPaise,
          currency: "INR",
          name: address.shipName,
          email: address.email,
          phone: address.phone,
        },
      });
    }

    // COD path
    await clearCartToken();

    sendOrderConfirmation(order.id).catch(console.error);

    return NextResponse.json({
      success: true,
      requiresPayment: false,
      orderNo: order.orderNo,
      trackingToken: order.trackingToken,
      totalPaise: order.totalPaise,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
