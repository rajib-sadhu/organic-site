"use client";

import { useEffect, useState } from "react";
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { formatPaise } from "@/lib/money";

type Stats = {
  revenue: { today: { paise: number; count: number }; week: { paise: number; count: number }; month: { paise: number; count: number } };
  ordersByStatus: { status: string; count: number }[];
  recentOrders: { id: number; orderNo: string; status: string; totalPaise: number; paymentMethod: string; shipName: string; createdAt: string }[];
  topProducts: { name: string; qty: number; revenuePaise: number }[];
  lowStock: { productName: string; variant: string; sku: string; stock: number }[];
  methodSplit: { method: string; count: number; paise: number }[];
};

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  if (!stats) return <p className="py-12 text-muted">Failed to load dashboard.</p>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>

      {/* Revenue cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {([
          { label: "Today", data: stats.revenue.today },
          { label: "Last 7 days", data: stats.revenue.week },
          { label: "Last 30 days", data: stats.revenue.month },
        ] as const).map((card) => (
          <div key={card.label} className="rounded-xl border border-line bg-paper p-5">
            <div className="flex items-center gap-2 text-sm text-muted">
              <DollarSign className="h-4 w-4" /> {card.label}
            </div>
            <p className="mt-2 text-2xl font-semibold text-forest-dark">{formatPaise(card.data.paise)}</p>
            <p className="text-xs text-muted">{card.data.count} orders</p>
          </div>
        ))}
      </div>

      {/* Orders by status + method split */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-paper p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><ShoppingCart className="h-4 w-4" /> Orders by status</h2>
          <div className="space-y-2">
            {stats.ordersByStatus.map((s) => (
              <div key={s.status} className="flex justify-between text-sm">
                <span className="text-muted">{s.status}</span>
                <span className="font-medium text-ink">{s.count}</span>
              </div>
            ))}
            {stats.ordersByStatus.length === 0 && <p className="text-sm text-muted">No orders yet.</p>}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-paper p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><TrendingUp className="h-4 w-4" /> Payment methods</h2>
          <div className="space-y-2">
            {stats.methodSplit.map((m) => (
              <div key={m.method} className="flex justify-between text-sm">
                <span className="text-muted">{m.method === "COD" ? "Cash on Delivery" : "Online"}</span>
                <span className="font-medium text-ink">{m.count} ({formatPaise(m.paise)})</span>
              </div>
            ))}
            {stats.methodSplit.length === 0 && <p className="text-sm text-muted">No data yet.</p>}
          </div>
        </div>
      </div>

      {/* Top products + Low stock */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-paper p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">Top products</h2>
          <div className="space-y-2">
            {stats.topProducts.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-ink">{p.name}</span>
                <span className="text-muted">{p.qty} sold · {formatPaise(p.revenuePaise)}</span>
              </div>
            ))}
            {stats.topProducts.length === 0 && <p className="text-sm text-muted">No sales yet.</p>}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-paper p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><AlertTriangle className="h-4 w-4 text-honey" /> Low stock alerts</h2>
          <div className="space-y-2">
            {stats.lowStock.map((v, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-ink">{v.productName} <span className="text-muted">({v.variant})</span></span>
                <span className={v.stock === 0 ? "font-semibold text-clay" : "text-honey-dark"}>{v.stock} left</span>
              </div>
            ))}
            {stats.lowStock.length === 0 && <p className="text-sm text-muted">All stocked up!</p>}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-xl border border-line bg-paper">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">Recent orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-2">Order</th>
                <th className="px-5 py-2">Customer</th>
                <th className="px-5 py-2">Status</th>
                <th className="px-5 py-2">Method</th>
                <th className="px-5 py-2 text-right">Total</th>
                <th className="px-5 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-2.5 font-medium text-forest-dark">{o.orderNo}</td>
                  <td className="px-5 py-2.5 text-ink">{o.shipName}</td>
                  <td className="px-5 py-2.5"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-2.5 text-muted">{o.paymentMethod === "COD" ? "COD" : "Online"}</td>
                  <td className="px-5 py-2.5 text-right font-medium">{formatPaise(o.totalPaise)}</td>
                  <td className="px-5 py-2.5 text-muted">{new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                </tr>
              ))}
              {stats.recentOrders.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-6 text-center text-muted">No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-honey/15 text-honey-dark",
    CONFIRMED: "bg-leaf-soft text-forest",
    PACKED: "bg-leaf-soft text-forest",
    SHIPPED: "bg-blue-50 text-blue-700",
    DELIVERED: "bg-forest/10 text-forest-dark",
    CANCELLED: "bg-clay/10 text-clay",
    REFUNDED: "bg-clay/10 text-clay",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-sand text-muted"}`}>
      {status}
    </span>
  );
}
