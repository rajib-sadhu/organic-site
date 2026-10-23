"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, MailWarning } from "lucide-react";
import { useAccount } from "@/store/account";
import { postJson } from "./ui";

export function LogoutButton() {
  const router = useRouter();
  const refresh = useAccount((s) => s.refresh);
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await postJson("/api/account/logout").catch(() => {});
        await refresh();
        router.replace("/");
        router.refresh();
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-medium text-ink hover:bg-cream disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" /> Log out
    </button>
  );
}

export function VerifyBanner({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-honey/40 bg-honey/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm text-ink">
        <MailWarning className="mt-0.5 h-4 w-4 shrink-0 text-honey" />
        <span>
          Confirm <span className="font-medium">{email}</span> to see earlier orders placed with it. Check your inbox for our link.
        </span>
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            await postJson("/api/account/verify/resend");
            toast.success("We sent a new confirmation link.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Couldn't send the link.");
          } finally {
            setLoading(false);
          }
        }}
        className="h-9 shrink-0 rounded-full bg-forest px-4 text-sm font-medium text-cream hover:bg-forest-dark disabled:opacity-60"
      >
        Resend link
      </button>
    </div>
  );
}
