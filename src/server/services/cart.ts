import type { CartWithDetails } from "@/server/repositories/cart";
import { getSettings } from "@/server/services/settings";
import { validateCoupon, type CouponResult } from "@/server/services/coupon";

export type CartTotals = {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  codFeePaise: number;
  totalPaise: number;
  freeShipThresholdPaise: number | null;
  coupon: CouponResult | null;
};

export type SerializedCartItem = {
  variantId: number;
  productSlug: string;
  productName: string;
  variantLabel: string;
  pricePaise: number;
  stock: number;
  image: string | null;
  qty: number;
  linePaise: number;
};

export type SerializedCart = {
  id: string;
  items: SerializedCartItem[];
  totals: CartTotals;
};

export function serializeCart(cart: CartWithDetails, totals: CartTotals): SerializedCart {
  return {
    id: cart.id,
    items: cart.items.map((ci) => ({
      variantId: ci.variantId,
      productSlug: ci.variant.product.slug,
      productName: ci.variant.product.name,
      variantLabel: ci.variant.label,
      pricePaise: ci.variant.pricePaise,
      stock: ci.variant.stock,
      image: ci.variant.product.images[0]?.url ?? null,
      qty: ci.qty,
      linePaise: ci.variant.pricePaise * ci.qty,
    })),
    totals,
  };
}

export async function computeTotals(
  cart: CartWithDetails,
  paymentMethod: "RAZORPAY" | "COD" = "RAZORPAY",
): Promise<CartTotals> {
  const settings = await getSettings();

  const subtotalPaise = cart.items.reduce((sum, ci) => sum + ci.variant.pricePaise * ci.qty, 0);

  let coupon: CouponResult | null = null;
  let discountPaise = 0;
  let freeShipping = false;
  if (cart.coupon) {
    coupon = await validateCoupon(cart.coupon.code, subtotalPaise);
    if (coupon.valid) {
      discountPaise = coupon.discountPaise;
      freeShipping = coupon.freeShipping;
    }
  }

  const afterDiscount = subtotalPaise - discountPaise;
  const qualifiesForFreeShip =
    freeShipping || (settings.freeShipOverPaise != null && afterDiscount >= settings.freeShipOverPaise);
  const shippingPaise = subtotalPaise === 0 ? 0 : qualifiesForFreeShip ? 0 : settings.flatShippingPaise;

  const codFeePaise = paymentMethod === "COD" ? settings.codFeePaise : 0;

  const totalPaise = afterDiscount + shippingPaise + codFeePaise;

  return {
    subtotalPaise,
    discountPaise,
    shippingPaise,
    codFeePaise,
    totalPaise: Math.max(0, totalPaise),
    freeShipThresholdPaise: settings.freeShipOverPaise,
    coupon,
  };
}
