import { Truck, ShieldCheck, Heart, Banknote } from "lucide-react";

const badges = [
  { icon: Truck, label: "Free shipping", sub: "above ₹1,499" },
  { icon: ShieldCheck, label: "Secure", sub: "Payments" },
  { icon: Heart, label: "Farmers", sub: "Empowerment" },
  { icon: Banknote, label: "COD", sub: "available" },
];

export function TrustBadges() {
  return (
    <div className="flex flex-wrap gap-4">
      {badges.map((b) => {
        const Icon = b.icon;
        return (
          <div key={b.label} className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2.5">
            <Icon className="h-5 w-5 text-forest" />
            <div>
              <p className="text-xs font-semibold text-ink leading-tight">{b.label}</p>
              <p className="text-[10px] text-muted leading-tight">{b.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
