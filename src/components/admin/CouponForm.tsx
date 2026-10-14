"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { couponSchema, type TCouponForm } from "@/schema/coupon";
import { InfoTip } from "./InfoTip";
import { useState } from "react";

type Props = {
  mode: "create" | "edit";
  couponId?: number;
  defaultValues?: TCouponForm;
};

export function CouponForm({ mode, couponId, defaultValues }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TCouponForm>({
    resolver: zodResolver(couponSchema),
    defaultValues: defaultValues ?? {
      code: "",
      description: "",
      type: "PERCENT",
      valuePaise: null,
      percent: 10,
      minOrderPaise: 0,
      maxUses: null,
      perEmailLimit: null,
      startsAt: null,
      expiresAt: null,
      isActive: true,
    },
  });

  const couponType = useWatch({ control, name: "type" });

  const onSubmit = async (data: TCouponForm) => {
    setSaving(true);
    try {
      const url = mode === "edit" ? `/api/admin/coupons/${couponId}` : "/api/admin/coupons";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, code: data.code.toUpperCase() }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Save failed.");
        return;
      }
      toast.success(mode === "edit" ? "Coupon updated." : "Coupon created.");
      router.push("/admin/coupons");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-line bg-paper p-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Code" tip="Unique coupon code customers enter at checkout (auto-uppercased)" error={errors.code?.message}>
          <input {...register("code")} className="input font-mono uppercase" placeholder="SUMMER20" />
        </Field>

        <Field className="sm:col-span-2" label="Description" tip="Internal note — only visible to admins, not shown to customers" error={errors.description?.message}>
          <textarea {...register("description")} rows={2} className="input" placeholder="e.g. Summer sale — 20% off on all orders above ₹500" />
        </Field>

        <Field label="Type" tip="Percentage = % off subtotal, Flat = fixed amount off, Free shipping = waives shipping fee" error={errors.type?.message}>
          <select {...register("type")} className="input">
            <option value="PERCENT">Percentage</option>
            <option value="FLAT">Flat amount</option>
            <option value="FREE_SHIP">Free shipping</option>
          </select>
        </Field>

        {couponType === "PERCENT" && (
          <Field label="Percent (0-100)" tip="Percentage discount applied to the order subtotal" error={errors.percent?.message}>
            <input type="number" {...register("percent", { valueAsNumber: true })} className="input" placeholder="10" />
          </Field>
        )}
        {couponType === "FLAT" && (
          <Field label="Discount (paise)" tip="Flat discount in paise. 10000 paise = ₹100" error={errors.valuePaise?.message}>
            <input type="number" {...register("valuePaise", { valueAsNumber: true })} className="input" placeholder="10000" />
          </Field>
        )}

        <Field label="Min order (paise)" tip="Minimum order value required to use this coupon. 0 = no minimum" error={errors.minOrderPaise?.message}>
          <input type="number" {...register("minOrderPaise", { valueAsNumber: true })} className="input" placeholder="0" />
        </Field>

        <div className="contents">
          <Field label="Max uses" tip="Total number of times this coupon can be used across all customers. Blank = unlimited">
            <input type="number" {...register("maxUses", { valueAsNumber: true })} className="input" placeholder="" />
          </Field>
          <Field label="Per-email limit" tip="How many times a single email address can use this coupon. Blank = unlimited">
            <input type="number" {...register("perEmailLimit", { valueAsNumber: true })} className="input" placeholder="" />
          </Field>
        </div>

        <div className="contents">
          <Field label="Starts at" tip="Coupon becomes valid from this date. Blank = active immediately">
            <input type="datetime-local" {...register("startsAt")} className="input" />
          </Field>
          <Field label="Expires at" tip="Coupon stops working after this date. Blank = never expires">
            <input type="datetime-local" {...register("expiresAt")} className="input" />
          </Field>
        </div>

        <label className="col-span-full flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("isActive")} className="accent-forest" />
          Active
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-forest px-3 py-1.5 text-sm font-medium text-cream hover:bg-forest-dark disabled:opacity-60"
      >
        {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : mode === "edit" ? "Save changes" : "Create coupon"}
      </button>
    </form>
  );
}

function Field({ label, tip, error, className, children }: { label: string; tip?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-muted">
        {label}
        {tip && <InfoTip text={tip} />}
      </label>
      {children}
      {error && <p className="mt-0.5 text-xs text-clay">{error}</p>}
    </div>
  );
}
