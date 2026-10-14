"use client";

import Link from "next/link";
import { Cookie } from "lucide-react";
import { analyticsEnabled, setConsent } from "@/lib/analytics";
import { useConsent } from "./Analytics";

export function ConsentBanner() {
  const consent = useConsent();
  if (!analyticsEnabled || consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-4 bottom-4 z-[60] rounded-2xl border border-line bg-paper p-4 shadow-xl shadow-forest/10 sm:left-6 sm:right-auto sm:max-w-sm"
    >
      <div className="flex gap-3">
        <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-honey" />
        <p className="text-sm text-ink">
          We use analytics cookies to understand how the shop is used and improve it. No advertising cookies.{" "}
          <Link href="/privacy-policy" className="text-forest underline underline-offset-2">Privacy policy</Link>
        </p>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setConsent("denied")}
          className="h-9 rounded-full border border-line px-4 text-sm font-medium text-ink hover:bg-cream"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => setConsent("granted")}
          className="h-9 rounded-full bg-forest px-4 text-sm font-medium text-cream hover:bg-forest-dark"
        >
          Accept
        </button>
      </div>
    </div>
  );
}

/** Footer link that clears the saved choice so the banner shows again. */
export function CookiePreferencesButton({ className }: { className?: string }) {
  if (!analyticsEnabled) return null;
  return (
    <button type="button" onClick={() => setConsent(null)} className={className}>
      Cookie preferences
    </button>
  );
}

