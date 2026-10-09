"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, CheckCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { StarRating } from "./StarRating";

type Review = {
  id: number;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  isVerified: boolean;
  createdAt: string;
};

type Stats = { avg: number; count: number };

export function ReviewSection({ productId }: { productId: number }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats>({ avg: 0, count: 0 });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  // Key of the query whose results are on screen; loading until it matches the current query.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // isStale lets the effect drop a response superseded by a newer query or unmount.
  const load = useCallback((p: number, isStale: () => boolean = () => false) =>
    fetch(`/api/reviews?productId=${productId}&page=${p}`)
      .then((res) => res.json())
      .then((json) => {
        if (isStale()) return;
        setReviews(json.reviews ?? []);
        setStats(json.stats ?? { avg: 0, count: 0 });
        setPages(json.pages ?? 1);
        setLoadedKey(`${productId}|${p}`);
      }), [productId]);

  const loading = loadedKey !== `${productId}|${page}`;

  useEffect(() => {
    let stale = false;
    load(page, () => stale);
    return () => { stale = true; };
  }, [load, page]);

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-forest-dark">Customer reviews</h2>
          {stats.count > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <StarRating value={stats.avg} size="sm" />
              <span className="text-sm text-muted">
                {stats.avg.toFixed(1)} out of 5 ({stats.count} review{stats.count !== 1 ? "s" : ""})
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream hover:bg-forest-dark"
        >
          Write a review
        </button>
      </div>

      {showForm && (
        <ReviewForm
          productId={productId}
          onSubmitted={() => {
            setShowForm(false);
            load(1);
            setPage(1);
          }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
      ) : reviews.length === 0 ? (
        <p className="mt-8 text-center text-muted">No reviews yet. Be the first!</p>
      ) : (
        <div className="mt-8 space-y-6">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-line bg-paper p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StarRating value={r.rating} size="sm" />
                  {r.title && <span className="font-medium text-ink">{r.title}</span>}
                </div>
                {r.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs text-forest">
                    <CheckCircle className="h-3 w-3" /> Verified purchase
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{r.body}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                <span className="font-medium text-ink">{r.authorName}</span>
                <span>·</span>
                <span>{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-6 flex justify-center">
          {page < pages && (
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm text-muted hover:bg-sand"
            >
              <ChevronDown className="h-4 w-4" /> Load more reviews
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function ReviewForm({ productId, onSubmitted }: { productId: number; onSubmitted: () => void }) {
  const [rating, setRating] = useState(5);
  const [authorName, setAuthorName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName || !body || body.length < 10) {
      toast.error("Please fill in your name and review (min 10 characters).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, authorName, email: email || undefined, rating, title: title || undefined, body }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message ?? "Review submitted!");
        onSubmitted();
      } else {
        toast.error(json.error ?? "Submission failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-line bg-paper p-5 space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Your rating</label>
        <StarRating value={rating} size="lg" interactive onChange={setRating} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Name *</label>
          <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="input" placeholder="Your name" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Email (for verified badge)</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="your@email.com" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Title (optional)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Great product!" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Review *</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="input" placeholder="Tell others what you think..." required minLength={10} />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-forest px-6 py-2.5 text-sm font-medium text-cream hover:bg-forest-dark disabled:opacity-60"
      >
        {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Submit review"}
      </button>
    </form>
  );
}
