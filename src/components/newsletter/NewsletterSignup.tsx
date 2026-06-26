"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export function NewsletterSignup({ source = "footer" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message);
        setDone(true);
      } else {
        toast.error(json.error ?? "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <p className="text-sm text-cream/70">
        You&apos;re subscribed! We&apos;ll send you the good stuff.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="w-full max-w-xs rounded-lg border border-cream/20 bg-cream/10 px-3 py-2 text-sm text-cream placeholder-cream/40 outline-none focus:border-honey"
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-honey px-4 py-2 text-sm font-medium text-ink hover:bg-honey-dark disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </button>
    </form>
  );
}
