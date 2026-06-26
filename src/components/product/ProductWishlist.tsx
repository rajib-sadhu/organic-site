"use client";

import { WishlistButton } from "@/components/wishlist/WishlistButton";

type Variant = {
  id: number;
  label: string;
  pricePaise: number;
};

type Props = {
  productSlug: string;
  productName: string;
  image?: string;
  variants: Variant[];
};

export function ProductWishlist({ productSlug, productName, image, variants }: Props) {
  const first = variants[0];
  if (!first) return null;

  return (
    <div className="mt-3">
      <WishlistButton
        item={{
          variantId: first.id,
          productSlug,
          productName,
          variantLabel: first.label,
          pricePaise: first.pricePaise,
          image,
        }}
        className="text-sm"
      />
    </div>
  );
}
