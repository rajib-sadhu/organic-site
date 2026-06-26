import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { getCategories } from "@/server/repositories/catalog";

export async function CategoryStrip() {
  const categories = await getCategories();
  if (categories.length === 0) return null;

  return (
    <section className="bg-paper py-20 sm:py-24">
      <Container>
        <Reveal>
          <h2 className="font-display text-4xl text-forest-dark sm:text-5xl">
            Shop by category
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <Reveal key={c.slug} delay={(i % 3) * 0.06}>
              <Link
                href={`/products?category=${c.slug}`}
                className="group flex items-center justify-between rounded-2xl border border-line bg-cream p-6 transition-all hover:-translate-y-0.5 hover:border-forest/40 hover:shadow-lg hover:shadow-forest/5"
              >
                <span className="font-display text-xl text-ink">{c.name}</span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-leaf-soft text-forest transition-colors group-hover:bg-forest group-hover:text-cream">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
