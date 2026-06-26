import { z } from "zod";

export const couponSchema = z.object({
  code: z.string().min(1, "Code required"),
  description: z.string(),
  type: z.enum(["PERCENT", "FLAT", "FREE_SHIP"]),
  valuePaise: z.number().int().nullable(),
  percent: z.number().int().min(0).max(100).nullable(),
  minOrderPaise: z.number().int().min(0),
  maxUses: z.number().int().nullable(),
  perEmailLimit: z.number().int().nullable(),
  startsAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  isActive: z.boolean(),
});

export type TCouponForm = z.infer<typeof couponSchema>;
