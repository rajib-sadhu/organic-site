import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "@/components/product/ProductCard";
import { getFeaturedProducts } from "@/server/repositories/catalog";
import { TrackEvent } from "@/components/analytics/TrackEvent";
import { toItem } from "@/lib/analytics";

export async function FeaturedProducts() {
  const products = await getFeaturedProducts(8);

  return (
    <section className="py-20 sm:py-28">
      <Container>
        <Reveal className="flex items-end justify-between gap-4">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-leaf">
              Bestsellers
            </span>
            <h2 className="mt-3 font-display text-4xl text-forest-dark sm:text-5xl">
              Pantry favourites
            </h2>
          </div>
          <Link
            href="/products"
            className="group hidden shrink-0 items-center gap-1.5 text-sm font-medium text-forest hover:text-forest-dark sm:inline-flex"
          >
            View all
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>

        {products.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-line bg-paper p-10 text-center text-muted">
            Featured products will appear here once the catalog is seeded
            (<code className="text-sm">npm run db:seed</code>).
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
            <TrackEvent
              event="view_item_list"
              params={{
                item_list_id: "featured",
                item_list_name: "Pantry favourites",
                items: products.map((p, index) => ({
                  ...toItem({ productSlug: p.slug, productName: p.name, pricePaise: p.variants[0]?.pricePaise ?? 0, category: p.category.name }),
                  index,
                })),
              }}
            />
            {products.map((p, i) => (
              <Reveal key={p.id} className="h-full" delay={(i % 4) * 0.06}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-10 text-center sm:hidden">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-forest"
          >
            View all products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
