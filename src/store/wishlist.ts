"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WishlistItem = {
  variantId: number;
  productSlug: string;
  productName: string;
  variantLabel: string;
  pricePaise: number;
  image?: string;
};

type WishlistState = {
  items: WishlistItem[];
  /** True while a customer is logged in: changes are mirrored to their account (§6.6). */
  synced: boolean;
  /** Replace the list with the account's copy and start mirroring changes. */
  attachAccount: (items: WishlistItem[]) => void;
  /** Logged out: stop mirroring and forget the account's list on this browser. */
  detachAccount: () => void;
  toggle: (item: WishlistItem) => void;
  remove: (variantId: number) => void;
  has: (variantId: number) => boolean;
  clear: () => void;
};

// Optimistic: local state already changed; a failed request is fixed by the next login/page load sync.
function mirror(method: "POST" | "DELETE", variantId: number) {
  fetch("/api/account/wishlist", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ variantIds: [variantId] }),
  }).catch(() => {});
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      synced: false,
      attachAccount: (items) => set({ items, synced: true }),
      detachAccount: () => set({ items: [], synced: false }),
      toggle: (item) => {
        const exists = get().items.some((i) => i.variantId === item.variantId);
        set((state) => ({
          items: exists ? state.items.filter((i) => i.variantId !== item.variantId) : [...state.items, item],
        }));
        if (get().synced) mirror(exists ? "DELETE" : "POST", item.variantId);
      },
      remove: (variantId) => {
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) }));
        if (get().synced) mirror("DELETE", variantId);
      },
      has: (variantId) => get().items.some((i) => i.variantId === variantId),
      clear: () => set({ items: [] }),
    }),
    { name: "verdant-wishlist", partialize: (s) => ({ items: s.items, synced: s.synced }) },
  ),
);

export const selectCount = (s: WishlistState) => s.items.length;
