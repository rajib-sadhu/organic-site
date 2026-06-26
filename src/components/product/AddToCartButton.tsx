"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useCart, type CartItem } from "@/store/cart";
import { cartAction } from "@/lib/cart-api";
import { cn } from "@/lib/cn";

export function AddToCartButton({
  item,
  qty = 1,
  className,
  children,
  compact = false,
}: {
  item: Omit<CartItem, "qty">;
  qty?: number;
  className?: string;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  const addItem = useCart((s) => s.addItem);
  const syncFromServer = useCart((s) => s.syncFromServer);
  const openDrawer = useCart((s) => s.openDrawer);

  const handleClick = async () => {
    addItem(item, qty);
    openDrawer();

    try {
      const serverCart = await cartAction({ action: "add", variantId: item.variantId, qty });
      if (serverCart) syncFromServer(serverCart);
    } catch {
      // optimistic state already set; server sync will reconcile on next page load
    }
  };

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full bg-forest font-medium text-cream transition-colors hover:bg-forest-dark",
        compact ? "h-9 w-9" : "h-11 px-6 text-sm",
        className,
      )}
      aria-label={compact ? `Add ${item.productName} to cart` : undefined}
    >
      <Plus className={compact ? "h-4 w-4" : "h-4 w-4"} />
      {!compact && (children ?? "Add to cart")}
    </motion.button>
  );
}
