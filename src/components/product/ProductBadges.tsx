import { Flame, TrendingUp, Sparkles, Award, Clock } from "lucide-react";
import { cn } from "@/lib/cn";

// `bg`/`text` = soft style for plain backgrounds; `solid` = opaque style for badges laid over photos.
const BADGE_CONFIG: Record<string, { label: string; icon: typeof Flame; bg: string; text: string; solid: string }> = {
  BESTSELLER: { label: "Bestseller", icon: Flame, bg: "bg-clay/10", text: "text-clay", solid: "bg-clay text-cream" },
  TOP_RATED: { label: "Top Rated", icon: Award, bg: "bg-honey/15", text: "text-honey-dark", solid: "bg-honey text-forest-dark" },
  NEW_ARRIVAL: { label: "New Arrival", icon: Sparkles, bg: "bg-forest/10", text: "text-forest", solid: "bg-forest text-cream" },
  TRENDING: { label: "Trending", icon: TrendingUp, bg: "bg-blue-50", text: "text-blue-700", solid: "bg-blue-600 text-white" },
  LIMITED: { label: "Limited Edition", icon: Clock, bg: "bg-clay/10", text: "text-clay", solid: "bg-clay text-cream" },
  NUMBER_ONE: { label: "#1 Pick", icon: Award, bg: "bg-honey/15", text: "text-honey-dark", solid: "bg-honey text-forest-dark" },
};

export function ProductBadges({
  tags,
  size = "sm",
  variant = "soft",
}: {
  tags: string[];
  size?: "sm" | "md";
  variant?: "soft" | "solid";
}) {
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
              variant === "solid" ? cn(config.solid, "shadow-sm") : cn(config.bg, config.text),
              size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
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
