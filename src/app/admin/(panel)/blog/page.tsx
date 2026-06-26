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

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/blog");
    const json = await res.json();
    setPosts(json.posts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Post deleted."); load(); }
    else toast.error("Delete failed.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Blog</h1>
        <Link
          href="/admin/blog/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-cream hover:bg-forest-dark"
        >
          <Plus className="h-4 w-4" /> New post
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-paper">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Published</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-cream/50">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/blog/${p.id}`} className="font-medium text-ink hover:text-forest-dark">{p.title}</Link>
                    <p className="text-xs text-muted">{p.slug}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    {p.status === "PUBLISHED" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-forest"><Globe className="h-3 w-3" /> Published</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted"><FileText className="h-3 w-3" /> Draft</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/blog/${p.id}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-sand hover:text-ink">
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button type="button" onClick={() => handleDelete(p.id, p.title)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-clay/10 hover:text-clay">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No posts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
