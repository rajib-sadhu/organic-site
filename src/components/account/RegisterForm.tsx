"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registerSchema, type RegisterInput } from "@/schema/account";
import { useAccount } from "@/store/account";
import { Field, SubmitButton, inputCn, postJson } from "./ui";

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const refresh = useAccount((s) => s.refresh);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    try {
      await postJson("/api/account/register", data);
      await refresh();
      toast.success("Account created. Check your email to confirm your address.");
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
      <Field label="Password" error={errors.password?.message}>
        <input type="password" autoComplete="new-password" {...register("password")} className={inputCn} placeholder="At least 8 characters" />
      </Field>
      <SubmitButton loading={loading}>Create account</SubmitButton>
    </form>
  );
}
