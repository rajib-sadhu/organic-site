"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAccount } from "@/store/account";
import { Field, SubmitButton, inputCn, postJson } from "./ui";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const refresh = useAccount((s) => s.refresh);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters.");
    if (password !== confirm) return toast.error("The passwords don't match.");
    setLoading(true);
    try {
      await postJson("/api/account/reset", { token, password });
      await refresh();
      toast.success("Password updated. You're logged in.");
      router.replace("/account");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="New password">
        <input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCn} placeholder="At least 8 characters" />
      </Field>
      <Field label="Confirm new password" error={mismatch ? "The passwords don't match." : undefined}>
        <input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCn} />
      </Field>
      <SubmitButton loading={loading}>Set new password</SubmitButton>
    </form>
  );
}
