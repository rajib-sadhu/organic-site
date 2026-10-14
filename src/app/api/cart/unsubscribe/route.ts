import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findCartByRecoveryToken } from "@/server/repositories/cart";
import { CART_REMINDER_SCOPE } from "@/server/services/abandoned-cart";

const bodySchema = z.object({ token: z.string().min(1).max(100) });

// Stop cart reminders for the email behind a reminder link.
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid link." }, { status: 400 });

  const cart = await findCartByRecoveryToken(parsed.data.token);
  if (!cart?.email) return NextResponse.json({ error: "This link is no longer valid." }, { status: 404 });

  await prisma.emailOptOut.upsert({
    where: { email_scope: { email: cart.email, scope: CART_REMINDER_SCOPE } },
    create: { email: cart.email, scope: CART_REMINDER_SCOPE },
    update: {},
  });
  return NextResponse.json({ success: true });
}
