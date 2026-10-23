"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registerSchema, registerNoPasswordSchema, type RegisterInput } from "@/schema/account";
import { useAccount, type PasswordLoginMode } from "@/store/account";
import { Field, SubmitButton, inputCn, postJson } from "./ui";

type FormValues = RegisterInput | { name: string; email: string };

export function RegisterForm({ next, passwordMode }: { next: string; passwordMode?: PasswordLoginMode }) {
  const router = useRouter();
  const refresh = useAccount((s) => s.refresh);
  const storeMode = useAccount((s) => s.passwordLogin);
  const showPassword = (passwordMode ?? storeMode) !== "OFF";
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(showPassword ? registerSchema : registerNoPasswordSchema),
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      await postJson("/api/account/register", data);
      await refresh();
      toast.success(showPassword ? "Account created. Check your email to confirm your address." : "Account created! Check your email to verify.");
      router.replace(next);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Name" error={errors.name?.message}>
        <input autoComplete="name" {...register("name")} className={inputCn} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <input type="email" autoComplete="email" {...register("email")} className={inputCn} />
      </Field>
      {showPassword && (
        <Field label="Password" error={"password" in errors ? errors.password?.message : undefined}>
          <input type="password" autoComplete="new-password" {...register("password" as keyof FormValues)} className={inputCn} placeholder="At least 8 characters" />
        </Field>
      )}
      <SubmitButton loading={loading}>Create account</SubmitButton>
    </form>
  );
}
