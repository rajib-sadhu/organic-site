"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useWishlist, type WishlistItem } from "@/store/wishlist";
import { cn } from "@/lib/cn";

export function WishlistButton({
  item,
  className,
  compact,
}: {
  item: WishlistItem;
  className?: string;
  compact?: boolean;
}) {
  const toggle = useWishlist((s) => s.toggle);
  const items = useWishlist((s) => s.items);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const active = mounted && items.some((i) => i.variantId === item.variantId);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.8 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(item);
      }}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      className={cn(
        "grid place-items-center rounded-full transition-colors",
        compact
          ? "h-8 w-8 bg-cream/80 backdrop-blur-sm hover:bg-cream"
          : "h-10 w-10 hover:bg-sand",
        className,
      )}
    >
      <Heart
        className={cn(
          compact ? "h-4 w-4" : "h-5 w-5",
          active ? "fill-clay text-clay" : "text-ink/60",
        )}
      />
    </motion.button>
  );
}
