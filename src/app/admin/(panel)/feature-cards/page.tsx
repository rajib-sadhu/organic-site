"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Pencil, Trash2, Upload, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { InfoTip } from "@/components/admin/InfoTip";

type FeatureCard = {
  id: number;
  title: string;
  subtitle: string | null;
  image: string;
  link: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CardForm = {
  title: string;
  subtitle: string;
  image: string;
  link: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm: CardForm = {
  title: "",
  subtitle: "",
  image: "",
  link: "",
  sortOrder: 0,
  isActive: true,
};

function cardToForm(c: FeatureCard): CardForm {
  return {
    title: c.title,
    subtitle: c.subtitle ?? "",
    image: c.image,
    link: c.link ?? "",
    sortOrder: c.sortOrder,
    isActive: c.isActive,
  };
}

export default function AdminFeatureCardsPage() {
  const [cards, setCards] = useState<FeatureCard[]>([]);
  const [grid, setGrid] = useState(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGrid, setSavingGrid] = useState(false);

  // null = closed, 0 = new, >0 = editing that id
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CardForm>(emptyForm);

  const [uploading, setUploading] = useState(false);

  // isStale lets the effect drop a response superseded by a newer query or unmount.
  const load = useCallback((isStale: () => boolean = () => false) =>
    Promise.all([fetch("/api/admin/feature-cards"), fetch("/api/admin/settings")])
      .then(async ([cardsRes, settingsRes]) => {
        if (!cardsRes.ok || !settingsRes.ok) throw new Error("Failed to load feature cards.");
        return [await cardsRes.json(), await settingsRes.json()] as const;
      })
      .then(([cardsJson, settingsJson]) => {
        if (isStale()) return;
        setCards(cardsJson.cards ?? []);
        setGrid(settingsJson.settings?.featureCardGrid ?? 3);
      })
      .catch(() => {
        if (!isStale()) toast.error("Failed to load feature cards.");
      })
      .finally(() => {
        if (!isStale()) setLoading(false);
      }), []);

  useEffect(() => {
    let stale = false;
    load(() => stale);
    return () => { stale = true; };
  }, [load]);

  const saveGrid = async (cols: number) => {
    setGrid(cols);
    setSavingGrid(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureCardGrid: cols }),
      });
      if (res.ok) toast.success(`Grid set to ${cols} columns.`);
      else toast.error("Could not save grid.");
    } finally {
      setSavingGrid(false);
    }
  };

  const openNew = () => {
    const maxSort = cards.length > 0 ? Math.max(...cards.map((c) => c.sortOrder)) : -1;
    setForm({ ...emptyForm, sortOrder: maxSort + 1 });
    setEditingId(0);
  };

  const openEdit = (card: FeatureCard) => {
    setForm(cardToForm(card));
    setEditingId(card.id);
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
      const res = await fetch("/api/admin/feature-cards/upload", { method: "POST", body: fd });
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
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!form.image.trim()) {
      toast.error("Image is required.");
      return;
    }

    setSaving(true);
    try {
      const isNew = editingId === 0;
      const url = isNew ? "/api/admin/feature-cards" : `/api/admin/feature-cards/${editingId}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          subtitle: form.subtitle || null,
          image: form.image,
          link: form.link || null,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        }),
      });

      if (res.ok) {
        toast.success(isNew ? "Card created." : "Card updated.");
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
    if (!confirm("Delete this feature card?")) return;
    const res = await fetch(`/api/admin/feature-cards/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Card deleted.");
      if (editingId === id) closeForm();
      load();
    } else {
      toast.error("Delete failed.");
    }
  };

  const set = <K extends keyof CardForm>(key: K, value: CardForm[K]) =>
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
        <h1 className="text-2xl font-semibold text-ink">Feature cards</h1>
        {editingId === null && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream hover:bg-forest-dark"
          >
            <Plus className="h-4 w-4" /> Add card
          </button>
        )}
      </div>

      {/* Grid columns setting */}
      <div className="flex items-center gap-3 rounded-xl border border-line bg-paper px-5 py-4">
        <span className="text-sm font-medium text-ink">
          Grid columns
          <InfoTip text="How many cards show per row on desktop. On mobile they always stack to a single column." />
        </span>
        <div className="flex gap-1.5">
          {[2, 3, 4].map((cols) => (
            <button
              key={cols}
              type="button"
              disabled={savingGrid}
              onClick={() => saveGrid(cols)}
              className={`grid h-8 w-10 place-items-center rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                grid === cols ? "bg-forest text-cream" : "bg-sand text-muted hover:bg-line"
              }`}
            >
              {cols}
            </button>
          ))}
        </div>
        {savingGrid && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
      </div>

      {/* Inline form */}
      {editingId !== null && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-paper p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              {editingId === 0 ? "New card" : "Edit card"}
            </h2>
            <button type="button" onClick={closeForm} className="text-muted hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title *" tip="Headline shown over the card image">
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="input"
                placeholder="e.g. Cold-Pressed Oils"
              />
            </Field>
            <Field label="Subtitle" tip="Optional supporting text shown below the title">
              <input
                value={form.subtitle}
                onChange={(e) => set("subtitle", e.target.value)}
                className="input"
                placeholder="e.g. Pure & unrefined"
              />
            </Field>
            <Field label="Link" tip="Where the card goes when clicked, e.g. /products?category=oils. Blank = not clickable">
              <input
                value={form.link}
                onChange={(e) => set("link", e.target.value)}
                className="input"
                placeholder="e.g. /products?category=oils"
              />
            </Field>
            <Field label="Sort order" tip="Lower numbers appear first">
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", Number(e.target.value))}
                className="input"
              />
            </Field>
          </div>

          {/* Image field: URL or upload */}
          <Field label="Image *" tip="Card image. A roughly square or 4:3 image works best (recommended 800x600).">
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
                    className="h-32 w-44 rounded-lg border border-line object-cover"
                  />
                </div>
              )}
            </div>
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

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream hover:bg-forest-dark disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId === 0 ? "Create card" : "Save changes"}
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

      {/* Card list */}
      {cards.length === 0 && editingId === null ? (
        <div className="rounded-xl border border-line bg-paper px-6 py-12 text-center">
          <p className="text-muted">No feature cards yet. Add your first card to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.id}
              className="group relative overflow-hidden rounded-xl border border-line bg-paper"
            >
              {/* Image */}
              <div className="relative aspect-[4/3] bg-sand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image}
                  alt={c.title}
                  className="h-full w-full object-cover"
                />
                {/* Status badge */}
                <span
                  className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.isActive ? "bg-leaf-soft text-forest" : "bg-sand text-muted"
                  }`}
                >
                  {c.isActive ? "Active" : "Inactive"}
                </span>
                {/* Sort order badge */}
                <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-paper/80 px-2 py-0.5 text-xs font-medium text-muted backdrop-blur-sm">
                  <GripVertical className="h-3 w-3" />
                  {c.sortOrder}
                </span>
              </div>

              {/* Info */}
              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-medium text-ink">{c.title}</p>
                {c.subtitle && <p className="truncate text-xs text-muted">{c.subtitle}</p>}
                {c.link && <p className="truncate text-xs text-forest">{c.link}</p>}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1 border-t border-line px-3 py-2">
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sand hover:text-ink"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
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
