"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { formatPaise } from "@/lib/money";
import { OrderTimeline } from "@/components/order/OrderTimeline";

type OrderDetail = {
  id: number; orderNo: string; trackingToken: string; status: string; paymentMethod: string; paymentStatus: string;
  email: string; phone: string; shipName: string; shipLine1: string; shipLine2: string | null;
  shipCity: string; shipState: string; shipPincode: string;
  subtotalPaise: number; discountPaise: number; shippingPaise: number; codFeePaise: number; totalPaise: number;
  couponCode: string | null; createdAt: string;
  items: { productName: string; variantLabel: string; sku: string; qty: number; unitPaise: number; linePaise: number }[];
  invoice: { invoiceNo: string; pdfPath: string | null } | null;
};

const STATUS_FLOW = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"];

export default function AdminOrderDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((j) => setOrder(j.order))
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status }),
      });
      if (res.ok) {
        setOrder({ ...order, status });
        toast.success(`Status updated to ${status}`);
      } else {
        const json = await res.json();
        toast.error(json.error ?? "Failed.");
      }
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>;
  if (!order) return <p className="py-12 text-muted">Order not found.</p>;

  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{order.orderNo}</h1>
          <p className="text-sm text-muted">{new Date(order.createdAt).toLocaleString("en-IN")}</p>
        </div>
        <div className="flex gap-2">
          {order.invoice?.pdfPath && (
            <a href={order.invoice.pdfPath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-sand">
              <Download className="h-3.5 w-3.5" /> Invoice
            </a>
          )}
          {nextStatus && (
            <button
              type="button"
              disabled={updating}
              onClick={() => updateStatus(nextStatus)}
              className="rounded-lg bg-forest px-4 py-1.5 text-xs font-medium text-cream hover:bg-forest-dark disabled:opacity-60"
            >
              {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Mark ${nextStatus}`}
            </button>
          )}
          {order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
            <button
              type="button"
              disabled={updating}
              onClick={() => updateStatus("CANCELLED")}
              className="rounded-lg border border-clay/30 px-4 py-1.5 text-xs font-medium text-clay hover:bg-clay/5 disabled:opacity-60"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <OrderTimeline status={order.status as "PENDING" | "CONFIRMED" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED"} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Items */}
        <div className="rounded-xl border border-line bg-paper">
          <div className="border-b border-line px-5 py-3"><h2 className="text-sm font-semibold text-ink">Items</h2></div>
          <ul className="divide-y divide-line">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{item.productName}</p>
                  <p className="text-xs text-muted">{item.variantLabel} ({item.sku}) x {item.qty}</p>
                </div>
                <span className="font-medium">{formatPaise(item.linePaise)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-5 py-3 text-sm">
            <Row label="Subtotal" value={formatPaise(order.subtotalPaise)} />
            {order.discountPaise > 0 && <Row label="Discount" value={`-${formatPaise(order.discountPaise)}`} green />}
            <Row label="Shipping" value={order.shippingPaise === 0 ? "Free" : formatPaise(order.shippingPaise)} />
            {order.codFeePaise > 0 && <Row label="COD fee" value={formatPaise(order.codFeePaise)} />}
            {order.couponCode && <Row label="Coupon" value={order.couponCode} />}
            <div className="mt-2 flex justify-between border-t border-line pt-2 font-semibold">
              <span>Total</span><span className="text-forest-dark">{formatPaise(order.totalPaise)}</span>
            </div>
          </div>
        </div>

        {/* Customer + payment info */}
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-paper px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Customer</h2>
            <div className="mt-2 space-y-1 text-sm text-muted">
              <p className="font-medium text-ink">{order.shipName}</p>
              <p>{order.email}</p>
              <p>{order.phone}</p>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-paper px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Shipping address</h2>
            <p className="mt-2 text-sm text-muted">
              {order.shipLine1}{order.shipLine2 ? `, ${order.shipLine2}` : ""}<br />
              {order.shipCity}, {order.shipState} {order.shipPincode}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-paper px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Payment</h2>
            <div className="mt-2 space-y-1 text-sm">
              <Row label="Method" value={order.paymentMethod === "COD" ? "Cash on Delivery" : "Razorpay"} />
              <Row label="Status" value={order.paymentStatus} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={green ? "font-medium text-forest" : "font-medium"}>{value}</span>
    </div>
  );
}
