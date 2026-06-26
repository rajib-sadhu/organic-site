import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "@/components/product/ProductCard";
import { getAllProducts, getCategories } from "@/server/repositories/catalog";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Shop organic foods",
  description:
    "Browse certified organic grains, cold-pressed oils, raw honey and pantry staples.",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const [products, categories] = await Promise.all([
    getAllProducts(category),
    getCategories(),
  ]);

  return (
    <div className="py-12 sm:py-16">
      <Container>
        <Reveal>
          <h1 className="font-display text-4xl text-forest-dark sm:text-5xl">Shop</h1>
          <p className="mt-3 max-w-xl text-muted">
            Wholesome staples, sourced from organic farms across India.
          </p>
        </Reveal>

        {categories.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            <FilterPill href="/products" active={!category} label="All" />
            {categories.map((c) => (
              <FilterPill
                key={c.slug}
                href={`/products?category=${c.slug}`}
                active={category === c.slug}
                label={c.name}
              />
            ))}
          </div>
        )}

        {products.length === 0 ? (
          <p className="mt-12 rounded-2xl border border-dashed border-line bg-paper p-12 text-center text-muted">
            No products to show yet. Once the catalog is seeded
            (<code className="text-sm">npm run db:seed</code>) they&apos;ll appear here.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-4">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 0.05}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}

function FilterPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-forest bg-forest text-cream"
          : "border-line bg-paper text-ink hover:border-forest",
      )}
    >
      {label}
    </Link>
  );
}
