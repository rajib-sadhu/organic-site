"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, CheckCircle2 } from "lucide-react";
import { useAccount } from "@/store/account";
import { SubmitButton, inputCn, postJson } from "./ui";

/** After a guest checkout: one password field turns the order's details into an account. */
export function CreateAccountFromOrder({ token }: { token: string }) {
  const router = useRouter();
  const loaded = useAccount((s) => s.loaded);
  const mode = useAccount((s) => s.mode);
  const customer = useAccount((s) => s.customer);
  const refresh = useAccount((s) => s.refresh);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [exists, setExists] = useState(false);

  if (!loaded || mode === "OFF" || (customer && !created)) return null;

  if (created) {
    return (
      <div className="mt-8 rounded-2xl border border-line bg-paper p-5 text-left">
        <p className="flex items-center gap-2 font-medium text-forest">
          <CheckCircle2 className="h-5 w-5" /> Account created
        </p>
        <p className="mt-1 text-sm text-muted">This order is in your account. Confirm your email from the link we sent to finish setting up.</p>
      </div>
    );
  }

  if (exists) {
    return (
      <div className="mt-8 rounded-2xl border border-line bg-paper p-5 text-left text-sm text-muted">
        You already have an account with this email.{" "}
        <Link href="/account/login?next=/account" className="font-medium text-forest hover:text-forest-dark">Log in</Link> to see this order with your others.
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters.");
    setLoading(true);
    try {
      await postJson("/api/account/from-order", { token, password });
      setCreated(true);
      await refresh();
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      if (message.includes("already exists")) setExists(true);
      else toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 rounded-2xl border border-line bg-paper p-5 text-left">
      <p className="flex items-center gap-2 font-medium text-forest-dark">
        <UserPlus className="h-5 w-5 text-forest" /> Save your details for next time
      </p>
      <p className="mt-1 text-sm text-muted">Set a password to create an account with this order&apos;s email and address. You&apos;ll see this order in your history.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Choose a password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCn}
        />
        <div className="sm:w-44"><SubmitButton loading={loading}>Create account</SubmitButton></div>
      </div>
    </form>
  );
}
