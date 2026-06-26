import { Leaf, Truck, ShieldCheck, Sprout } from "lucide-react";
import { Container } from "@/components/ui/Container";

const ITEMS = [
  { icon: Leaf, title: "100% Organic", text: "No pesticides or additives" },
  { icon: Sprout, title: "Farm sourced", text: "Direct from trusted growers" },
  { icon: Truck, title: "Fresh delivery", text: "Free shipping over ₹499" },
  { icon: ShieldCheck, title: "Quality assured", text: "Lab-tested, certified pure" },
];

export function TrustStrip() {
  return (
    <section className="border-y border-line bg-paper">
      <Container>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-8 py-10 lg:grid-cols-4">
          {ITEMS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-leaf-soft text-forest">
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <p className="font-medium text-ink">{title}</p>
                <p className="text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
