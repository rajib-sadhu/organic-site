import Link from "next/link";
import type { CatalogProduct } from "@/server/repositories/catalog";
import { ProductMedia } from "./ProductMedia";
import { Price } from "./Price";
import { AddToCartButton } from "./AddToCartButton";
import { ProductBadges } from "./ProductBadges";
import { WishlistButton } from "@/components/wishlist/WishlistButton";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const cheapest = product.variants[0];
  const href = `/products/${product.slug}`;
  const tags = Array.isArray(product.tags) ? (product.tags as string[]) : [];
  const thumbnail = product.images.find((i) => i.isThumbnail) ?? product.images[0];

  const discountPct = cheapest?.mrpPaise && cheapest.mrpPaise > cheapest.pricePaise
    ? Math.round(((cheapest.mrpPaise - cheapest.pricePaise) / cheapest.mrpPaise) * 100)
    : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-paper transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-forest/10">
      <Link href={href} className="relative block">
        <ProductMedia
          image={thumbnail}
          alt={product.name}
          seed={product.slug}
          className="aspect-[4/3] transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {tags.length > 0 && (
          <div className="absolute left-2 top-2">
            <ProductBadges tags={tags.slice(0, 2)} size="sm" />
          </div>
        )}
        {discountPct && (
          <span className="absolute right-2 top-2 rounded-full bg-clay px-2 py-0.5 text-[10px] font-bold text-cream">
            -{discountPct}%
          </span>
        )}
        {cheapest && (
          <div className="absolute bottom-2 right-2">
            <WishlistButton
              compact
              item={{
                variantId: cheapest.id,
                productSlug: product.slug,
                productName: product.name,
                variantLabel: cheapest.label,
                pricePaise: cheapest.pricePaise,
                image: thumbnail?.url,
              }}
            />
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <span className="text-xs font-medium uppercase tracking-wider text-leaf">
          {product.category.name}
        </span>
        <h3 className="mt-1 font-display text-lg leading-snug text-ink">
          <Link href={href} className="transition-colors hover:text-forest">
            {product.name}
          </Link>
        </h3>
        {product.tagline && (
          <p className="mt-0.5 text-xs text-muted line-clamp-1">{product.tagline}</p>
        )}
        {product.ratingCount > 0 && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted">
            <div className="flex text-honey">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < Math.round(product.ratingAvg) ? "text-honey" : "text-line"}>★</span>
              ))}
            </div>
            <span>{product.ratingAvg.toFixed(1)}</span>
            <span className="text-muted">({product.ratingCount})</span>
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-4">
          <div>
            <Price variants={product.variants} className="text-base" />
            {cheapest?.mrpPaise && cheapest.mrpPaise > cheapest.pricePaise && (
              <span className="ml-1.5 text-xs text-muted line-through">
                ₹{(cheapest.mrpPaise / 100).toLocaleString("en-IN")}
              </span>
            )}
          </div>
          {cheapest && (
            <AddToCartButton
              compact
              item={{
                variantId: cheapest.id,
                productSlug: product.slug,
                productName: product.name,
                variantLabel: cheapest.label,
                pricePaise: cheapest.pricePaise,
                image: thumbnail?.url,
              }}
            />
          )}
        </div>
      </div>
    </article>
  );
}
