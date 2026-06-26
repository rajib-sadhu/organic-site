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

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/coupons");
    const json = await res.json();
    setCoupons(json.coupons ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Coupons</h1>
        <Link
          href="/admin/coupons/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream hover:bg-forest-dark"
        >
          <Plus className="h-4 w-4" /> Add coupon
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-paper">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Min order</th>
                <th className="px-4 py-2">Usage</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Expires</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-cream/50">
                  <td className="px-4 py-2.5 font-mono font-medium text-forest-dark">{c.code}</td>
                  <td className="px-4 py-2.5 text-muted text-xs max-w-48 truncate">{c.description || "—"}</td>
                  <td className="px-4 py-2.5">{typeLabel(c)}</td>
                  <td className="px-4 py-2.5 text-muted">{c.minOrderPaise > 0 ? formatPaise(c.minOrderPaise) : "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${c.isActive ? "bg-leaf-soft text-forest" : "bg-sand text-muted"}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-IN") : "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/coupons/${c.id}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sand hover:text-ink">
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button type="button" onClick={() => handleDelete(c.id, c.code)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-clay/10 hover:text-clay">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">No coupons found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
