"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, SubmitButton, inputCn, postJson } from "./ui";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return toast.error("Use at least 8 characters.");
    setLoading(true);
    try {
      await postJson("/api/account/password", { currentPassword: hasPassword ? current : undefined, newPassword: next });
      toast.success(hasPassword ? "Password changed. Other devices were logged out." : "Password set. You can now log in with it.");
      setCurrent("");
      setNext("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!hasPassword && <p className="text-sm text-muted">You log in with email codes. Set a password to log in with it too.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {hasPassword && (
          <Field label="Current password">
            <input type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputCn} />
          </Field>
        )}
        <Field label={hasPassword ? "New password" : "Password"}>
          <input type="password" required autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputCn} placeholder="At least 8 characters" />
        </Field>
      </div>
      <div className="sm:w-48"><SubmitButton loading={loading}>{hasPassword ? "Change password" : "Set password"}</SubmitButton></div>
    </form>
  );
}
