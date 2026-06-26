"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (value: number) => void;
};

const sizes = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" };

export function StarRating({ value, max = 5, size = "md", interactive = false, onChange }: Props) {
  return (
    <div className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(value);
        return interactive ? (
          <button
            key={i}
            type="button"
            onClick={() => onChange?.(i + 1)}
            className="focus:outline-none"
          >
            <Star
              className={cn(
                sizes[size],
                "transition-colors",
                filled ? "fill-honey text-honey" : "fill-none text-line hover:text-honey/50",
              )}
            />
          </button>
        ) : (
          <Star
            key={i}
            className={cn(
              sizes[size],
              filled ? "fill-honey text-honey" : "fill-none text-line",
            )}
          />
        );
      })}
    </div>
  );
}
