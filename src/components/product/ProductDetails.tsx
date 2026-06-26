"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  description: string;
  highlights: string[];
  benefits: string[];
  howToUse: string | null;
  ingredients: string | null;
  nutritionInfo: Record<string, string> | null;
  shelfLife: string | null;
  storage: string | null;
};

type Tab = "description" | "nutrition" | "details";

export function ProductDetails(props: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("description");

  const hasNutrition = props.nutritionInfo && Object.keys(props.nutritionInfo).length > 0;
  const hasDetails = props.ingredients || props.shelfLife || props.storage || props.howToUse;

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "description", label: "Description", show: true },
    { key: "nutrition", label: "Nutrition", show: !!hasNutrition },
    { key: "details", label: "Details", show: !!hasDetails },
  ];

  return (
    <div className="mt-12">
      {/* Highlights bar */}
      {props.highlights.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {props.highlights.map((h, i) => (
            <span key={i} className="rounded-full border border-forest/20 bg-leaf-soft px-3 py-1 text-xs font-medium text-forest">
              {h}
            </span>
          ))}
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-line">
        {tabs.filter((t) => t.show).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "border-b-2 border-forest text-forest"
                : "text-muted hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="py-6">
        {activeTab === "description" && (
          <div className="space-y-6">
            <p className="leading-relaxed text-muted">{props.description}</p>

            {props.benefits.length > 0 && (
              <div>
                <h3 className="mb-3 font-display text-lg text-forest-dark">Benefits</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {props.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-forest" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {props.howToUse && (
              <div>
                <h3 className="mb-2 font-display text-lg text-forest-dark">How to use</h3>
                <p className="text-sm leading-relaxed text-muted">{props.howToUse}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "nutrition" && props.nutritionInfo && (
          <div className="max-w-sm">
            <h3 className="mb-3 font-display text-lg text-forest-dark">Nutritional Information</h3>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(props.nutritionInfo).map(([key, value]) => (
                  <tr key={key} className="border-b border-line last:border-0">
                    <td className="py-2 text-muted">{key}</td>
                    <td className="py-2 text-right font-medium text-ink">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "details" && (
          <div className="space-y-4 text-sm">
            {props.ingredients && (
              <div>
                <h3 className="mb-1 font-semibold text-ink">Ingredients</h3>
                <p className="text-muted">{props.ingredients}</p>
              </div>
            )}
            {props.shelfLife && (
              <div>
                <h3 className="mb-1 font-semibold text-ink">Shelf life</h3>
                <p className="text-muted">{props.shelfLife}</p>
              </div>
            )}
            {props.storage && (
              <div>
                <h3 className="mb-1 font-semibold text-ink">Storage</h3>
                <p className="text-muted">{props.storage}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
