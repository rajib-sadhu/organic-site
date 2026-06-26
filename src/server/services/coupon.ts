import { prisma } from "@/lib/prisma";
import type { CouponType } from "@/generated/prisma/client";

export type CouponResult =
  | { valid: true; couponId: number; code: string; type: CouponType; discountPaise: number; freeShipping: boolean; label: string }
  | { valid: false; reason: string };

export async function validateCoupon(code: string, subtotalPaise: number, email?: string): Promise<CouponResult> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

  if (!coupon || !coupon.isActive) {
    return { valid: false, reason: "Invalid coupon code." };
  }

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) {
    return { valid: false, reason: "This coupon is not yet active." };
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    return { valid: false, reason: "This coupon has expired." };
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, reason: "This coupon has reached its usage limit." };
  }
  if (subtotalPaise < coupon.minOrderPaise) {
    const min = (coupon.minOrderPaise / 100).toFixed(0);
    return { valid: false, reason: `Minimum order ₹${min} required for this coupon.` };
  }

  if (email && coupon.perEmailLimit != null) {
    const usedByEmail = await prisma.order.count({ where: { email, couponCode: coupon.code } });
    if (usedByEmail >= coupon.perEmailLimit) {
      return { valid: false, reason: "You have already used this coupon." };
    }
  }

  let discountPaise = 0;
  let freeShipping = false;
  let label = "";

  switch (coupon.type) {
    case "PERCENT":
      discountPaise = Math.round((subtotalPaise * (coupon.percent ?? 0)) / 100);
      label = `${coupon.percent}% off`;
      break;
    case "FLAT":
      discountPaise = Math.min(coupon.valuePaise ?? 0, subtotalPaise);
      label = `₹${((coupon.valuePaise ?? 0) / 100).toFixed(0)} off`;
      break;
    case "FREE_SHIP":
      freeShipping = true;
      label = "Free shipping";
      break;
  }

  return { valid: true, couponId: coupon.id, code: coupon.code, type: coupon.type, discountPaise, freeShipping, label };
}
