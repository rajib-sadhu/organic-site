import { Flame, TrendingUp, Sparkles, Award, Clock } from "lucide-react";
import { cn } from "@/lib/cn";

const BADGE_CONFIG: Record<string, { label: string; icon: typeof Flame; bg: string; text: string }> = {
  BESTSELLER: { label: "Bestseller", icon: Flame, bg: "bg-clay/10", text: "text-clay" },
  TOP_RATED: { label: "Top Rated", icon: Award, bg: "bg-honey/15", text: "text-honey-dark" },
  NEW_ARRIVAL: { label: "New Arrival", icon: Sparkles, bg: "bg-forest/10", text: "text-forest" },
  TRENDING: { label: "Trending", icon: TrendingUp, bg: "bg-blue-50", text: "text-blue-700" },
  LIMITED: { label: "Limited Edition", icon: Clock, bg: "bg-clay/10", text: "text-clay" },
  NUMBER_ONE: { label: "#1 Pick", icon: Award, bg: "bg-honey/15", text: "text-honey-dark" },
};

export function ProductBadges({ tags, size = "sm" }: { tags: string[]; size?: "sm" | "md" }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const config = BADGE_CONFIG[tag];
        if (!config) return null;
        const Icon = config.icon;
        return (
          <span
            key={tag}
            className={cn(
              "inline-flex items-center gap-1 rounded-full font-semibold",
              config.bg,
              config.text,
              size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
            )}
          >
            <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
            {config.label}
          </span>
        );
      })}
    </div>
  );
}

export const AVAILABLE_TAGS = Object.keys(BADGE_CONFIG);
