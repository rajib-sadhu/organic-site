"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatPaise } from "@/lib/money";

type Settings = {
  storeName: string; storeEmail: string | null;
  flatShippingPaise: number; freeShipOverPaise: number | null; codFeePaise: number;
  codOtpRequired: boolean; gstEnabled: boolean;
  announcementText: string | null; announcementHref: string | null;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((j) => setSettings(j.settings))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) toast.success("Settings saved.");
      else toast.error("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>;
  if (!settings) return <p className="py-12 text-muted">Failed to load settings.</p>;

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s));

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Store settings</h1>

      <div className="max-w-xl space-y-6">
        <div className="rounded-xl border border-line bg-paper p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink">General</h2>
          <Field label="Store name">
            <input value={settings.storeName} onChange={(e) => set("storeName", e.target.value)} className="input" />
          </Field>
          <Field label="Store email">
            <input value={settings.storeEmail ?? ""} onChange={(e) => set("storeEmail", e.target.value || null)} className="input" placeholder="hello@example.com" />
          </Field>
        </div>

        <div className="rounded-xl border border-line bg-paper p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink">Shipping & fees</h2>
          <Field label={`Flat shipping (paise) — currently ${formatPaise(settings.flatShippingPaise)}`}>
            <input type="number" value={settings.flatShippingPaise} onChange={(e) => set("flatShippingPaise", Number(e.target.value))} className="input" />
          </Field>
          <Field label={`Free ship over (paise)${settings.freeShipOverPaise != null ? ` — currently ${formatPaise(settings.freeShipOverPaise)}` : " — disabled"}`}>
            <input type="number" value={settings.freeShipOverPaise ?? ""} onChange={(e) => set("freeShipOverPaise", e.target.value ? Number(e.target.value) : null)} className="input" placeholder="Leave blank to disable" />
          </Field>
          <Field label={`COD fee (paise) — currently ${formatPaise(settings.codFeePaise)}`}>
            <input type="number" value={settings.codFeePaise} onChange={(e) => set("codFeePaise", Number(e.target.value))} className="input" />
          </Field>
        </div>

        <div className="rounded-xl border border-line bg-paper p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink">Toggles</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.codOtpRequired} onChange={(e) => set("codOtpRequired", e.target.checked)} className="accent-forest" />
            Require OTP for COD orders
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.gstEnabled} onChange={(e) => set("gstEnabled", e.target.checked)} className="accent-forest" />
            Show GST on invoices
          </label>
        </div>

        <div className="rounded-xl border border-line bg-paper p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink">Announcement bar</h2>
          <Field label="Text (blank = hidden)">
            <input value={settings.announcementText ?? ""} onChange={(e) => set("announcementText", e.target.value || null)} className="input" placeholder="Free delivery on orders over ₹999!" />
          </Field>
          <Field label="Link (optional)">
            <input value={settings.announcementHref ?? ""} onChange={(e) => set("announcementHref", e.target.value || null)} className="input" placeholder="/products" />
          </Field>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-forest px-6 py-2.5 text-sm font-medium text-cream hover:bg-forest-dark disabled:opacity-60"
        >
          {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save settings"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}
