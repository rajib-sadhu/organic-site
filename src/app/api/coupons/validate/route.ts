import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCoupon } from "@/server/services/coupon";

const schema = z.object({
  code: z.string().min(1).max(50),
  subtotalPaise: z.number().int().min(0),
  email: z.string().email().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const result = await validateCoupon(parsed.data.code, parsed.data.subtotalPaise, parsed.data.email);
  return NextResponse.json(result);
}
