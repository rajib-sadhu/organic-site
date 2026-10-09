"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/cn";

type Order = {
  id: number; orderNo: string; status: string; paymentMethod: string; paymentStatus: string;
  totalPaise: number; shipName: string; email: string; createdAt: string;
};

const STATUSES = ["", "PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default function AdminOrdersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  // Key of the query whose results are on screen; loading until it matches the current query.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const currentPage = Number(searchParams.get("page") ?? 1);
  const statusFilter = searchParams.get("status") ?? "";
  const queryKey = `${statusFilter}|${currentPage}`;
  const loading = loadedKey !== queryKey;

  // isStale lets the effect drop a response superseded by a newer query or unmount.
  const load = useCallback((isStale: () => boolean = () => false) => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(currentPage));
    return fetch(`/api/admin/orders?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (isStale()) return;
        setOrders(json.orders ?? []);
        setTotal(json.total ?? 0);
        setPages(json.pages ?? 1);
        setLoadedKey(queryKey);
      });
  }, [statusFilter, currentPage, queryKey]);

  useEffect(() => {
    let stale = false;
    load(() => stale);
    return () => { stale = true; };
  }, [load]);

  const setFilter = (status: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    router.push(`/admin/orders?${params}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Orders</h1>
        <span className="text-sm text-muted">{total} total</span>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              (s === "" ? !statusFilter : statusFilter === s)
                ? "bg-forest text-cream"
                : "bg-sand text-muted hover:bg-line",
            )}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-paper">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-2">Order</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Payment</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-cream/50">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-forest-dark hover:underline">{o.orderNo}</Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-ink">{o.shipName}</div>
                    <div className="text-xs text-muted">{o.email}</div>
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-2.5 text-muted">{o.paymentMethod === "COD" ? "COD" : "Online"} · {o.paymentStatus}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatPaise(o.totalPaise)}</td>
                  <td className="px-4 py-2.5 text-muted">{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => router.push(`/admin/orders?page=${currentPage - 1}${statusFilter ? `&status=${statusFilter}` : ""}`)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-sand disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted">Page {currentPage} of {pages}</span>
          <button
            type="button"
            disabled={currentPage >= pages}
            onClick={() => router.push(`/admin/orders?page=${currentPage + 1}${statusFilter ? `&status=${statusFilter}` : ""}`)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:bg-sand disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-honey/15 text-honey-dark", CONFIRMED: "bg-leaf-soft text-forest",
    PACKED: "bg-leaf-soft text-forest", SHIPPED: "bg-blue-50 text-blue-700",
    DELIVERED: "bg-forest/10 text-forest-dark", CANCELLED: "bg-clay/10 text-clay", REFUNDED: "bg-clay/10 text-clay",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-sand text-muted"}`}>{status}</span>;
}
