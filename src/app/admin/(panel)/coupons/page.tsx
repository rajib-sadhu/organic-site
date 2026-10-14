"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { toast } from "sonner";

type Coupon = {
  id: number; code: string; description: string | null; type: string; valuePaise: number | null; percent: number | null;
  minOrderPaise: number; maxUses: number | null; usedCount: number; perEmailLimit: number | null;
  startsAt: string | null; expiresAt: string | null; isActive: boolean; createdAt: string;
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // isStale lets the effect drop a response superseded by a newer query or unmount.
  const load = useCallback((isStale: () => boolean = () => false) =>
    fetch("/api/admin/coupons")
      .then((res) => res.json())
      .then((json) => {
        if (isStale()) return;
        setCoupons(json.coupons ?? []);
        setLoading(false);
      }), []);

  useEffect(() => {
    let stale = false;
    load(() => stale);
    return () => { stale = true; };
  }, [load]);

  const handleDelete = async (id: number, code: string) => {
    if (!confirm(`Delete coupon "${code}"?`)) return;
    const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Coupon deleted."); load(); }
    else toast.error("Delete failed.");
  };

  const typeLabel = (c: Coupon) => {
    if (c.type === "PERCENT") return `${c.percent}% off`;
    if (c.type === "FLAT") return formatPaise(c.valuePaise ?? 0) + " off";
    return "Free shipping";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Coupons</h1>
        <Link
          href="/admin/coupons/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-sm font-medium text-cream hover:bg-forest-dark"
        >
          <Plus className="h-4 w-4" /> Add coupon
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
      ) : (
        <>
          <ul className="divide-y divide-line rounded-xl border border-line bg-paper md:hidden">
            {coupons.map((c) => (
              <li key={c.id} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-medium text-forest-dark">{c.code}</span>
                    <ActiveBadge active={c.isActive} />
                  </div>
                  {c.description && <p className="mt-0.5 truncate text-xs text-muted">{c.description}</p>}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="text-ink">{typeLabel(c)}</span>
                    {c.minOrderPaise > 0 && <span>Min {formatPaise(c.minOrderPaise)}</span>}
                    <span>Used {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</span>
                    {c.expiresAt && <span>Expires {new Date(c.expiresAt).toLocaleDateString("en-IN")}</span>}
                  </div>
                </div>
                <RowActions href={`/admin/coupons/${c.id}`} label={c.code} onDelete={() => handleDelete(c.id, c.code)} className="flex-col" />
              </li>
            ))}
            {coupons.length === 0 && <li className="px-3 py-5 text-center text-sm text-muted">No coupons found.</li>}
          </ul>
          <div className="hidden overflow-x-auto rounded-xl border border-line bg-paper md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-3 py-1.5">Code</th>
                  <th className="px-3 py-1.5">Description</th>
                  <th className="px-3 py-1.5">Type</th>
                  <th className="px-3 py-1.5">Min order</th>
                  <th className="px-3 py-1.5">Usage</th>
                  <th className="px-3 py-1.5">Status</th>
                  <th className="px-3 py-1.5">Expires</th>
                  <th className="px-3 py-1.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0 hover:bg-cream/50">
                    <td className="px-3 py-1.5 font-mono font-medium text-forest-dark">{c.code}</td>
                    <td className="px-3 py-1.5 text-muted text-xs max-w-48 truncate">{c.description || "—"}</td>
                    <td className="px-3 py-1.5">{typeLabel(c)}</td>
                    <td className="px-3 py-1.5 text-muted">{c.minOrderPaise > 0 ? formatPaise(c.minOrderPaise) : "—"}</td>
                    <td className="px-3 py-1.5 text-muted">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                    <td className="px-3 py-1.5"><ActiveBadge active={c.isActive} /></td>
                    <td className="px-3 py-1.5 text-muted text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-IN") : "—"}</td>
                    <td className="px-3 py-1.5 text-right">
                      <RowActions href={`/admin/coupons/${c.id}`} label={c.code} onDelete={() => handleDelete(c.id, c.code)} className="justify-end" />
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-5 text-center text-muted">No coupons found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-leaf-soft text-forest" : "bg-sand text-muted"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function RowActions({ href, label, onDelete, className }: { href: string; label: string; onDelete: () => void; className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <Link href={href} aria-label={`Edit ${label}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sand hover:text-ink">
        <Pencil className="h-3.5 w-3.5" />
      </Link>
      <button type="button" onClick={onDelete} aria-label={`Delete ${label}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-clay/10 hover:text-clay">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
