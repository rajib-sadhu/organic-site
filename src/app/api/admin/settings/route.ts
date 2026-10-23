import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requirePermission, hasPermission, type AdminSession } from "@/server/lib/admin-auth";

// "orders@shop.in" or "Shop Name <orders@shop.in>" (the seed copies EMAIL_FROM, which uses the second form).
const emailOrMailbox = z.string().trim().max(191).refine(
  (v) => z.email().safeParse(/<([^<>]+)>\s*$/.exec(v)?.[1] ?? v).success,
  "Enter an email address, e.g. orders@example.com or Shop Name <orders@example.com>",
);

// Only these fields are writable; anything else in the body is ignored.
const settingsUpdateSchema = z
  .object({
    storeName: z.string().trim().min(1).max(191),
    storeEmail: emailOrMailbox.nullable(),
    flatShippingPaise: z.number().int().min(0),
    freeShipOverPaise: z.number().int().min(0).nullable(),
    codFeePaise: z.number().int().min(0),
    codOtpRequired: z.boolean(),
    gstEnabled: z.boolean(),
    announcementText: z.string().trim().max(191).nullable(),
    announcementHref: z.string().trim().max(191).nullable(),
    featureCardGrid: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    abandonedCartOn: z.boolean(),
    abandonedCartCouponId: z.number().int().positive().nullable(),
    customerAccounts: z.enum(["OFF", "OPTIONAL", "REQUIRED"]),
    passwordLogin: z.enum(["OFF", "OPTIONAL", "REQUIRED"]),
  })
  .partial();

export async function GET() {
  try {
    await requirePermission("settings.manage");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let settings = await prisma.setting.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await prisma.setting.create({ data: { id: 1 } });
  }

  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  let session: AdminSession;
  try {
    session = await requirePermission("settings.manage");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = settingsUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: `${issue?.path.join(".") || "body"}: ${issue?.message ?? "Invalid"}` }, { status: 400 });
  }
  const data = parsed.data;

  const current = await prisma.setting.findUnique({ where: { id: 1 }, select: { codOtpRequired: true } });
  if (
    data.codOtpRequired !== undefined &&
    data.codOtpRequired !== (current?.codOtpRequired ?? false) &&
    !hasPermission(session, "otp.toggle")
  ) {
    return NextResponse.json({ error: "You don't have permission to change COD OTP." }, { status: 403 });
  }

  if (data.abandonedCartCouponId != null) {
    const coupon = await prisma.coupon.findUnique({ where: { id: data.abandonedCartCouponId }, select: { id: true } });
    if (!coupon) return NextResponse.json({ error: "Selected coupon no longer exists." }, { status: 400 });
  }

  const settings = await prisma.setting.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });

  return NextResponse.json({ settings });
}
