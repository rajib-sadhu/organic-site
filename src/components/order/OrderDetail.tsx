"use client";

import { formatPaise } from "@/lib/money";
import { OrderTimeline } from "./OrderTimeline";

type OrderStatus = "PENDING" | "CONFIRMED" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";

export type OrderView = {
  orderNo: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  shipName: string;
  shipLine1: string;
  shipLine2: string | null;
  shipCity: string;
  shipState: string;
  shipPincode: string;
  email: string;
  phone: string;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  codFeePaise: number;
  totalPaise: number;
  couponCode: string | null;
  items: {
    productName: string;
    variantLabel: string;
    qty: number;
    unitPaise: number;
    linePaise: number;
  }[];
};

export function OrderDetail({ order }: { order: OrderView }) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-forest-dark sm:text-4xl">Order {order.orderNo}</h1>
          <p className="mt-1 text-sm text-muted">
            Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <span className="rounded-full bg-leaf-soft px-3 py-1 text-xs font-semibold text-forest">
          {order.paymentMethod === "COD" ? "Cash on Delivery" : "Paid online"}
        </span>
      </div>

      {/* Timeline */}
      <OrderTimeline status={order.status} />

      {/* Items */}
      <div className="rounded-2xl border border-line bg-paper">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">Items</h2>
        </div>
        <ul className="divide-y divide-line">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium text-ink">{item.productName}</p>
                <p className="text-xs text-muted">{item.variantLabel} x {item.qty}</p>
              </div>
              <span className="font-medium text-ink">{formatPaise(item.linePaise)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-line px-5 py-3 text-sm">
          <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="font-medium">{formatPaise(order.subtotalPaise)}</span></div>
          {order.discountPaise > 0 && (
            <div className="flex justify-between text-forest"><span>Discount</span><span className="font-medium">-{formatPaise(order.discountPaise)}</span></div>
          )}
          <div className="flex justify-between"><span className="text-muted">Shipping</span><span className="font-medium">{order.shippingPaise === 0 ? "Free" : formatPaise(order.shippingPaise)}</span></div>
          {order.codFeePaise > 0 && (
            <div className="flex justify-between"><span className="text-muted">COD fee</span><span className="font-medium">{formatPaise(order.codFeePaise)}</span></div>
          )}
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="text-forest-dark">{formatPaise(order.totalPaise)}</span>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      <div className="rounded-2xl border border-line bg-paper px-5 py-4">
        <h2 className="text-sm font-semibold text-ink">Shipping address</h2>
        <p className="mt-2 text-sm text-muted">
          {order.shipName}<br />
          {order.shipLine1}{order.shipLine2 ? <><br />{order.shipLine2}</> : null}<br />
          {order.shipCity}, {order.shipState} {order.shipPincode}<br />
          {order.email} &middot; {order.phone}
        </p>
      </div>
    </div>
  );
}
