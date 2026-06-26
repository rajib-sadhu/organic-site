import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatPaise } from "@/lib/money";

export const revalidate = 60;

type PublicCoupon = {
  code: string;
  description: string | null;
  label: string;
  minOrderPaise: number;
};

/** Short offer label, e.g. "20% off" / "₹100.00 off" / "Free shipping". */
function offerLabel(c: {
  type: string;
  percent: number | null;
  valuePaise: number | null;
}): string {
  if (c.type === "PERCENT") return `${c.percent ?? 0}% off`;
  if (c.type === "FLAT") return `${formatPaise(c.valuePaise ?? 0)} off`;
  return "Free shipping";
}

export async function GET() {
  const now = new Date();

  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      code: true,
      description: true,
      type: true,
      percent: true,
      valuePaise: true,
      minOrderPaise: true,
      maxUses: true,
      usedCount: true,
    },
  });

  const items: PublicCoupon[] = coupons
    .filter((c) => c.maxUses == null || c.usedCount < c.maxUses)
    .map((c) => ({
      code: c.code,
      description: c.description,
      label: offerLabel(c),
      minOrderPaise: c.minOrderPaise,
    }));

  return NextResponse.json({ coupons: items });
}
