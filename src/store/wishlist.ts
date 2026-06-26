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
  toggle: (item: WishlistItem) => void;
  remove: (variantId: number) => void;
  has: (variantId: number) => boolean;
  clear: () => void;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) =>
        set((state) => {
          const exists = state.items.some((i) => i.variantId === item.variantId);
          if (exists) {
            return { items: state.items.filter((i) => i.variantId !== item.variantId) };
          }
          return { items: [...state.items, item] };
        }),
      remove: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      has: (variantId) => get().items.some((i) => i.variantId === variantId),
      clear: () => set({ items: [] }),
    }),
    { name: "verdant-wishlist", partialize: (s) => ({ items: s.items }) },
  ),
);

export const selectCount = (s: WishlistState) => s.items.length;
