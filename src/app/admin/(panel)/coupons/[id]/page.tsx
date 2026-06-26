"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CouponForm } from "@/components/admin/CouponForm";
import type { TCouponForm } from "@/schema/coupon";

export default function EditCouponPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [coupon, setCoupon] = useState<(TCouponForm & { id: number }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/coupons/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.coupon) {
          const c = j.coupon;
          setCoupon({
            id: c.id,
            code: c.code,
            description: c.description ?? "",
            type: c.type,
            valuePaise: c.valuePaise,
            percent: c.percent,
            minOrderPaise: c.minOrderPaise,
            maxUses: c.maxUses,
            perEmailLimit: c.perEmailLimit,
            startsAt: c.startsAt ? c.startsAt.slice(0, 16) : null,
            expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : null,
            isActive: c.isActive,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>;
  if (!coupon) return <p className="py-12 text-muted">Coupon not found.</p>;

  return (
    <div className="space-y-6">
      <Link href="/admin/coupons" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest">
        <ArrowLeft className="h-4 w-4" /> Back to coupons
      </Link>
      <h1 className="text-2xl font-semibold text-ink">Edit: {coupon.code}</h1>
      <CouponForm mode="edit" couponId={coupon.id} defaultValues={coupon} />
    </div>
  );
}
