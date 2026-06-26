"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Leaf, Sprout, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/Container";

export function Hero() {
  const reduce = useReducedMotion();
  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
  const rise = {
    hidden: { opacity: 0, y: reduce ? 0 : 22 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease, delay: i * 0.1 },
    }),
  };
  const float = reduce
    ? {}
    : { animate: { y: [0, -12, 0] }, transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const } };

  return (
    <section className="relative overflow-hidden">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-leaf-soft blur-3xl" />
        <div className="absolute -right-16 top-32 h-80 w-80 rounded-full bg-honey/15 blur-3xl" />
      </div>

      <Container className="grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <motion.span
            custom={0}
            variants={rise}
            initial="hidden"
            animate="show"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 text-xs font-medium text-leaf"
          >
            <Sprout className="h-3.5 w-3.5" /> Certified organic · farm sourced
          </motion.span>

          <motion.h1
            custom={1}
            variants={rise}
            initial="hidden"
            animate="show"
            className="mt-5 font-display text-5xl leading-[1.05] text-forest-dark sm:text-6xl lg:text-7xl"
          >
            Eat clean,
            <br />
            live <span className="text-honey">verdant</span>.
          </motion.h1>

          <motion.p
            custom={2}
            variants={rise}
            initial="hidden"
            animate="show"
            className="mt-6 max-w-md text-lg leading-relaxed text-muted"
          >
            Wholesome grains, cold-pressed oils and raw honey — grown without chemicals and
            delivered fresh to your door.
          </motion.p>

          <motion.div
            custom={3}
            variants={rise}
            initial="hidden"
            animate="show"
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/products"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-forest px-7 text-sm font-medium text-cream transition-colors hover:bg-forest-dark"
            >
              Shop the collection
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/#contact"
              className="inline-flex h-12 items-center rounded-full border border-forest/30 px-7 text-sm font-medium text-forest transition-colors hover:bg-leaf-soft"
            >
              Talk to us
            </Link>
          </motion.div>
        </div>

        {/* visual */}
        <motion.div
          variants={rise}
          custom={2}
          initial="hidden"
          animate="show"
          className="relative mx-auto aspect-square w-full max-w-md"
        >
          <div className="absolute inset-0 grid place-items-center rounded-[2.5rem] bg-gradient-to-br from-leaf-soft via-sand to-honey/20">
            <Leaf className="h-1/3 w-1/3 text-forest/30" />
          </div>
          <motion.div
            {...float}
            className="absolute -left-4 top-10 flex items-center gap-2 rounded-2xl border border-line bg-paper px-4 py-3 shadow-lg shadow-forest/10"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-leaf-soft text-forest">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="text-xs">
              <p className="font-semibold text-ink">100% Organic</p>
              <p className="text-muted">No pesticides</p>
            </div>
          </motion.div>
          <motion.div
            animate={reduce ? undefined : { y: [0, 12, 0] }}
            transition={reduce ? undefined : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-2 bottom-10 rounded-2xl border border-line bg-paper px-4 py-3 shadow-lg shadow-forest/10"
          >
            <p className="text-xs text-muted">Free shipping over</p>
            <p className="font-display text-lg font-semibold text-forest-dark">₹499</p>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
