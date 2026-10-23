"use client";

import { useEffect, useSyncExternalStore } from "react";
import { CONSENT_EVENT, getConsent, loadAnalytics, revokeAnalytics, type Consent } from "@/lib/analytics";

function subscribe(cb: () => void) {
  window.addEventListener(CONSENT_EVENT, cb);
  window.addEventListener("storage", cb); // choice made in another tab
  return () => {
    window.removeEventListener(CONSENT_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The visitor's choice; "unknown" during SSR/hydration so nothing renders until we can read it. */
export function useConsent(): Consent | null | "unknown" {
  return useSyncExternalStore(subscribe, getConsent, () => "unknown");
}

/** Loads GA4 and/or GTM only after the visitor accepts; switches storage off again if they later decline. */
export function Analytics() {
  const consent = useConsent();
  useEffect(() => {
    if (consent === "granted") loadAnalytics();
    else if (consent === "denied") revokeAnalytics();
  }, [consent]);
  return null;
}
