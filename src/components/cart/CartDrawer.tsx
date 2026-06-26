"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { ProductMedia } from "@/components/product/ProductMedia";
import { formatPaise } from "@/lib/money";
import { useCart, selectCount, selectSubtotalPaise } from "@/store/cart";
import { cartAction } from "@/lib/cart-api";

export function CartDrawer() {
  const open = useCart((s) => s.drawerOpen);
  const close = useCart((s) => s.closeDrawer);
  const items = useCart((s) => s.items);
  const count = useCart(selectCount);
  const subtotal = useCart(selectSubtotalPaise);
  const setQtyLocal = useCart((s) => s.setQty);
  const removeLocal = useCart((s) => s.removeItem);
  const syncFromServer = useCart((s) => s.syncFromServer);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const handleSetQty = useCallback(async (variantId: number, qty: number) => {
    if (qty <= 0) removeLocal(variantId);
    else setQtyLocal(variantId, qty);
    try {
      const cart = qty <= 0
        ? await cartAction({ action: "remove", variantId })
        : await cartAction({ action: "setQty", variantId, qty });
      if (cart) syncFromServer(cart);
    } catch { /* optimistic state already set */ }
  }, [removeLocal, setQtyLocal, syncFromServer]);

  const handleRemove = useCallback(async (variantId: number) => {
    removeLocal(variantId);
    try {
      const cart = await cartAction({ action: "remove", variantId });
      if (cart) syncFromServer(cart);
    } catch { /* optimistic */ }
  }, [removeLocal, syncFromServer]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm"
            onClick={close}
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-cream shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-xl text-forest-dark">
                Cart {count > 0 && <span className="text-muted text-base font-normal">({count})</span>}
              </h2>
              <button
                type="button"
                onClick={close}
                className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-sand hover:text-ink"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items */}
            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-leaf-soft text-forest">
                  <ShoppingBag className="h-7 w-7" />
                </span>
                <p className="text-muted">Your cart is empty</p>
                <Link
                  href="/products"
                  onClick={close}
                  className="inline-flex items-center gap-1.5 rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-cream hover:bg-forest-dark"
                >
                  Browse products
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                  {items.map((item) => (
                    <li key={item.variantId} className="flex gap-3 py-4">
                      <ProductMedia
                        image={item.image ? { url: item.image, alt: item.productName } : undefined}
                        alt={item.productName}
                        seed={item.productSlug}
                        className="h-18 w-18 shrink-0 rounded-xl"
                        sizes="72px"
                      />
                      <div className="flex flex-1 flex-col min-w-0">
                        <div className="flex justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/products/${item.productSlug}`}
                              onClick={close}
                              className="block truncate text-sm font-medium text-ink hover:text-forest"
                            >
                              {item.productName}
                            </Link>
                            <p className="text-xs text-muted">{item.variantLabel}</p>
                          </div>
                          <button
                            type="button"
                            aria-label="Remove"
                            onClick={() => handleRemove(item.variantId)}
                            className="shrink-0 text-muted hover:text-clay"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <div className="flex items-center rounded-full border border-line">
                            <button
                              type="button"
                              aria-label="Decrease"
                              onClick={() => handleSetQty(item.variantId, item.qty - 1)}
                              className="grid h-7 w-7 place-items-center rounded-full hover:bg-sand"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-semibold">{item.qty}</span>
                            <button
                              type="button"
                              aria-label="Increase"
                              onClick={() => handleSetQty(item.variantId, item.qty + 1)}
                              className="grid h-7 w-7 place-items-center rounded-full hover:bg-sand"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-sm font-medium text-forest-dark">
                            {formatPaise(item.pricePaise * item.qty)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Footer */}
                <div className="border-t border-line bg-paper px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Subtotal</span>
                    <span className="font-semibold text-forest-dark">{formatPaise(subtotal)}</span>
                  </div>
                  <p className="text-xs text-muted">Shipping & coupons calculated at checkout</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/cart"
                      onClick={close}
                      className="flex h-11 items-center justify-center rounded-full border border-forest text-sm font-medium text-forest hover:bg-leaf-soft"
                    >
                      View cart
                    </Link>
                    <Link
                      href="/checkout"
                      onClick={close}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-forest text-sm font-medium text-cream hover:bg-forest-dark"
                    >
                      Checkout <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
