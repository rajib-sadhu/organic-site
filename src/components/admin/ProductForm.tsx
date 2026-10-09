"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Star, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { productSchema, type TProductForm } from "@/schema/product";
import { formatPaise } from "@/lib/money";
import { AVAILABLE_TAGS } from "@/components/product/ProductBadges";
import { InfoTip } from "./InfoTip";

type Category = { id: number; name: string; slug: string };
type ImageRecord = { id: number; url: string; alt: string | null; sortOrder: number; isThumbnail: boolean };

type Props = {
  mode: "create" | "edit";
  productId?: number;
  defaultValues?: TProductForm;
  initialImages?: ImageRecord[];
};

const EMPTY_DEFAULTS: TProductForm = {
  name: "", tagline: "", slug: "", shortDescription: "", description: "", categoryId: 0,
  isActive: true, isFeatured: false,
  tags: [], highlights: [], benefits: [],
  howToUse: "", ingredients: "", nutritionInfo: null, shelfLife: "", storage: "",
  metaTitle: "", metaDescription: "", metaKeywords: "",
  variants: [{ label: "", sku: "", pricePaise: 0, mrpPaise: null, weightGrams: null, stock: 0, isActive: true }],
};

export function ProductForm({ mode, productId, defaultValues, initialImages = [] }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<ImageRecord[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [highlightInput, setHighlightInput] = useState("");
  const [benefitInput, setBenefitInput] = useState("");
  const [nutritionKey, setNutritionKey] = useState("");
  const [nutritionVal, setNutritionVal] = useState("");

  const {
    register, handleSubmit, control, setValue, getValues,
    formState: { errors },
  } = useForm<TProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues ?? EMPTY_DEFAULTS,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });
  const variantValues = useWatch({ control, name: "variants" });

  useEffect(() => {
    fetch("/api/admin/categories").then((r) => r.json()).then((j) => setCategories(j.categories ?? []));
  }, []);

  const name = useWatch({ control, name: "name" });
  useEffect(() => {
    if (mode === "create" && name) {
      const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      setValue("slug", slug, { shouldValidate: true });
    }
  }, [name, mode, setValue]);

  const onSubmit = async (data: TProductForm) => {
    setSaving(true);
    try {
      const url = mode === "edit" ? `/api/admin/products/${productId}` : "/api/admin/products";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Save failed."); return; }
      toast.success(mode === "edit" ? "Product updated." : "Product created.");
      if (mode === "create") router.push(`/admin/products/${json.product.id}`);
    } finally { setSaving(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!productId || !e.target.files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(e.target.files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("productId", String(productId));
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (res.ok) { const json = await res.json(); setImages((prev) => [...prev, json.image]); }
        else { const json = await res.json(); toast.error(json.error ?? "Upload failed."); }
      }
    } finally { setUploading(false); e.target.value = ""; }
  };

  const deleteImage = async (img: ImageRecord) => {
    const res = await fetch(`/api/admin/images/${img.id}`, { method: "DELETE" });
    if (res.ok) { setImages((prev) => prev.filter((i) => i.id !== img.id)); toast.success("Image removed."); }
  };

  const setThumbnail = async (imageId: number) => {
    const res = await fetch(`/api/admin/images/${imageId}/thumbnail`, { method: "PUT" });
    if (res.ok) {
      setImages((prev) => prev.map((i) => ({ ...i, isThumbnail: i.id === imageId })));
      toast.success("Thumbnail set.");
    }
  };

  const tags = useWatch({ control, name: "tags" });
  const toggleTag = (tag: string) => {
    const current = getValues("tags");
    setValue("tags", current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]);
  };

  const highlights = useWatch({ control, name: "highlights" });
  const addHighlight = () => {
    if (highlightInput.trim()) {
      setValue("highlights", [...getValues("highlights"), highlightInput.trim()]);
      setHighlightInput("");
    }
  };

  const benefits = useWatch({ control, name: "benefits" });
  const addBenefit = () => {
    if (benefitInput.trim()) {
      setValue("benefits", [...getValues("benefits"), benefitInput.trim()]);
      setBenefitInput("");
    }
  };

  const nutritionInfo = useWatch({ control, name: "nutritionInfo" });
  const addNutrition = () => {
    if (nutritionKey.trim() && nutritionVal.trim()) {
      setValue("nutritionInfo", { ...(getValues("nutritionInfo") ?? {}), [nutritionKey.trim()]: nutritionVal.trim() });
      setNutritionKey(""); setNutritionVal("");
    }
  };
  const removeNutrition = (key: string) => {
    const current = { ...(getValues("nutritionInfo") ?? {}) };
    delete current[key];
    setValue("nutritionInfo", Object.keys(current).length ? current : null);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Basic info */}
          <div className="rounded-xl border border-line bg-paper p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink">Basic info</h2>
            <Field label="Name" tip="Product name displayed on the store and in search results" error={errors.name?.message}>
              <input {...register("name")} className="input" placeholder="Organic Turmeric Powder" />
            </Field>
            <Field label="Tagline" tip="Short one-liner shown below the product name on the detail page" error={errors.tagline?.message}>
              <input {...register("tagline")} className="input" placeholder="Pure stone-ground from heritage wheat" />
            </Field>
            <Field label="Slug" tip="URL-friendly identifier, auto-generated from name. e.g. /products/organic-turmeric-powder" error={errors.slug?.message}>
              <input {...register("slug")} className="input" placeholder="organic-turmeric-powder" />
            </Field>
            <Field label="Short description" tip="Brief summary shown on product listing cards">
              <textarea {...register("shortDescription")} rows={2} className="input" placeholder="Brief summary shown on listing pages" />
            </Field>
            <Field label="Full description" tip="Detailed HTML description shown on the product detail page" error={errors.description?.message}>
              <textarea {...register("description")} rows={4} className="input" />
            </Field>
            <Field label="Category" tip="Product category for filtering and navigation" error={errors.categoryId?.message}>
              <select {...register("categoryId", { valueAsNumber: true })} className="input">
                <option value={0}>Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-line bg-paper p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink">Tags & badges</h2>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    tags.includes(tag) ? "bg-forest text-cream" : "bg-sand text-muted hover:bg-line"
                  }`}
                >
                  {tag.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Highlights */}
          <div className="rounded-xl border border-line bg-paper p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink">Highlights</h2>
            <p className="text-xs text-muted">Short taglines like &quot;Low GI&quot;, &quot;Certified Glyphosate-Free&quot;</p>
            <div className="flex flex-wrap gap-1.5">
              {highlights.map((h, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-leaf-soft px-2.5 py-0.5 text-xs text-forest">
                  {h}
                  <button type="button" onClick={() => setValue("highlights", highlights.filter((_, idx) => idx !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={highlightInput} onChange={(e) => setHighlightInput(e.target.value)} className="input flex-1" placeholder="Add highlight" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHighlight(); } }} />
              <button type="button" onClick={addHighlight} className="rounded-lg bg-sand px-3 text-sm text-ink hover:bg-line">Add</button>
            </div>
          </div>

          {/* Benefits */}
          <div className="rounded-xl border border-line bg-paper p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink">Benefits</h2>
            <div className="space-y-1">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-forest" />
                  <span className="flex-1 text-muted">{b}</span>
                  <button type="button" onClick={() => setValue("benefits", benefits.filter((_, idx) => idx !== i))} className="text-clay"><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={benefitInput} onChange={(e) => setBenefitInput(e.target.value)} className="input flex-1" placeholder="Add benefit" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBenefit(); } }} />
              <button type="button" onClick={addBenefit} className="rounded-lg bg-sand px-3 text-sm text-ink hover:bg-line">Add</button>
            </div>
          </div>

          {/* Details */}
          <div className="rounded-xl border border-line bg-paper p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink">Product details</h2>
            <Field label="Ingredients" tip="List of ingredients, shown on the product page"><textarea {...register("ingredients")} rows={2} className="input" placeholder="100% organic emmer wheat" /></Field>
            <Field label="How to use" tip="Usage instructions or serving suggestions"><textarea {...register("howToUse")} rows={2} className="input" placeholder="Use like regular wheat flour..." /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Shelf life" tip="Product shelf life, e.g. '6 months from packaging'"><input {...register("shelfLife")} className="input" placeholder="6 months" /></Field>
              <Field label="Storage" tip="Storage instructions, e.g. 'Store in a cool, dry place'"><input {...register("storage")} className="input" placeholder="Cool, dry place" /></Field>
            </div>
          </div>

          {/* Nutrition table */}
          <div className="rounded-xl border border-line bg-paper p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink">Nutritional information</h2>
            {nutritionInfo && Object.entries(nutritionInfo).length > 0 && (
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(nutritionInfo).map(([key, value]) => (
                    <tr key={key} className="border-b border-line last:border-0">
                      <td className="py-1.5 text-muted">{key}</td>
                      <td className="py-1.5 text-right font-medium">{value}</td>
                      <td className="py-1.5 pl-2 text-right">
                        <button type="button" onClick={() => removeNutrition(key)} className="text-clay"><X className="h-3 w-3" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex gap-2">
              <input value={nutritionKey} onChange={(e) => setNutritionKey(e.target.value)} className="input flex-1" placeholder="Nutrient (e.g. Protein)" />
              <input value={nutritionVal} onChange={(e) => setNutritionVal(e.target.value)} className="input flex-1" placeholder="Value (e.g. 12g)" />
              <button type="button" onClick={addNutrition} className="rounded-lg bg-sand px-3 text-sm text-ink hover:bg-line">Add</button>
            </div>
          </div>

          {/* Variants */}
          <div className="rounded-xl border border-line bg-paper p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Variants</h2>
              <button type="button" onClick={() => append({ label: "", sku: "", pricePaise: 0, mrpPaise: null, weightGrams: null, stock: 0, isActive: true })} className="inline-flex items-center gap-1 text-xs font-medium text-forest hover:text-forest-dark">
                <Plus className="h-3.5 w-3.5" /> Add variant
              </button>
            </div>
            {errors.variants?.root?.message && <p className="text-xs text-clay">{errors.variants.root.message}</p>}
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div key={field.id} className="rounded-lg border border-line bg-cream/30 p-3 space-y-2">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="flex-1 min-w-[100px]">
                      <label className="text-xs text-muted">Label</label>
                      <input {...register(`variants.${idx}.label`)} className="input text-sm" placeholder="10 kg" />
                    </div>
                    <div className="flex-1 min-w-[100px]">
                      <label className="text-xs text-muted">SKU</label>
                      <input {...register(`variants.${idx}.sku`)} className="input text-sm" placeholder="KWA-10" />
                    </div>
                    <div className="w-28">
                      <label className="text-xs text-muted">Sale price (paise)</label>
                      <input type="number" {...register(`variants.${idx}.pricePaise`, { valueAsNumber: true })} className="input text-sm" />
                      {variantValues?.[idx]?.pricePaise > 0 && <span className="text-xs text-muted">{formatPaise(Number(variantValues[idx].pricePaise))}</span>}
                    </div>
                    <div className="w-28">
                      <label className="text-xs text-muted">MRP (paise)</label>
                      <input type="number" {...register(`variants.${idx}.mrpPaise`, { setValueAs: (v: string) => v === "" ? null : Number(v) })} className="input text-sm" placeholder="Optional" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="w-28">
                      <label className="text-xs text-muted">Weight (grams)</label>
                      <input type="number" {...register(`variants.${idx}.weightGrams`, { setValueAs: (v: string) => v === "" ? null : Number(v) })} className="input text-sm" placeholder="10000" />
                    </div>
                    <div className="w-20">
                      <label className="text-xs text-muted">Stock</label>
                      <input type="number" {...register(`variants.${idx}.stock`, { valueAsNumber: true })} className="input text-sm" />
                    </div>
                    <div className="flex items-end gap-2 pb-1">
                      <label className="flex items-center gap-1.5 text-xs text-muted">
                        <input type="checkbox" {...register(`variants.${idx}.isActive`)} className="accent-forest" /> Active
                      </label>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(idx)} className="text-muted hover:text-clay"><Trash2 className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SEO */}
          <div className="rounded-xl border border-line bg-paper p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink">SEO</h2>
            <Field label="Meta title" tip="Custom page title for search engines. Falls back to product name if blank"><input {...register("metaTitle")} className="input" /></Field>
            <Field label="Meta description" tip="Description shown in Google search results. Keep under 160 characters"><textarea {...register("metaDescription")} rows={2} className="input" /></Field>
            <Field label="Meta keywords" tip="Comma-separated keywords for SEO"><input {...register("metaKeywords")} className="input" placeholder="organic, wheat, atta, flour" /></Field>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-paper p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink">Status</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("isActive")} className="accent-forest" /> Active (visible on store)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("isFeatured")} className="accent-forest" /> Featured
            </label>
          </div>

          <div className="rounded-xl border border-line bg-paper p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink">Images</h2>
            {mode === "create" && <p className="text-xs text-muted">Save the product first, then upload images.</p>}
            {mode === "edit" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {images.map((img) => (
                    <div key={img.id} className="group relative">
                      <img src={img.url} alt={img.alt ?? ""} className={`h-24 w-full rounded-lg object-cover ${img.isThumbnail ? "ring-2 ring-honey" : ""}`} />
                      <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button type="button" onClick={() => setThumbnail(img.id)} title="Set as thumbnail" className={`grid h-5 w-5 place-items-center rounded-full ${img.isThumbnail ? "bg-honey text-cream" : "bg-paper/90 text-muted hover:text-honey"}`}>
                          <Star className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => deleteImage(img)} className="grid h-5 w-5 place-items-center rounded-full bg-paper/90 text-clay">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {img.isThumbnail && <span className="absolute bottom-1 left-1 rounded bg-honey/90 px-1 py-0.5 text-[9px] font-bold text-cream">THUMB</span>}
                    </div>
                  ))}
                </div>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line py-3 text-xs text-muted hover:border-forest hover:text-forest">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Uploading..." : "Upload images"}
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="sr-only" />
                </label>
              </>
            )}
          </div>

          <button type="submit" disabled={saving} className="w-full rounded-lg bg-forest py-2.5 text-sm font-medium text-cream hover:bg-forest-dark disabled:opacity-60">
            {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : mode === "edit" ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, tip, error, children }: { label: string; tip?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">
        {label}
        {tip && <InfoTip text={tip} />}
      </label>
      {children}
      {error && <p className="mt-0.5 text-xs text-clay">{error}</p>}
    </div>
  );
}
