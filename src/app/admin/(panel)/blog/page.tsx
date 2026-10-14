"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Loader2, Plus, Pencil, Trash2, Globe, FileText } from "lucide-react";
import { toast } from "sonner";

type BlogPost = {
  id: number; slug: string; title: string; status: string;
  coverImage: string | null; publishedAt: string | null; createdAt: string;
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // isStale lets the effect drop a response superseded by a newer query or unmount.
  const load = useCallback((isStale: () => boolean = () => false) =>
    fetch("/api/admin/blog")
      .then((res) => res.json())
      .then((json) => {
        if (isStale()) return;
        setPosts(json.posts ?? []);
        setLoading(false);
      }), []);

  useEffect(() => {
    let stale = false;
    load(() => stale);
    return () => { stale = true; };
  }, [load]);

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Post deleted."); load(); }
    else toast.error("Delete failed.");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Blog</h1>
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-sm font-medium text-cream hover:bg-forest-dark"
        >
          <Plus className="h-4 w-4" /> New post
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
      ) : (
        <>
          <ul className="divide-y divide-line rounded-xl border border-line bg-paper md:hidden">
            {posts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/blog/${p.id}`} className="block truncate font-medium text-ink hover:text-forest-dark">{p.title}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <PostStatus status={p.status} />
                    {p.publishedAt && <span>{new Date(p.publishedAt).toLocaleDateString("en-IN")}</span>}
                  </div>
                </div>
                <RowActions href={`/admin/blog/${p.id}`} label={p.title} onDelete={() => handleDelete(p.id, p.title)} className="flex-col" />
              </li>
            ))}
            {posts.length === 0 && <li className="px-3 py-5 text-center text-sm text-muted">No posts yet.</li>}
          </ul>
          <div className="hidden overflow-x-auto rounded-xl border border-line bg-paper md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-3 py-1.5">Title</th>
                  <th className="px-3 py-1.5">Status</th>
                  <th className="px-3 py-1.5">Published</th>
                  <th className="px-3 py-1.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0 hover:bg-cream/50">
                    <td className="px-3 py-1.5">
                      <Link href={`/admin/blog/${p.id}`} className="font-medium text-ink hover:text-forest-dark">{p.title}</Link>
                      <p className="text-xs text-muted">{p.slug}</p>
                    </td>
                    <td className="px-3 py-1.5"><PostStatus status={p.status} /></td>
                    <td className="px-3 py-1.5 text-xs text-muted">
                      {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <RowActions href={`/admin/blog/${p.id}`} label={p.title} onDelete={() => handleDelete(p.id, p.title)} className="justify-end" />
                    </td>
                  </tr>
                ))}
                {posts.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-5 text-center text-muted">No posts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function PostStatus({ status }: { status: string }) {
  return status === "PUBLISHED" ? (
    <span className="inline-flex items-center gap-1 text-xs text-forest"><Globe className="h-3 w-3" /> Published</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-muted"><FileText className="h-3 w-3" /> Draft</span>
  );
}

function RowActions({ href, label, onDelete, className }: { href: string; label: string; onDelete: () => void; className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      <Link href={href} aria-label={`Edit ${label}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sand hover:text-ink">
        <Pencil className="h-3.5 w-3.5" />
      </Link>
      <button type="button" onClick={onDelete} aria-label={`Delete ${label}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-clay/10 hover:text-clay">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
