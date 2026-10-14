"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, KeyRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAccount, type PasswordLoginMode } from "@/store/account";
import { Field, SubmitButton, TextLink, inputCn, postJson } from "./ui";

type Tab = "password" | "code";

export function LoginForm({ next, passwordMode }: { next: string; passwordMode?: PasswordLoginMode }) {
  const router = useRouter();
  const refresh = useAccount((s) => s.refresh);
  const storeMode = useAccount((s) => s.passwordLogin);
  const showPassword = (passwordMode ?? storeMode) !== "OFF";
  const [tab, setTab] = useState<Tab>(showPassword ? "password" : "code");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const done = async (message: string) => {
    await refresh();
    toast.success(message);
    router.replace(next);
    router.refresh();
  };

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onPassword = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await postJson("/api/account/login", { email, password });
      await done("Welcome back!");
    });
  };

  const onSendCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    run(async () => {
      await postJson("/api/account/code/send", { email });
      setCodeSentTo(email);
      setCode("");
      toast.success(`We emailed a 6-digit code to ${email}.`);
    });
  };

  const onVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const { created } = await postJson<{ created: boolean }>("/api/account/code/verify", { email: codeSentTo, code });
      await done(created ? "Your account is ready!" : "Welcome back!");
    });
  };

  const codeForm = codeSentTo ? (
    <form onSubmit={onVerifyCode} className="space-y-4">
      <p className="text-sm text-muted">
        Enter the code we sent to <span className="font-medium text-ink">{codeSentTo}</span>.
      </p>
      <Field label="6-digit code">
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className={cn(inputCn, "text-center font-mono text-lg tracking-[0.5em]")}
        />
      </Field>
      <SubmitButton loading={loading} disabled={code.length !== 6}>Log in</SubmitButton>
      <div className="flex justify-between text-sm">
        <button type="button" onClick={() => setCodeSentTo(null)} className="text-muted hover:text-ink">Use another email</button>
        <button type="button" onClick={() => onSendCode()} disabled={loading} className="font-medium text-forest hover:text-forest-dark">Resend code</button>
      </div>
    </form>
  ) : (
    <form onSubmit={onSendCode} className="space-y-4">
      <p className="text-sm text-muted">No password needed. New here? This creates your account.</p>
      <Field label="Email">
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCn} />
      </Field>
      <SubmitButton loading={loading}>Send code</SubmitButton>
    </form>
  );

  if (!showPassword) return <div>{codeForm}</div>;

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-cream p-1 text-sm">
        {([["password", "Password", KeyRound], ["code", "Email me a code", Mail]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 rounded-full font-medium transition-colors",
              tab === key ? "bg-forest text-cream" : "text-muted hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "password" ? (
        <form onSubmit={onPassword} className="space-y-4">
          <Field label="Email">
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCn} />
          </Field>
          <Field label="Password" hint={<TextLink href="/account/forgot">Forgot?</TextLink>}>
            <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCn} />
          </Field>
          <SubmitButton loading={loading}>Log in</SubmitButton>
        </form>
      ) : codeForm}
    </div>
  );
}
