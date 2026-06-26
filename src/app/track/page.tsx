"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Container } from "@/components/ui/Container";
import { OrderDetail, type OrderView } from "@/components/order/OrderDetail";

export default function TrackOrderPage() {
  const [orderNo, setOrderNo] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderView | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNo.trim() || !email.trim()) return;

    setLoading(true);
    setOrder(null);
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo: orderNo.trim(), email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Order not found.");
        return;
      }
      setOrder(json.order);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 sm:py-16">
      <Container className="mx-auto max-w-2xl">
        {!order ? (
          <>
            <div className="text-center">
              <h1 className="font-display text-4xl text-forest-dark sm:text-5xl">Track your order</h1>
              <p className="mt-3 text-muted">Enter your order number and email to see the latest status.</p>
            </div>

            <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-sm space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">Order number</span>
                <input
                  type="text"
                  placeholder="ORD-2026-000001"
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">Email address</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
                />
              </label>
              <button
                type="submit"
                disabled={loading || !orderNo.trim() || !email.trim()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest text-sm font-medium text-cream transition-colors hover:bg-forest-dark disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4" /> Find my order
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setOrder(null)}
              className="mb-6 text-sm text-muted hover:text-forest"
            >
              &larr; Look up another order
            </button>
            <OrderDetail order={order} />
          </>
        )}
      </Container>
    </div>
  );
}
