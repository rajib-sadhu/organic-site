"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ProductForm } from "@/components/admin/ProductForm";
import type { TProductForm } from "@/schema/product";

type ServerProduct = {
  id: number; slug: string; name: string; tagline: string | null; shortDescription: string | null; description: string; categoryId: number;
  isActive: boolean; isFeatured: boolean;
  tags: string[] | null; highlights: string[] | null; benefits: string[] | null;
  howToUse: string | null; ingredients: string | null;
  nutritionInfo: Record<string, string> | null;
  shelfLife: string | null; storage: string | null;
  metaTitle: string | null; metaDescription: string | null; metaKeywords: string | null;
  variants: { id: number; label: string; sku: string; pricePaise: number; mrpPaise: number | null; weightGrams: number | null; stock: number; isActive: boolean }[];
  images: { id: number; url: string; alt: string | null; sortOrder: number; isThumbnail: boolean }[];
};

export default function EditProductPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [product, setProduct] = useState<ServerProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((j) => setProduct(j.product ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>;
  if (!product) return <p className="py-8 text-muted">Product not found.</p>;

  const defaults: TProductForm = {
    name: product.name,
    tagline: product.tagline ?? "",
    slug: product.slug,
    shortDescription: product.shortDescription ?? "",
    description: product.description,
    categoryId: product.categoryId,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    tags: Array.isArray(product.tags) ? product.tags : [],
    highlights: Array.isArray(product.highlights) ? product.highlights : [],
    benefits: Array.isArray(product.benefits) ? product.benefits : [],
    howToUse: product.howToUse ?? "",
    ingredients: product.ingredients ?? "",
    nutritionInfo: product.nutritionInfo ?? null,
    shelfLife: product.shelfLife ?? "",
    storage: product.storage ?? "",
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    metaKeywords: product.metaKeywords ?? "",
    variants: product.variants.map((v) => ({
      id: v.id,
      label: v.label,
      sku: v.sku,
      pricePaise: v.pricePaise,
      mrpPaise: v.mrpPaise ?? null,
      weightGrams: v.weightGrams ?? null,
      stock: v.stock,
      isActive: v.isActive,
    })),
  };

  return (
    <div className="space-y-4">
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest">
        <ArrowLeft className="h-4 w-4" /> Back to products
      </Link>
      <h1 className="text-2xl font-semibold text-ink">Edit: {product.name}</h1>
      <ProductForm mode="edit" productId={product.id} defaultValues={defaults} initialImages={product.images} />
    </div>
  );
}
