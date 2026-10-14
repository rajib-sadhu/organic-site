"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useAccount } from "@/store/account";
import { postJson } from "./ui";

/**
 * Verifies on mount with a POST, not during the GET render, so link scanners that
 * prefetch email links don't consume it before the customer clicks.
 */
export function VerifyEmail({ token }: { token: string }) {
  const refresh = useAccount((s) => s.refresh);
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    postJson("/api/account/verify", { token })
      .then(() => { setState("ok"); refresh(); })
      .catch((e) => { setState("error"); setMessage(e instanceof Error ? e.message : "This link is invalid."); });
  }, [token, refresh]);

  if (state === "working") {
    return <p className="flex items-center justify-center gap-2 text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Confirming your email…</p>;
  }
  return (
    <div className="text-center">
      {state === "ok" ? (
        <>
          <CheckCircle2 className="mx-auto h-10 w-10 text-forest" />
          <p className="mt-3 text-ink">Your email is confirmed. Earlier orders placed with it now appear in your account.</p>
        </>
      ) : (
        <>
          <XCircle className="mx-auto h-10 w-10 text-clay" />
          <p className="mt-3 text-ink">{message}</p>
          <p className="mt-1 text-sm text-muted">You can send a new link from your account page.</p>
        </>
      )}
      <Link href="/account" className="mt-6 inline-flex h-11 items-center rounded-full bg-forest px-6 text-sm font-medium text-cream hover:bg-forest-dark">
        Go to my account
      </Link>
    </div>
  );
}
