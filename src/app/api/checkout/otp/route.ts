import { NextResponse } from "next/server";
import { otpRequestSchema } from "@/schema/checkout";
import { getCartToken } from "@/server/lib/cart-token";
import * as cartRepo from "@/server/repositories/cart";
import { getSettings } from "@/server/services/settings";
import { sendCodOtp, OtpError } from "@/server/services/otp";

// Sends a COD verification code to the checkout phone number (§6.3).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = otpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(" ") }, { status: 400 });
  }

  if (!(await getSettings()).codOtpRequired) {
    return NextResponse.json({ error: "Phone verification is not required." }, { status: 400 });
  }

  // Only a shopper with a non-empty cart can trigger an SMS — keeps this from being a free SMS relay.
  const token = await getCartToken();
  const cart = token ? await cartRepo.findCart(token) : null;
  if (!cart || cart.items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  try {
    const result = await sendCodOtp(parsed.data.phone);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    if (e instanceof OtpError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
