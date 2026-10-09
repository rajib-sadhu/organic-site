import { NextResponse } from "next/server";
import { setCartToken } from "@/server/lib/cart-token";
import { findCartByRecoveryToken } from "@/server/repositories/cart";

// "Return to your cart" link from a reminder email: attach that cart to this
// browser (any device), then show it.
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cart = await findCartByRecoveryToken(token);
  if (cart) await setCartToken(cart.id);
  return NextResponse.redirect(new URL("/cart", req.url));
}
