import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatPaise } from "@/lib/money";

export const revalidate = 60;

type StripItem = { key: string; text: string; link: string | null };

/** Build a short human label for a coupon when it has no admin description. */
function couponLabel(c: {
  code: string;
  description: string | null;
  type: string;
  percent: number | null;
  valuePaise: number | null;
  minOrderPaise: number;
}): string {
  if (c.description) return `${c.code} · ${c.description}`;

  let offer: string;
  if (c.type === "PERCENT") offer = `${c.percent ?? 0}% off`;
  else if (c.type === "FLAT") offer = `${formatPaise(c.valuePaise ?? 0)} off`;
  else offer = "Free shipping";

  const min = c.minOrderPaise > 0 ? ` on orders over ${formatPaise(c.minOrderPaise)}` : "";
  return `${c.code} · ${offer}${min}`;
}

export async function GET() {
  const now = new Date();

  const [messages, coupons] = await Promise.all([
    prisma.promoMessage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.coupon.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        description: true,
        type: true,
        percent: true,
        valuePaise: true,
        minOrderPaise: true,
        maxUses: true,
        usedCount: true,
      },
    }),
  ]);

  const items: StripItem[] = [];

  for (const m of messages) {
    items.push({ key: `m${m.id}`, text: m.text, link: m.link });
  }

  for (const c of coupons) {
    // Skip coupons that have hit their global usage cap.
    if (c.maxUses != null && c.usedCount >= c.maxUses) continue;
    items.push({ key: `c${c.id}`, text: couponLabel(c), link: null });
  }

  return NextResponse.json({ items });
}
