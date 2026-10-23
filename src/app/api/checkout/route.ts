import { NextResponse } from "next/server";
import { checkoutSchema } from "@/schema/checkout";
import { getCartToken, clearCartToken } from "@/server/lib/cart-token";
import * as cartRepo from "@/server/repositories/cart";
import { createOrder } from "@/server/services/order";
import { createRazorpayOrder, getPublicKeyId } from "@/server/lib/razorpay";
import { queueOrderConfirmation } from "@/server/services/notify";
import { getSettings } from "@/server/services/settings";
import { consumeCodOtp, releaseCodOtp, OtpError } from "@/server/services/otp";
import { getCustomerSession } from "@/server/lib/customer-auth";
import { prisma } from "@/lib/prisma";

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

  const { paymentMethod, otpCode, ...address } = parsed.data;

  // Accounts (§6.6): link the order when logged in; REQUIRED mode refuses guests.
  const settings = await getSettings();
  const customer = await getCustomerSession(); // null whenever accounts are OFF
  if (settings.customerAccounts === "REQUIRED" && !customer) {
    return NextResponse.json({ error: "Please log in to place your order.", loginRequired: true }, { status: 401 });
  }

  // COD-OTP (§6.3): when enabled, the order is only accepted with a valid code.
  let otpChallengeId: number | null = null;
  if (paymentMethod === "COD" && settings.codOtpRequired) {
    if (!otpCode) {
      return NextResponse.json(
        { error: "Verify your phone number to place a Cash on Delivery order.", otpRequired: true },
        { status: 400 },
      );
    }
    try {
      otpChallengeId = await consumeCodOtp(address.phone, otpCode);
    } catch (e) {
      if (e instanceof OtpError) {
        return NextResponse.json({ error: e.message, otpRequired: true }, { status: e.status });
      }
      throw e;
    }
  }

  let order: Awaited<ReturnType<typeof createOrder>>;
  try {
    order = await createOrder({
      cart,
      address,
      paymentMethod,
      customerId: customer?.id ?? null,
      createProviderPayment:
        paymentMethod === "RAZORPAY"
          ? async ({ orderNo, totalPaise }) => {
              const rzpOrder = await createRazorpayOrder(totalPaise, orderNo);
              return { provider: "razorpay", rzpOrderId: String(rzpOrder.id) };
            }
          : undefined,
    });
  } catch (e) {
    if (otpChallengeId) await releaseCodOtp(otpChallengeId);
    const message = e instanceof Error ? e.message : "Checkout failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await cartRepo.setEmail(cart.id, address.email);
    if (customer) await saveFirstAddress(customer.id, address);

    if (paymentMethod === "RAZORPAY") {
      return NextResponse.json({
        success: true,
        requiresPayment: true,
        orderNo: order.orderNo,
        orderId: order.id,
        trackingToken: order.trackingToken,
        totalPaise: order.totalPaise,
        razorpay: {
          keyId: getPublicKeyId(),
          orderId: order.payment?.rzpOrderId,
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

    await queueOrderConfirmation(order.id, order.email);

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

/** A customer's first order fills their saved address; after that they edit it from their account. */
async function saveFirstAddress(customerId: number, a: { phone: string; shipName: string; shipLine1: string; shipLine2?: string; shipCity: string; shipState: string; shipPincode: string }) {
  await prisma.customer.updateMany({
    where: { id: customerId, shipLine1: null },
    data: {
      shipName: a.shipName, shipLine1: a.shipLine1, shipLine2: a.shipLine2 || null,
      shipCity: a.shipCity, shipState: a.shipState, shipPincode: a.shipPincode,
    },
  });
  await prisma.customer.updateMany({ where: { id: customerId, phone: null }, data: { phone: a.phone } });
}
