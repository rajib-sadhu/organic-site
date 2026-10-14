"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useCart, selectCount } from "@/store/cart";
import { useMounted } from "@/lib/use-mounted";

export function CartButton() {
  const count = useCart(selectCount);
  const openDrawer = useCart((s) => s.openDrawer);
  const mounted = useMounted();

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={`Cart${mounted && count ? `, ${count} items` : ""}`}
      className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-sand"
    >
      <ShoppingBag className="h-5 w-5" />
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
    </button>
  );
}
