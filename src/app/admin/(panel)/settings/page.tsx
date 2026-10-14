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
  abandonedCartOn: boolean; abandonedCartCouponId: number | null;
  customerAccounts: "OFF" | "OPTIONAL" | "REQUIRED";
};

type CouponOption = { id: number; code: string; isActive: boolean };

const ACCOUNT_MODES = [
  { value: "OPTIONAL", label: "Optional", help: "Shoppers can check out as a guest or with an account." },
  { value: "REQUIRED", label: "Required", help: "Shoppers must log in or sign up before placing an order." },
  { value: "OFF", label: "Off", help: "No accounts: login links are hidden and everyone checks out as a guest." },
] as const;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // null = couldn't load (e.g. no coupons.view permission)
  const [coupons, setCoupons] = useState<CouponOption[] | null>([]);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((j) => setSettings(j.settings))
      .finally(() => setLoading(false));
    fetch("/api/admin/coupons")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setCoupons(j.coupons ?? []))
      .catch(() => setCoupons(null));
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
      else toast.error((await res.json().catch(() => null))?.error ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>;
  if (!settings) return <p className="py-8 text-muted">Failed to load settings.</p>;

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s));

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <h1 className="text-2xl font-semibold text-ink">Store settings</h1>

      <div className="grid items-start gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-line bg-paper p-3 space-y-3">
          <h2 className="text-sm font-semibold text-ink">General</h2>
          <Field label="Store name">
            <input value={settings.storeName} onChange={(e) => set("storeName", e.target.value)} className="input" />
          </Field>
          <Field label="Store email">
            <input value={settings.storeEmail ?? ""} onChange={(e) => set("storeEmail", e.target.value || null)} className="input" placeholder="hello@example.com" />
          </Field>
        </div>

        <div className="rounded-xl border border-line bg-paper p-3 space-y-3">
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

        <div className="rounded-xl border border-line bg-paper p-3 space-y-3">
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

        <div className="rounded-xl border border-line bg-paper p-3 space-y-3">
          <h2 className="text-sm font-semibold text-ink">Customer accounts</h2>
          <div className="space-y-2">
            {ACCOUNT_MODES.map((m) => (
              <label key={m.value} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="customerAccounts"
                  checked={settings.customerAccounts === m.value}
                  onChange={() => set("customerAccounts", m.value)}
                  className="mt-0.5 accent-forest"
                />
                <span>
                  <span className="font-medium text-ink">{m.label}</span>
                  <span className="block text-xs text-muted">{m.help}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-paper p-3 space-y-3">
          <h2 className="text-sm font-semibold text-ink">Abandoned cart reminders</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.abandonedCartOn} onChange={(e) => set("abandonedCartOn", e.target.checked)} className="accent-forest" />
            Email shoppers who leave items in their cart
          </label>
          <p className="text-xs text-muted">
            Two reminders: 1 hour and 24 hours after their last cart activity. Only carts where the shopper entered an email at checkout, and never after they&apos;ve ordered or unsubscribed.
          </p>
          <Field label="Coupon in the second reminder (optional)">
            <select
              value={settings.abandonedCartCouponId ?? ""}
              onChange={(e) => set("abandonedCartCouponId", e.target.value ? Number(e.target.value) : null)}
              disabled={coupons === null}
              className="input"
            >
              <option value="">No coupon</option>
              {coupons?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}{c.isActive ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </Field>
          {coupons === null && <p className="text-xs text-muted">You need permission to view coupons to change this.</p>}
          <p className="text-xs text-muted">The code is only shown if it&apos;s active and valid for that shopper&apos;s cart.</p>
        </div>

        <div className="rounded-xl border border-line bg-paper p-3 space-y-3">
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
          className="col-span-full justify-self-start rounded-lg bg-forest px-3 py-1.5 text-sm font-medium text-cream hover:bg-forest-dark disabled:opacity-60"
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
