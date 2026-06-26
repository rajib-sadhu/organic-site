"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/cn";
import { AddToCartButton } from "./AddToCartButton";

type Variant = {
  id: number; label: string; pricePaise: number;
  mrpPaise: number | null; weightGrams: number | null; stock: number;
};

export function VariantSelector({
  productSlug,
  productName,
  image,
  variants,
}: {
  productSlug: string;
  productName: string;
  image?: string;
  variants: Variant[];
}) {
  const firstInStock = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selectedId, setSelectedId] = useState<number | undefined>(firstInStock?.id);
  const [qty, setQty] = useState(1);

  const selected = variants.find((v) => v.id === selectedId);
  const outOfStock = !selected || selected.stock <= 0;
  const maxQty = selected ? Math.max(1, selected.stock) : 1;

  const discountPct = selected?.mrpPaise && selected.mrpPaise > selected.pricePaise
    ? Math.round(((selected.mrpPaise - selected.pricePaise) / selected.mrpPaise) * 100)
    : null;

  const perUnit = selected?.weightGrams && selected.weightGrams > 0
    ? (selected.pricePaise / 100 / selected.weightGrams).toFixed(2)
    : null;

  if (variants.length === 0) {
    return <p className="text-muted">Currently unavailable.</p>;
  }

  return (
    <div className="space-y-5">
      {/* Price display */}
      <div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-semibold text-forest-dark">
            {selected ? formatPaise(selected.pricePaise) : "—"}
          </span>
          {selected?.mrpPaise && selected.mrpPaise > selected.pricePaise && (
            <span className="text-lg text-muted line-through">{formatPaise(selected.mrpPaise)}</span>
          )}
          {discountPct && (
            <span className="rounded-full bg-clay/10 px-2 py-0.5 text-xs font-semibold text-clay">
              {discountPct}% OFF
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted">
          MRP (Incl. of all taxes)
          {perUnit && <span className="ml-2">(₹{perUnit}/g)</span>}
        </p>
      </div>

      {/* Variant pills */}
      <div>
        <span className="text-sm font-medium text-ink">Size</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {variants.map((v) => {
            const active = v.id === selectedId;
            const disabled = v.stock <= 0;
            const vDiscount = v.mrpPaise && v.mrpPaise > v.pricePaise
              ? Math.round(((v.mrpPaise - v.pricePaise) / v.mrpPaise) * 100)
              : null;
            const vPerUnit = v.weightGrams && v.weightGrams > 0
              ? (v.pricePaise / 100 / v.weightGrams).toFixed(2)
              : null;

            return (
              <button
                key={v.id}
                type="button"
                disabled={disabled}
                onClick={() => { setSelectedId(v.id); setQty(1); }}
                className={cn(
                  "relative flex flex-col items-center rounded-xl border px-4 py-2.5 text-sm transition-colors",
                  active
                    ? "border-forest bg-forest/5 ring-1 ring-forest"
                    : "border-line bg-paper hover:border-forest/50",
                  disabled && "cursor-not-allowed opacity-40",
                )}
              >
                <span className="font-semibold text-ink">{v.label}</span>
                <span className="text-xs text-forest-dark">{formatPaise(v.pricePaise)}</span>
                {vPerUnit && <span className="text-[10px] text-muted">(₹{vPerUnit}/g)</span>}
                {vDiscount && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-clay px-1.5 py-0.5 text-[10px] font-bold text-cream">
                    -{vDiscount}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Qty + Add to Cart */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center rounded-full border border-line bg-paper">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-sand"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-sm font-semibold">{qty}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-sand"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {outOfStock || !selected ? (
          <button
            type="button"
            disabled
            className="h-11 cursor-not-allowed rounded-full bg-sand px-6 text-sm font-medium text-muted"
          >
            Out of stock
          </button>
        ) : (
          <AddToCartButton
            qty={qty}
            item={{
              variantId: selected.id,
              productSlug,
              productName,
              variantLabel: selected.label,
              pricePaise: selected.pricePaise,
              image,
            }}
          />
        )}
      </div>

      {selected && selected.stock > 0 && selected.stock <= 5 && (
        <p className="text-sm text-clay">Only {selected.stock} left in stock.</p>
      )}
    </div>
  );
}
