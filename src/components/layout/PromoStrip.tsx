"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type StripItem = { key: string; text: string; link: string | null };

export function PromoStrip() {
  const [items, setItems] = useState<StripItem[]>([]);
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    fetch("/api/promo-strip")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 4000);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;

  const current = items[index % items.length];

  const content = (
    <span className="block truncate px-4 text-center text-xs font-medium tracking-wide text-cream">
      {current.text}
    </span>
  );

  return (
    <div className="relative z-50 bg-forest">
      <div className="container-page flex h-8 items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.key}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            {current.link ? (
              <Link href={current.link} className="block hover:underline">
                {content}
              </Link>
            ) : (
              content
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
