import { z } from "zod";

export const variantSchema = z.object({
  id: z.number().optional(),
  label: z.string().min(1, "Label required"),
  sku: z.string().min(1, "SKU required"),
  pricePaise: z.number().int().min(1, "Price must be > 0"),
  mrpPaise: z.number().int().nullable(),
  weightGrams: z.number().int().nullable(),
  stock: z.number().int().min(0),
  isActive: z.boolean(),
});

export const productSchema = z.object({
  name: z.string().min(1, "Name required"),
  tagline: z.string(),
  slug: z.string().min(1, "Slug required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  shortDescription: z.string(),
  description: z.string().min(1, "Description required"),
  categoryId: z.number().int().min(1, "Category required"),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  tags: z.array(z.string()),
  highlights: z.array(z.string()),
  benefits: z.array(z.string()),
  howToUse: z.string(),
  ingredients: z.string(),
  nutritionInfo: z.record(z.string(), z.string()).nullable(),
  shelfLife: z.string(),
  storage: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  metaKeywords: z.string(),
  variants: z.array(variantSchema).min(1, "At least one variant required"),
});

export type TProductForm = z.infer<typeof productSchema>;
export type TVariantForm = z.infer<typeof variantSchema>;
