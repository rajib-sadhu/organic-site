"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { Field, SubmitButton, inputCn, postJson } from "./ui";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await postJson("/api/account/forgot", { email });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <MailCheck className="mx-auto h-10 w-10 text-forest" />
        <p className="mt-3 text-sm text-ink">
          If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent a link to reset the password. It expires in 1 hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Email">
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCn} />
      </Field>
      <SubmitButton loading={loading}>Send reset link</SubmitButton>
    </form>
  );
}
