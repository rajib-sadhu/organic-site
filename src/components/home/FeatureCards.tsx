import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/cn";

const GRID_CLASS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export async function FeatureCards() {
  let cards: Awaited<ReturnType<typeof prisma.featureCard.findMany>> = [];
  let cols = 3;
  try {
    const [foundCards, setting] = await Promise.all([
      prisma.featureCard.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.setting.findUnique({ where: { id: 1 }, select: { featureCardGrid: true } }),
    ]);
    cards = foundCards;
    cols = setting?.featureCardGrid ?? 3;
  } catch {
    // Optional promotional section — never break the home page if it can't load.
    return null;
  }

  if (cards.length === 0) return null;

  const gridClass = GRID_CLASS[cols] ?? GRID_CLASS[3];

  return (
    <section className="bg-cream py-16 sm:py-20">
      <Container>
        <div className={cn("grid gap-4", gridClass)}>
          {cards.map((card, i) => {
            const inner = (
              <>
                <img
                  src={card.image}
                  alt={card.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="font-display text-xl text-white drop-shadow sm:text-2xl">
                    {card.title}
                  </h3>
                  {card.subtitle && (
                    <p className="mt-1 text-sm text-white/90 drop-shadow">{card.subtitle}</p>
                  )}
                </div>
              </>
            );

            const cardClass =
              "group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-sand transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-forest/10";

            return (
              <Reveal key={card.id} delay={(i % cols) * 0.06}>
                {card.link ? (
                  <Link href={card.link} className={cardClass}>
                    {inner}
                  </Link>
                ) : (
                  <div className={cardClass}>{inner}</div>
                )}
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
