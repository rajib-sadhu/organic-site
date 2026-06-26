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

export const cartActionSchema = z.discriminatedUnion("action", [
  addToCartSchema,
  setQtySchema,
  removeItemSchema,
  clearCartSchema,
  applyCouponSchema,
  removeCouponSchema,
]);

export type CartAction = z.infer<typeof cartActionSchema>;
