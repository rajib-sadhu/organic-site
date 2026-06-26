// Cache tags for Next.js ISR (see ARCHITECTURE.md §6.5).
// Catalog pages are tagged so the admin "Clear cache" action can call
// revalidateTag(...) to refresh them. Cart/checkout/admin are NEVER cached.

export const CACHE_TAGS = {
  products: "products",
  categories: "categories",
  product: (slug: string) => `product:${slug}`,
} as const;

// Cacheable surfaces, for documentation + the admin clear-cache UI.
export const CACHEABLE = [
  "Home page",
  "Product listing",
  "Product detail pages",
  "Category pages",
] as const;
