import { NextResponse } from "next/server";
import { cartActionSchema } from "@/schema/cart";
import { getCartToken, setCartToken } from "@/server/lib/cart-token";
import * as cartRepo from "@/server/repositories/cart";
import { computeTotals, serializeCart } from "@/server/services/cart";
import { validateCoupon } from "@/server/services/coupon";

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const token = await getCartToken();
  if (!token) {
    return NextResponse.json({ cart: null });
  }

  const cart = await cartRepo.findCart(token);
  if (!cart) {
    return NextResponse.json({ cart: null });
  }

  const totals = await computeTotals(cart);
  return NextResponse.json({ cart: serializeCart(cart, totals) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = cartActionSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid request.");
  }

  const action = parsed.data;

  let token = await getCartToken();
  let cart = token ? await cartRepo.findCart(token) : null;

  if (!cart && action.action !== "add") {
    return err("No active cart.");
  }

  if (!cart) {
    cart = await cartRepo.createCart();
    await setCartToken(cart.id);
    token = cart.id;
  }

  switch (action.action) {
    case "add":
      cart = await cartRepo.addItem(cart!.id, action.variantId, action.qty);
      break;
    case "setQty":
      cart = await cartRepo.setItemQty(cart!.id, action.variantId, action.qty);
      break;
    case "remove":
      cart = await cartRepo.removeItem(cart!.id, action.variantId);
      break;
    case "clear":
      cart = await cartRepo.clearCart(cart!.id);
      break;
    case "applyCoupon": {
      const subtotal = cart!.items.reduce((s, ci) => s + ci.variant.pricePaise * ci.qty, 0);
      const result = await validateCoupon(action.code, subtotal);
      if (!result.valid) {
        return err(result.reason);
      }
      cart = await cartRepo.setCoupon(cart!.id, result.couponId);
      break;
    }
    case "removeCoupon":
      cart = await cartRepo.setCoupon(cart!.id, null);
      break;
  }

  if (!cart) {
    return err("Cart not found.", 500);
  }

  const totals = await computeTotals(cart);
  return NextResponse.json({ cart: serializeCart(cart, totals) });
}
