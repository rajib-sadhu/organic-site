"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type Banner = {
  id: number;
  title: string | null;
  subtitle: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  image: string;
};

export function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    fetch("/api/banners")
      .then((r) => r.json())
      .then((j) => setBanners(j.banners ?? []))
      .catch(() => {});
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    // Initial index is 0 (state default); reInit fires when slides change.
    emblaApi.on("select", onSelect).on("reInit", onSelect);
    return () => { emblaApi.off("select", onSelect).off("reInit", onSelect); };
  }, [emblaApi, onSelect]);

  if (!banners.length) return null;

  return (
    <section className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {banners.map((b) => (
            <div key={b.id} className="relative min-w-0 flex-[0_0_100%]">
              <div className="relative aspect-[21/9] sm:aspect-[3/1] w-full overflow-hidden">
                <img
                  src={b.image}
                  alt={b.title ?? "Banner"}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
                {(b.title || b.subtitle || b.ctaText) && (
                  <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-16 lg:px-24">
                    {b.title && (
                      <h2 className="font-display text-2xl font-bold text-white sm:text-4xl lg:text-5xl drop-shadow-lg">
                        {b.title}
                      </h2>
                    )}
                    {b.subtitle && (
                      <p className="mt-2 max-w-lg text-sm text-white/90 sm:text-base lg:text-lg drop-shadow">
                        {b.subtitle}
                      </p>
                    )}
                    {b.ctaText && b.ctaLink && (
                      <div className="mt-4 sm:mt-6">
                        <Link
                          href={b.ctaLink}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-forest px-6 text-sm font-medium text-cream transition-colors hover:bg-forest-dark sm:h-12 sm:px-8"
                        >
                          {b.ctaText}
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === selectedIndex ? "w-6 bg-white" : "w-2 bg-white/50",
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
