"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

type Review = {
  id: number; authorName: string; rating: number; title: string | null;
  body: string; isVerified: boolean; status: string;
  product: { name: string; slug: string }; createdAt: string;
};

const TABS = ["PENDING", "APPROVED", "REJECTED"];

export default function AdminReviewsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const statusFilter = searchParams.get("status") ?? "PENDING";

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/reviews?status=${statusFilter}`);
    const json = await res.json();
    setReviews(json.reviews ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const moderate = async (id: number, status: string) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        toast.success(`Review ${status.toLowerCase()}.`);
        setReviews((prev) => prev.filter((r) => r.id !== id));
        setTotal((t) => t - 1);
      } else {
        toast.error("Action failed.");
      }
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Reviews</h1>

      <div className="flex gap-2">
        {TABS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => router.push(`/admin/reviews?status=${s}`)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === s ? "bg-forest text-cream" : "bg-sand text-muted hover:bg-line",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted">{total} review{total !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
      ) : reviews.length === 0 ? (
        <p className="py-8 text-center text-muted">No {statusFilter.toLowerCase()} reviews.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-line bg-paper p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={cn("h-3.5 w-3.5", i < r.rating ? "fill-honey text-honey" : "text-line")} />
                      ))}
                    </div>
                    {r.title && <span className="font-medium text-ink">{r.title}</span>}
                    {r.isVerified && <span className="text-xs text-forest">Verified</span>}
                  </div>
                  <p className="mt-2 text-sm text-muted">{r.body}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <span className="font-medium text-ink">{r.authorName}</span>
                    <span>on</span>
                    <span className="font-medium text-forest-dark">{r.product.name}</span>
                    <span>·</span>
                    <span>{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>

                {statusFilter === "PENDING" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={updating === r.id}
                      onClick={() => moderate(r.id, "APPROVED")}
                      className="inline-flex items-center gap-1 rounded-lg bg-forest px-3 py-1.5 text-xs font-medium text-cream hover:bg-forest-dark disabled:opacity-60"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      type="button"
                      disabled={updating === r.id}
                      onClick={() => moderate(r.id, "REJECTED")}
                      className="inline-flex items-center gap-1 rounded-lg border border-clay/30 px-3 py-1.5 text-xs font-medium text-clay hover:bg-clay/5 disabled:opacity-60"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
