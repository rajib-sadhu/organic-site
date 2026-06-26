import Image from "next/image";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/cn";

// Deterministic soft tint per product so placeholders feel varied, not broken.
const TINTS = [
  "from-leaf-soft to-sand",
  "from-sand to-leaf-soft",
  "from-[#eef3ea] to-[#f3ecdd]",
  "from-[#f3ece0] to-[#e9f0e6]",
];

export function ProductMedia({
  image,
  alt,
  seed,
  className,
  sizes,
}: {
  image?: { url: string; alt: string | null };
  alt: string;
  seed: string;
  className?: string;
  sizes?: string;
}) {
  if (image?.url) {
    return (
      <div className={cn("relative overflow-hidden bg-sand", className)}>
        <Image
          src={image.url}
          alt={image.alt ?? alt}
          fill
          sizes={sizes ?? "(max-width: 768px) 100vw, 33vw"}
          className="object-cover"
        />
      </div>
    );
  }
  const tint = TINTS[seed.length % TINTS.length];
  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden bg-gradient-to-br",
        tint,
        className,
      )}
    >
      <Leaf className="h-1/4 w-1/4 text-forest/25" />
    </div>
  );
}
