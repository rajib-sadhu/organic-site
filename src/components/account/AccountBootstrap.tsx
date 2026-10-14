"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "@/store/account";
import { useWishlist } from "@/store/wishlist";

/**
 * Loads the session once per page load and keeps the wishlist in step with it:
 * on login this browser's items are merged into the account, on logout they're cleared.
 */
export function AccountBootstrap() {
  const refresh = useAccount((s) => s.refresh);
  const loaded = useAccount((s) => s.loaded);
  const email = useAccount((s) => s.customer?.email ?? null);
  const lastEmail = useRef<string | null | undefined>(undefined);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!loaded || lastEmail.current === email) return;
    lastEmail.current = email;
    const wishlist = useWishlist.getState();

    if (!email) {
      if (wishlist.synced) wishlist.detachAccount();
      return;
    }
    // Merge local-only items (added while logged out) into the account, then adopt its list.
    const localIds = wishlist.synced ? [] : wishlist.items.map((i) => i.variantId);
    fetch("/api/account/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantIds: localIds }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.items) useWishlist.getState().attachAccount(j.items); })
      .catch(() => {});
  }, [loaded, email]);

  return null;
}
