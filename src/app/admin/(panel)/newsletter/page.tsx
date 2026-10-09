"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, UserCheck } from "lucide-react";

type Subscriber = {
  id: number; email: string; isConfirmed: boolean;
  source: string | null; createdAt: string; unsubAt: string | null;
};

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/newsletter")
      .then((r) => r.json())
      .then((json) => {
        setSubscribers(json.subscribers ?? []);
        setTotal(json.total ?? 0);
        setActiveCount(json.activeCount ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Newsletter</h1>

      <div className="grid gap-4 sm:grid-cols-2 max-w-md">
        <div className="rounded-xl border border-line bg-paper p-5">
          <div className="flex items-center gap-2 text-sm text-muted"><Users className="h-4 w-4" /> Total</div>
          <p className="mt-1 text-2xl font-semibold text-ink">{total}</p>
        </div>
        <div className="rounded-xl border border-line bg-paper p-5">
          <div className="flex items-center gap-2 text-sm text-muted"><UserCheck className="h-4 w-4" /> Active</div>
          <p className="mt-1 text-2xl font-semibold text-forest-dark">{activeCount}</p>
        </div>
      </div>

      <ul className="divide-y divide-line rounded-xl border border-line bg-paper md:hidden">
        {subscribers.map((s) => (
          <li key={s.id} className="p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate font-medium text-ink">{s.email}</span>
              <SubStatus unsubscribed={!!s.unsubAt} />
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {s.source ?? "—"} · {new Date(s.createdAt).toLocaleDateString("en-IN")}
            </p>
          </li>
        ))}
        {subscribers.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">No subscribers yet.</li>}
      </ul>
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-paper md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 font-medium text-ink">{s.email}</td>
                <td className="px-4 py-2.5 text-muted">{s.source ?? "—"}</td>
                <td className="px-4 py-2.5"><SubStatus unsubscribed={!!s.unsubAt} /></td>
                <td className="px-4 py-2.5 text-xs text-muted">
                  {new Date(s.createdAt).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
            {subscribers.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No subscribers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubStatus({ unsubscribed }: { unsubscribed: boolean }) {
  return unsubscribed ? (
    <span className="shrink-0 text-xs text-clay">Unsubscribed</span>
  ) : (
    <span className="shrink-0 text-xs text-forest">Active</span>
  );
}
