import { z } from "zod";

export const addToCartSchema = z.object({
  action: z.literal("add"),
  variantId: z.number().int().positive(),
  qty: z.number().int().min(1).max(50).default(1),
});

export const setQtySchema = z.object({
  action: z.literal("setQty"),
  variantId: z.number().int().positive(),
  qty: z.number().int().min(0).max(50),
});

export const removeItemSchema = z.object({
  action: z.literal("remove"),
  variantId: z.number().int().positive(),
});

export const clearCartSchema = z.object({
  action: z.literal("clear"),
});

export const applyCouponSchema = z.object({
  action: z.literal("applyCoupon"),
  code: z.string().min(1).max(50).transform((v) => v.toUpperCase().trim()),
});

export const removeCouponSchema = z.object({
  action: z.literal("removeCoupon"),
});

// Captured at checkout as soon as the shopper enters it (abandoned-cart reminders).
export const setEmailSchema = z.object({
  action: z.literal("setEmail"),
  email: z.string().trim().toLowerCase().email().max(191),
});

export const cartActionSchema = z.discriminatedUnion("action", [
  addToCartSchema,
  setQtySchema,
  removeItemSchema,
  clearCartSchema,
  applyCouponSchema,
  removeCouponSchema,
  setEmailSchema,
]);

export type CartAction = z.infer<typeof cartActionSchema>;
