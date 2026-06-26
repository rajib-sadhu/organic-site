"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Tag, Loader2, Copy, Check } from "lucide-react";
import { formatPaise } from "@/lib/money";

type PublicCoupon = {
  code: string;
  description: string | null;
  label: string;
  minOrderPaise: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (code: string) => void | Promise<void>;
  applyingCode?: string | null;
};

export function CouponsModal({ open, onClose, onApply, applyingCode }: Props) {
  const [coupons, setCoupons] = useState<PublicCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/coupons")
      .then((r) => r.json())
      .then((j) => setCoupons(j.coupons ?? []))
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false));
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Available coupons"
            className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-line bg-paper shadow-xl sm:rounded-2xl"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", duration: 0.35 }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="flex items-center gap-2 font-display text-lg text-forest-dark">
                <Tag className="h-5 w-5" /> Available coupons
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-sand hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </div>
              ) : coupons.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted">
                  No coupons available right now.
                </p>
              ) : (
                <ul className="space-y-3">
                  {coupons.map((c) => {
                    const applying = applyingCode === c.code;
                    return (
                      <li
                        key={c.code}
                        className="rounded-xl border border-dashed border-forest/40 bg-leaf-soft/40 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-base font-bold text-forest-dark">
                                {c.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyCode(c.code)}
                                aria-label="Copy code"
                                className="text-muted transition-colors hover:text-forest"
                              >
                                {copied === c.code ? (
                                  <Check className="h-3.5 w-3.5 text-forest" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                            <p className="mt-0.5 text-sm font-medium text-forest">{c.label}</p>
                            {c.description && (
                              <p className="mt-1 text-xs text-muted">{c.description}</p>
                            )}
                            {c.minOrderPaise > 0 && (
                              <p className="mt-1 text-xs text-muted">
                                Min order {formatPaise(c.minOrderPaise)}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onApply(c.code)}
                            disabled={!!applyingCode}
                            className="shrink-0 rounded-lg bg-forest px-3 py-1.5 text-xs font-medium text-cream transition-colors hover:bg-forest-dark disabled:opacity-50"
                          >
                            {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
