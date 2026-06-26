"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Pencil, Trash2, Upload, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { InfoTip } from "@/components/admin/InfoTip";

type Banner = {
  id: number;
  title: string | null;
  subtitle: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  image: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type BannerForm = {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  image: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm: BannerForm = {
  title: "",
  subtitle: "",
  ctaText: "",
  ctaLink: "",
  image: "",
  sortOrder: 0,
  isActive: true,
};

function bannerToForm(b: Banner): BannerForm {
  return {
    title: b.title ?? "",
    subtitle: b.subtitle ?? "",
    ctaText: b.ctaText ?? "",
    ctaLink: b.ctaLink ?? "",
    image: b.image,
    sortOrder: b.sortOrder,
    isActive: b.isActive,
  };
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // null = closed, 0 = new, >0 = editing that id
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyForm);

  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/banners");
      const json = await res.json();
      setBanners(json.banners ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    const maxSort = banners.length > 0 ? Math.max(...banners.map((b) => b.sortOrder)) : -1;
    setForm({ ...emptyForm, sortOrder: maxSort + 1 });
    setEditingId(0);
  };

  const openEdit = (banner: Banner) => {
    setForm(bannerToForm(banner));
    setEditingId(banner.id);
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/banners/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        toast.error(err.error ?? "Upload failed");
        return;
      }
      const json = await res.json();
      setForm((f) => ({ ...f, image: json.url }));
      toast.success("Image uploaded.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.image.trim()) {
      toast.error("Image is required.");
      return;
    }

    setSaving(true);
    try {
      const isNew = editingId === 0;
      const url = isNew ? "/api/admin/banners" : `/api/admin/banners/${editingId}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title || null,
          subtitle: form.subtitle || null,
          ctaText: form.ctaText || null,
          ctaLink: form.ctaLink || null,
          image: form.image,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        }),
      });

      if (res.ok) {
        toast.success(isNew ? "Banner created." : "Banner updated.");
        closeForm();
        load();
      } else {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        toast.error(err.error ?? "Save failed.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this banner?")) return;
    const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Banner deleted.");
      if (editingId === id) closeForm();
      load();
    } else {
      toast.error("Delete failed.");
    }
  };

  const set = <K extends keyof BannerForm>(key: K, value: BannerForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Banners</h1>
        {editingId === null && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream hover:bg-forest-dark"
          >
            <Plus className="h-4 w-4" /> Add banner
          </button>
        )}
      </div>

      {/* Inline form */}
      {editingId !== null && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-paper p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              {editingId === 0 ? "New banner" : "Edit banner"}
            </h2>
            <button type="button" onClick={closeForm} className="text-muted hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" tip="Main headline shown on the banner overlay">
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="input"
                placeholder="Optional headline"
              />
            </Field>
            <Field label="Subtitle" tip="Supporting text below the title">
              <input
                value={form.subtitle}
                onChange={(e) => set("subtitle", e.target.value)}
                className="input"
                placeholder="Optional subtitle"
              />
            </Field>
            <Field label="CTA text" tip="Call-to-action button label, e.g. 'Shop Now', 'View Collection'">
              <input
                value={form.ctaText}
                onChange={(e) => set("ctaText", e.target.value)}
                className="input"
                placeholder="e.g. Shop Now"
              />
            </Field>
            <Field label="CTA link" tip="URL the button links to, e.g. /products or /products?category=oils">
              <input
                value={form.ctaLink}
                onChange={(e) => set("ctaLink", e.target.value)}
                className="input"
                placeholder="e.g. /products"
              />
            </Field>
          </div>

          {/* Image field: URL or upload */}
          <Field label="Image *" tip="Banner image displayed on the home page carousel. Use a wide image (recommended 1920x640).">
            <div className="space-y-2">
              <input
                value={form.image}
                onChange={(e) => set("image", e.target.value)}
                className="input"
                placeholder="Paste image URL or upload below"
              />
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-sand hover:text-ink">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Uploading..." : "Upload file"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
              </div>
              {form.image && (
                <div className="mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.image}
                    alt="Preview"
                    className="h-32 rounded-lg border border-line object-cover"
                  />
                </div>
              )}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sort order" tip="Lower numbers appear first in the carousel">
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Status">
              <label className="flex items-center gap-2 pt-1 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => set("isActive", e.target.checked)}
                  className="accent-forest"
                />
                Active
              </label>
            </Field>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream hover:bg-forest-dark disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId === 0 ? "Create banner" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-sand hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Banner list */}
      {banners.length === 0 && editingId === null ? (
        <div className="rounded-xl border border-line bg-paper px-6 py-12 text-center">
          <p className="text-muted">No banners yet. Add your first banner to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((b) => (
            <div
              key={b.id}
              className="group relative overflow-hidden rounded-xl border border-line bg-paper"
            >
              {/* Image */}
              <div className="relative aspect-[16/7] bg-sand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.image}
                  alt={b.title ?? "Banner"}
                  className="h-full w-full object-cover"
                />
                {/* Status badge */}
                <span
                  className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                    b.isActive ? "bg-leaf-soft text-forest" : "bg-sand text-muted"
                  }`}
                >
                  {b.isActive ? "Active" : "Inactive"}
                </span>
                {/* Sort order badge */}
                <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-paper/80 px-2 py-0.5 text-xs font-medium text-muted backdrop-blur-sm">
                  <GripVertical className="h-3 w-3" />
                  {b.sortOrder}
                </span>
              </div>

              {/* Info */}
              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-medium text-ink">
                  {b.title || <span className="text-muted italic">No title</span>}
                </p>
                {b.subtitle && (
                  <p className="truncate text-xs text-muted">{b.subtitle}</p>
                )}
                {b.ctaText && (
                  <p className="text-xs text-forest">
                    {b.ctaText}
                    {b.ctaLink && (
                      <span className="text-muted"> &rarr; {b.ctaLink}</span>
                    )}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1 border-t border-line px-3 py-2">
                <button
                  type="button"
                  onClick={() => openEdit(b)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sand hover:text-ink"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-clay/10 hover:text-clay"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium text-ink">
        {label}
        {tip && <InfoTip text={tip} />}
      </span>
      {children}
    </label>
  );
}
