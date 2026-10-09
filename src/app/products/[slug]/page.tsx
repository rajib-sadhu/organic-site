import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Star } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { VariantSelector } from "@/components/product/VariantSelector";
import { ProductBadges } from "@/components/product/ProductBadges";
import { TrustBadges } from "@/components/product/TrustBadges";
import { ProductDetails } from "@/components/product/ProductDetails";
import { ReviewSection } from "@/components/review/ReviewSection";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductWishlist } from "@/components/product/ProductWishlist";
import {
  getProductBySlug,
  getAllProductSlugs,
} from "@/server/repositories/catalog";
import { siteConfig } from "@/lib/site";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  const description = product.metaDescription ?? product.description;
  return {
    title: product.metaTitle ?? product.name,
    description,
    keywords: product.metaKeywords ?? undefined,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.metaTitle ?? product.name,
      description,
      url: `${siteConfig.url}/products/${product.slug}`,
      images: product.images[0]?.url ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const tags = Array.isArray(product.tags) ? (product.tags as string[]) : [];
  const highlights = Array.isArray(product.highlights) ? (product.highlights as string[]) : [];
  const benefits = Array.isArray(product.benefits) ? (product.benefits as string[]) : [];
  const nutritionInfo = product.nutritionInfo && typeof product.nutritionInfo === "object" && !Array.isArray(product.nutritionInfo)
    ? (product.nutritionInfo as Record<string, string>)
    : null;

  const prices = product.variants.map((v) => v.pricePaise);
  const inStock = product.variants.some((v) => v.stock > 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    category: product.category.name,
    ...(product.images[0]?.url ? { image: product.images[0].url } : {}),
    ...(product.ratingCount > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.ratingAvg.toFixed(1),
        reviewCount: product.ratingCount,
      },
    } : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: prices.length ? (Math.min(...prices) / 100).toFixed(2) : undefined,
      highPrice: prices.length ? (Math.max(...prices) / 100).toFixed(2) : undefined,
      offerCount: product.variants.length,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="py-10 sm:py-14">
      <Container>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted">
          <Link href="/" className="hover:text-forest">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/products" className="hover:text-forest">Shop</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href={`/products?category=${product.category.slug}`} className="hover:text-forest">
            {product.category.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Gallery with zoom */}
          <div className="space-y-3">
            {tags.length > 0 && (
              <div className="mb-2">
                <ProductBadges tags={tags} size="md" />
              </div>
            )}
            <ProductGallery images={product.images} alt={product.name} seed={product.slug} />
          </div>

          {/* Info */}
          <div>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="text-sm font-semibold uppercase tracking-wider text-leaf hover:text-forest"
            >
              {product.category.name}
            </Link>
            <h1 className="mt-2 font-display text-3xl text-forest-dark sm:text-4xl">
              {product.name}
            </h1>

            {product.tagline && (
              <p className="mt-1.5 text-base text-muted">{product.tagline}</p>
            )}

            {highlights.length > 0 && (
              <p className="mt-2 text-sm text-muted">
                {highlights.join(" | ")}
              </p>
            )}

            {/* Rating */}
            {product.ratingCount > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.round(product.ratingAvg) ? "fill-honey text-honey" : "text-line"}`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-ink">{product.ratingAvg.toFixed(1)}</span>
                <span className="text-sm text-muted">| {product.ratingCount.toLocaleString()} Reviews</span>
              </div>
            )}

            {product.shortDescription && (
              <p className="mt-4 text-sm leading-relaxed text-ink/80">{product.shortDescription}</p>
            )}

            {/* Variant selector with pricing + wishlist */}
            <div className="mt-6">
              <VariantSelector
                productSlug={product.slug}
                productName={product.name}
                image={product.images[0]?.url}
                variants={product.variants}
              />
              <ProductWishlist
                productSlug={product.slug}
                productName={product.name}
                image={product.images[0]?.url}
                variants={product.variants}
              />
            </div>

            {/* Trust badges */}
            <div className="mt-8">
              <TrustBadges />
            </div>
          </div>
        </div>

        {/* Detail tabs */}
        <ProductDetails
          description={product.description}
          highlights={highlights}
          benefits={benefits}
          howToUse={product.howToUse}
          ingredients={product.ingredients}
          nutritionInfo={nutritionInfo}
          shelfLife={product.shelfLife}
          storage={product.storage}
        />

        {/* Reviews */}
        <ReviewSection productId={product.id} />
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
