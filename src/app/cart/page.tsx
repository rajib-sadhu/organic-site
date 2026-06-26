"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Container } from "@/components/ui/Container";
import { ProductMedia } from "@/components/product/ProductMedia";
import { CouponsModal } from "@/components/cart/CouponsModal";
import { formatPaise } from "@/lib/money";
import { useCart, selectCount } from "@/store/cart";
import { fetchCart, cartAction, type ServerCart, type ServerCartTotals } from "@/lib/cart-api";

export default function CartPage() {
  const zustandItems = useCart((s) => s.items);
  const zustandCount = useCart(selectCount);
  const syncFromServer = useCart((s) => s.syncFromServer);
  const setQtyLocal = useCart((s) => s.setQty);
  const removeLocal = useCart((s) => s.removeItem);
  const clearLocal = useCart((s) => s.clear);

  const [mounted, setMounted] = useState(false);
  const [serverCart, setServerCart] = useState<ServerCart | null>(null);
  const [totals, setTotals] = useState<ServerCartTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponsOpen, setCouponsOpen] = useState(false);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    try {
      const cart = await fetchCart();
      if (cart) {
        setServerCart(cart);
        setTotals(cart.totals);
        syncFromServer(cart);
      }
    } catch {
      // fall back to zustand state
    } finally {
      setLoading(false);
    }
  }, [syncFromServer]);

  useEffect(() => {
    setMounted(true);
    loadCart();
  }, [loadCart]);

  const handleSetQty = async (variantId: number, qty: number) => {
    if (qty <= 0) {
      removeLocal(variantId);
    } else {
      setQtyLocal(variantId, qty);
    }
    try {
      const cart = qty <= 0
        ? await cartAction({ action: "remove", variantId })
        : await cartAction({ action: "setQty", variantId, qty });
      if (cart) {
        setServerCart(cart);
        setTotals(cart.totals);
        syncFromServer(cart);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update cart.");
      loadCart();
    }
  };

  const handleRemove = async (variantId: number) => {
    removeLocal(variantId);
    try {
      const cart = await cartAction({ action: "remove", variantId });
      if (cart) {
        setServerCart(cart);
        setTotals(cart.totals);
        syncFromServer(cart);
      }
    } catch {
      loadCart();
    }
  };

  const handleApplyCoupon = async (codeArg?: string) => {
    const code = (codeArg ?? couponInput).trim();
    if (!code) return;
    setCouponLoading(true);
    setApplyingCode(code);
    try {
      const cart = await cartAction({ action: "applyCoupon", code });
      if (cart) {
        setServerCart(cart);
        setTotals(cart.totals);
        syncFromServer(cart);
        setCouponInput("");
        setCouponsOpen(false);
        toast.success("Coupon applied!");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid coupon.");
    } finally {
      setCouponLoading(false);
      setApplyingCode(null);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      const cart = await cartAction({ action: "removeCoupon" });
      if (cart) {
        setServerCart(cart);
        setTotals(cart.totals);
        syncFromServer(cart);
        toast.success("Coupon removed.");
      }
    } catch {
      loadCart();
    }
  };

  if (!mounted || loading) {
    return (
      <Container>
        <div className="flex items-center justify-center gap-2 py-24 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading cart…
        </div>
      </Container>
    );
  }

  const items = serverCart?.items ?? zustandItems.map((i) => ({
    ...i,
    stock: 999,
    image: i.image ?? null,
    linePaise: i.pricePaise * i.qty,
  }));

  if (items.length === 0 && zustandCount === 0) {
    return (
      <Container>
        <div className="flex flex-col items-center py-24 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-leaf-soft text-forest">
            <ShoppingBag className="h-8 w-8" />
          </span>
          <h1 className="mt-6 font-display text-3xl text-forest-dark">Your cart is empty</h1>
          <p className="mt-2 text-muted">Add some wholesome staples to get started.</p>
          <Link
            href="/products"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-forest px-7 text-sm font-medium text-cream hover:bg-forest-dark"
          >
            Browse products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    );
  }

  const coupon = totals?.coupon;
  const hasCoupon = coupon && coupon.valid;

  return (
    <div className="py-12 sm:py-16">
      <Container>
        <h1 className="font-display text-4xl text-forest-dark sm:text-5xl">Your cart</h1>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <ul className="divide-y divide-line rounded-2xl border border-line bg-paper">
            {items.map((item) => (
              <li key={item.variantId} className="flex gap-4 p-4">
                <ProductMedia
                  image={item.image ? { url: item.image, alt: item.productName } : undefined}
                  alt={item.productName}
                  seed={item.productSlug}
                  className="h-24 w-24 shrink-0 rounded-xl"
                  sizes="96px"
                />
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div>
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="font-display text-lg text-ink hover:text-forest"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-sm text-muted">{item.variantLabel}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove item"
                      onClick={() => handleRemove(item.variantId)}
                      className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-sand hover:text-clay"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center rounded-full border border-line">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => handleSetQty(item.variantId, item.qty - 1)}
                        className="grid h-9 w-9 place-items-center rounded-full hover:bg-sand"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-semibold">{item.qty}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => handleSetQty(item.variantId, item.qty + 1)}
                        className="grid h-9 w-9 place-items-center rounded-full hover:bg-sand"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="font-medium text-forest-dark">
                      {formatPaise(item.linePaise)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit space-y-5 rounded-2xl border border-line bg-cream p-6">
            <h2 className="font-display text-xl text-forest-dark">Order summary</h2>

            {/* Coupon */}
            {hasCoupon ? (
              <div className="flex items-center justify-between rounded-lg bg-leaf-soft px-3 py-2 text-sm">
                <span className="flex items-center gap-1.5 font-medium text-forest">
                  <Tag className="h-4 w-4" />
                  {coupon.code} — {coupon.label}
                </span>
                <button type="button" onClick={handleRemoveCoupon} className="text-muted hover:text-clay">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    disabled={couponLoading || !couponInput.trim()}
                    className="rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-forest-dark disabled:opacity-50"
                  >
                    {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setCouponsOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-forest hover:text-forest-dark hover:underline"
                >
                  <Tag className="h-3.5 w-3.5" /> View available coupons
                </button>
              </div>
            )}

            {/* Totals */}
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="font-medium text-ink">{formatPaise(totals?.subtotalPaise ?? 0)}</dd>
              </div>
              {(totals?.discountPaise ?? 0) > 0 && (
                <div className="flex justify-between text-forest">
                  <dt>Discount</dt>
                  <dd className="font-medium">−{formatPaise(totals!.discountPaise)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd className="font-medium text-ink">
                  {totals?.shippingPaise === 0 ? (
                    <span className="text-forest">Free</span>
                  ) : (
                    formatPaise(totals?.shippingPaise ?? 0)
                  )}
                </dd>
              </div>
              {totals?.freeShipThresholdPaise != null &&
                (totals.subtotalPaise - totals.discountPaise) < totals.freeShipThresholdPaise && (
                  <p className="text-xs text-honey-dark">
                    Add {formatPaise(totals.freeShipThresholdPaise - (totals.subtotalPaise - totals.discountPaise))} more for free shipping!
                  </p>
                )}
              <div className="border-t border-line pt-3">
                <div className="flex justify-between text-base font-semibold">
                  <dt className="text-ink">Total</dt>
                  <dd className="text-forest-dark">{formatPaise(totals?.totalPaise ?? 0)}</dd>
                </div>
              </div>
            </dl>

            <Link
              href="/checkout"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest text-sm font-medium text-cream transition-colors hover:bg-forest-dark"
            >
              Proceed to checkout <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </Container>

      <CouponsModal
        open={couponsOpen}
        onClose={() => setCouponsOpen(false)}
        onApply={(code) => handleApplyCoupon(code)}
        applyingCode={applyingCode}
      />
    </div>
  );
}
