"use client";

import Link from "next/link";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useWishlist, type WishlistItem } from "@/store/wishlist";
import { useCart } from "@/store/cart";
import { ProductMedia } from "@/components/product/ProductMedia";
import { formatPaise } from "@/lib/money";
import { useMounted } from "@/lib/use-mounted";

function WishlistItemCard({ item }: { item: WishlistItem }) {
  const remove = useWishlist((s) => s.remove);
  const addItem = useCart((s) => s.addItem);
  const openDrawer = useCart((s) => s.openDrawer);

  const handleAddToCart = () => {
    addItem({
      variantId: item.variantId,
      productSlug: item.productSlug,
      productName: item.productName,
      variantLabel: item.variantLabel,
      pricePaise: item.pricePaise,
      image: item.image,
    });
    openDrawer();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="group overflow-hidden rounded-2xl border border-line bg-paper"
    >
      <Link href={`/products/${item.productSlug}`} className="block">
        <ProductMedia
          image={item.image ? { url: item.image, alt: item.productName } : undefined}
          alt={item.productName}
          seed={item.productSlug}
          className="aspect-square"
        />
      </Link>

      <div className="flex flex-col gap-3 p-4">
        <div>
          <Link
            href={`/products/${item.productSlug}`}
            className="line-clamp-1 font-medium text-ink hover:text-forest transition-colors"
          >
            {item.productName}
          </Link>
          <p className="mt-0.5 text-sm text-muted">{item.variantLabel}</p>
          <p className="mt-1 font-semibold text-forest-dark">{formatPaise(item.pricePaise)}</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-forest-dark"
          >
            <ShoppingBag className="h-4 w-4" />
            Add to cart
          </button>
          <button
            type="button"
            onClick={() => remove(item.variantId)}
            aria-label="Remove from wishlist"
            className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-line text-muted transition-colors hover:border-clay hover:text-clay"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function WishlistPage() {
  const items = useWishlist((s) => s.items);
  const mounted = useMounted();

  if (!mounted) {
    return (
      <section className="container-page py-12">
        <h1 className="font-display text-2xl font-semibold text-forest-dark">My Wishlist</h1>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4" />
      </section>
    );
  }

  return (
    <section className="container-page py-12">
      <h1 className="font-display text-2xl font-semibold text-forest-dark">My Wishlist</h1>

      {items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-sand">
            <Heart className="h-8 w-8 text-muted" />
          </div>
          <p className="mt-6 text-lg font-medium text-ink">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-muted">
            Save items you love and come back to them later.
          </p>
          <Link
            href="/products"
            className="mt-6 rounded-xl bg-forest px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-forest-dark"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {items.map((item) => (
            <WishlistItemCard key={item.variantId} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
