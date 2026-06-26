"use client";

import { CheckCircle, Circle, Package, Truck, Home, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Status = "PENDING" | "CONFIRMED" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";

const STEPS: { key: Status; label: string; icon: typeof CheckCircle }[] = [
  { key: "CONFIRMED", label: "Confirmed", icon: CheckCircle },
  { key: "PACKED", label: "Packed", icon: Package },
  { key: "SHIPPED", label: "Shipped", icon: Truck },
  { key: "DELIVERED", label: "Delivered", icon: Home },
];

const statusIndex: Record<Status, number> = {
  PENDING: -1,
  CONFIRMED: 0,
  PACKED: 1,
  SHIPPED: 2,
  DELIVERED: 3,
  CANCELLED: -2,
  REFUNDED: -2,
};

export function OrderTimeline({ status }: { status: Status }) {
  const idx = statusIndex[status] ?? -1;
  const isCancelled = status === "CANCELLED" || status === "REFUNDED";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-clay/10 px-4 py-3 text-clay">
        <XCircle className="h-5 w-5" />
        <span className="text-sm font-semibold">{status === "CANCELLED" ? "Order Cancelled" : "Order Refunded"}</span>
      </div>
    );
  }

  if (status === "PENDING") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-honey/10 px-4 py-3 text-honey-dark">
        <Circle className="h-5 w-5" />
        <span className="text-sm font-semibold">Awaiting payment confirmation</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      {STEPS.map((step, i) => {
        const done = i <= idx;
        const current = i === idx;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-full",
                  done ? "bg-forest text-cream" : "bg-sand text-muted",
                  current && "ring-2 ring-forest/30 ring-offset-2",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className={cn("text-xs font-medium", done ? "text-forest-dark" : "text-muted")}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("mx-1 h-0.5 flex-1 rounded", i < idx ? "bg-forest" : "bg-sand")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
