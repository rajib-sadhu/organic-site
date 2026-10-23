"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ServerCart } from "@/lib/cart-api";
import { rupees, toItem, track } from "@/lib/analytics";

export type CartItem = {
  variantId: number;
  productSlug: string;
  productName: string;
  variantLabel: string;
  pricePaise: number;
  image?: string;
  qty: number;
};

type CartState = {
  items: CartItem[];
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (variantId: number, qty: number) => void;
  removeItem: (variantId: number) => void;
  clear: () => void;
  syncFromServer: (serverCart: ServerCart) => void;
};

// Analytics for every cart change lives here, so all callers (drawer, cart page, wishlist) are covered.
// syncFromServer only reconciles state, so it isn't tracked.
function trackQtyChange(item: Omit<CartItem, "qty">, delta: number) {
  if (delta === 0) return;
  const qty = Math.abs(delta);
  track(delta > 0 ? "add_to_cart" : "remove_from_cart", {
    currency: "INR",
    value: rupees(item.pricePaise * qty),
    items: [toItem({ ...item, qty })],
  });
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      addItem: (item, qty = 1) => {
        trackQtyChange(item, qty);
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId ? { ...i, qty: i.qty + qty } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, qty }] };
        });
      },
      setQty: (variantId, qty) => {
        const current = get().items.find((i) => i.variantId === variantId);
        if (current) trackQtyChange(current, Math.max(qty, 0) - current.qty);
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) => (i.variantId === variantId ? { ...i, qty } : i)),
        }));
      },
      removeItem: (variantId) => {
        const current = get().items.find((i) => i.variantId === variantId);
        if (current) trackQtyChange(current, -current.qty);
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) }));
      },
      clear: () => set({ items: [] }),
      syncFromServer: (serverCart) =>
        set({
          items: serverCart.items.map((si) => ({
            variantId: si.variantId,
            productSlug: si.productSlug,
            productName: si.productName,
            variantLabel: si.variantLabel,
            pricePaise: si.pricePaise,
            image: si.image ?? undefined,
            qty: si.qty,
          })),
        }),
    }),
    { name: "verdant-cart", partialize: (s) => ({ items: s.items }) },
  ),
);

export const selectCount = (s: CartState) =>
  s.items.reduce((n, i) => n + i.qty, 0);

export const selectSubtotalPaise = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.pricePaise * i.qty, 0);
