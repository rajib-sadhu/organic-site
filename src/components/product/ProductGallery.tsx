"use client";

import { useState } from "react";
import Image from "next/image";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import { ProductMedia } from "./ProductMedia";
import { cn } from "@/lib/cn";

type GalleryImage = { url: string; alt: string | null; isThumbnail: boolean };

type Props = {
  images: GalleryImage[];
  alt: string;
  seed: string;
};

export function ProductGallery({ images, alt, seed }: Props) {
  const thumbnail = images.find((i) => i.isThumbnail) ?? images[0];
  const [selected, setSelected] = useState(thumbnail ?? images[0]);

  if (!images.length) {
    return (
      <ProductMedia
        image={undefined}
        alt={alt}
        seed={seed}
        className="aspect-square w-full rounded-3xl"
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Inline image is optimized for its display size; the zoomed view loads the full-resolution original. */}
      <Zoom zoomImg={{ src: selected.url, alt: selected.alt ?? alt }}>
        <Image
          src={selected.url}
          alt={selected.alt ?? alt}
          width={1200}
          height={1200}
          sizes="(max-width: 1024px) 100vw, 50vw"
          fetchPriority="high"
          className="aspect-square w-full rounded-3xl object-cover"
        />
      </Zoom>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(img)}
              className={cn(
                "h-20 w-20 shrink-0 rounded-xl overflow-hidden border-2 transition-colors",
                img.url === selected.url ? "border-forest" : "border-line hover:border-forest/40",
              )}
            >
              <Image
                src={img.url}
                alt={img.alt ?? alt}
                width={80}
                height={80}
                sizes="80px"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
