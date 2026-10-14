"use client";

import { useEffect, useRef } from "react";
import { track, type EcommerceEvent } from "@/lib/analytics";
import { useConsent } from "./Analytics";

/** Fires one e-commerce event when a server-rendered page mounts (or once consent is given on it). */
export function TrackEvent({ event, params }: { event: EcommerceEvent; params: Record<string, unknown> }) {
  const consent = useConsent();
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || consent !== "granted") return;
    sent.current = true;
    track(event, params);
  }, [consent, event, params]);
  return null;
}
