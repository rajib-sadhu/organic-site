import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const subscribeSchema = z.object({
  email: z.string().email("Invalid email"),
  source: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  const { email, source } = parsed.data;

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (existing) {
    if (existing.unsubAt) {
      await prisma.newsletterSubscriber.update({
        where: { email },
        data: { unsubAt: null, source: source ?? existing.source },
      });
      return NextResponse.json({ message: "Welcome back! You've been re-subscribed." });
    }
    return NextResponse.json({ message: "You're already subscribed!" });
  }

  await prisma.newsletterSubscriber.create({
    data: { email, source: source ?? "footer" },
  });

  return NextResponse.json({ message: "Thanks for subscribing!" }, { status: 201 });
}
