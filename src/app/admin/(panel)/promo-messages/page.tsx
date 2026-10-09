"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Pencil, Trash2, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { InfoTip } from "@/components/admin/InfoTip";

type PromoMessage = {
  id: number;
  text: string;
  link: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type MessageForm = {
  text: string;
  link: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm: MessageForm = { text: "", link: "", sortOrder: 0, isActive: true };

function toForm(m: PromoMessage): MessageForm {
  return {
    text: m.text,
    link: m.link ?? "",
    sortOrder: m.sortOrder,
    isActive: m.isActive,
  };
}

export default function AdminPromoMessagesPage() {
  const [messages, setMessages] = useState<PromoMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // null = closed, 0 = new, >0 = editing that id
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MessageForm>(emptyForm);

  // isStale lets the effect drop a response superseded by a newer query or unmount.
  const load = useCallback((isStale: () => boolean = () => false) =>
    fetch("/api/admin/promo-messages")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load messages.");
        return res.json();
      })
      .then((json) => {
        if (!isStale()) setMessages(json.messages ?? []);
      })
      .catch(() => {
        if (!isStale()) toast.error("Failed to load messages.");
      })
      .finally(() => {
        if (!isStale()) setLoading(false);
      }), []);

  useEffect(() => {
    let stale = false;
    load(() => stale);
    return () => { stale = true; };
  }, [load]);

  const openNew = () => {
    const maxSort = messages.length > 0 ? Math.max(...messages.map((m) => m.sortOrder)) : -1;
    setForm({ ...emptyForm, sortOrder: maxSort + 1 });
    setEditingId(0);
  };

  const openEdit = (m: PromoMessage) => {
    setForm(toForm(m));
    setEditingId(m.id);
  };

  const closeForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.text.trim()) {
      toast.error("Text is required.");
      return;
    }

    setSaving(true);
    try {
      const isNew = editingId === 0;
      const url = isNew ? "/api/admin/promo-messages" : `/api/admin/promo-messages/${editingId}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: form.text,
          link: form.link || null,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        }),
      });

      if (res.ok) {
        toast.success(isNew ? "Message created." : "Message updated.");
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
    if (!confirm("Delete this message?")) return;
    const res = await fetch(`/api/admin/promo-messages/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Message deleted.");
      if (editingId === id) closeForm();
      load();
    } else {
      toast.error("Delete failed.");
    }
  };

  const set = <K extends keyof MessageForm>(key: K, value: MessageForm[K]) =>
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
        <h1 className="text-2xl font-semibold text-ink">Promo strip</h1>
        {editingId === null && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream hover:bg-forest-dark"
          >
            <Plus className="h-4 w-4" /> Add message
          </button>
        )}
      </div>

      <p className="rounded-lg border border-line bg-paper px-4 py-3 text-sm text-muted">
        These messages rotate one at a time in the thin bar above the navbar, together with all{" "}
        <span className="font-medium text-ink">active coupons</span> (their code and description are
        shown automatically — you don&apos;t need to add them here).
      </p>

      {/* Inline form */}
      {editingId !== null && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-paper p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              {editingId === 0 ? "New message" : "Edit message"}
            </h2>
            <button type="button" onClick={closeForm} className="text-muted hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>

          <Field label="Text *" tip="The promo line shown in the strip, e.g. 'Free delivery on orders over ₹999'">
            <input
              value={form.text}
              onChange={(e) => set("text", e.target.value)}
              className="input"
              placeholder="e.g. Free delivery on orders over ₹999"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Link" tip="Where the message goes when clicked, e.g. /products. Blank = not clickable">
              <input
                value={form.link}
                onChange={(e) => set("link", e.target.value)}
                className="input"
                placeholder="e.g. /products"
              />
            </Field>
            <Field label="Sort order" tip="Lower numbers appear first in the rotation (messages come before coupons)">
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", Number(e.target.value))}
                className="input"
              />
            </Field>
          </div>

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
              {editingId === 0 ? "Create message" : "Save changes"}
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

      {/* Message list */}
      {messages.length === 0 && editingId === null ? (
        <div className="rounded-xl border border-line bg-paper px-6 py-12 text-center">
          <p className="text-muted">
            No custom messages yet. Active coupons still show in the strip automatically.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-paper">
          {messages.map((m, i) => (
            <div
              key={m.id}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-line" : ""}`}
            >
              <span className="flex items-center gap-0.5 text-xs text-muted">
                <GripVertical className="h-3.5 w-3.5" />
                {m.sortOrder}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{m.text}</p>
                {m.link && <p className="truncate text-xs text-forest">{m.link}</p>}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.isActive ? "bg-leaf-soft text-forest" : "bg-sand text-muted"
                }`}
              >
                {m.isActive ? "Active" : "Inactive"}
              </span>
              <button
                type="button"
                onClick={() => openEdit(m)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sand hover:text-ink"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-clay/10 hover:text-clay"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
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
