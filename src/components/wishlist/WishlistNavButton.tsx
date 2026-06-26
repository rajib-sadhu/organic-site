"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
import { useWishlist, selectCount } from "@/store/wishlist";

export function WishlistNavButton() {
  const count = useWishlist(selectCount);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Link
      href="/wishlist"
      aria-label={`Wishlist${mounted && count ? `, ${count} items` : ""}`}
      className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-sand"
    >
      <Heart className="h-5 w-5" />
      <AnimatePresence>
        {mounted && count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 24 }}
            className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-honey px-1 text-[11px] font-semibold text-forest-dark"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
