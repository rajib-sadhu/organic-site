"use client";

import type { CartAction } from "@/schema/cart";

export type ServerCartItem = {
  variantId: number;
  productSlug: string;
  productName: string;
  variantLabel: string;
  pricePaise: number;
  stock: number;
  image: string | null;
  qty: number;
  linePaise: number;
};

export type ServerCartTotals = {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  codFeePaise: number;
  totalPaise: number;
  freeShipThresholdPaise: number | null;
  coupon: {
    valid: boolean;
    code?: string;
    label?: string;
    discountPaise?: number;
    freeShipping?: boolean;
  } | null;
};

export type ServerCart = {
  id: string;
  items: ServerCartItem[];
  totals: ServerCartTotals;
};

async function call(method: "GET" | "POST", body?: CartAction): Promise<ServerCart | null> {
  const res = await fetch("/api/cart", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Cart request failed.");
  return json.cart ?? null;
}

export async function fetchCart(): Promise<ServerCart | null> {
  return call("GET");
}

export async function cartAction(action: CartAction): Promise<ServerCart | null> {
  return call("POST", action);
}
