"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  const unsubscribe = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/cart/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Something went wrong. Please try again.");
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <div className="mt-8 space-y-6">
        <p className="inline-flex items-center gap-2 font-medium text-forest">
          <CheckCircle className="h-5 w-5" /> You won&apos;t get cart reminders any more.
        </p>
        <div>
          <Link href="/products" className="text-sm text-muted underline-offset-2 hover:text-forest hover:underline">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={unsubscribe}
      disabled={state === "loading"}
      className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-forest px-7 text-sm font-medium text-cream transition-colors hover:bg-forest-dark disabled:opacity-60"
    >
      {state === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
      Stop cart reminders
    </button>
  );
}
