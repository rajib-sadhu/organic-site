"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { InfoTip } from "./InfoTip";

type BlogFormData = {
  title: string; slug: string; excerpt: string; body: string;
  coverImage: string; status: string;
  metaTitle: string; metaDescription: string;
};

type Props = {
  mode: "create" | "edit";
  postId?: number;
  defaultValues?: BlogFormData;
};

export function BlogForm({ mode, postId, defaultValues }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<BlogFormData>(
    defaultValues ?? {
      title: "", slug: "", excerpt: "", body: "",
      coverImage: "", status: "DRAFT",
      metaTitle: "", metaDescription: "",
    },
  );

  const set = <K extends keyof BlogFormData>(key: K, value: BlogFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (mode === "create" && form.title) {
      const slug = form.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      set("slug", slug);
    }
  }, [form.title, mode]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/blog/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Upload failed.");
        return;
      }
      set("coverImage", json.url);
      toast.success("Image uploaded.");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.slug || !form.body) {
      toast.error("Title, slug, and body are required.");
      return;
    }
    setSaving(true);
    try {
      const url = mode === "edit" ? `/api/admin/blog/${postId}` : "/api/admin/blog";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Save failed.");
        return;
      }
      toast.success(mode === "edit" ? "Post updated." : "Post created.");
      if (mode === "create" && json.post?.id) {
        router.push(`/admin/blog/${json.post.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-line bg-paper p-5 space-y-4">
            <Field label="Title" tip="Blog post title shown on the page and in search results">
              <input value={form.title} onChange={(e) => set("title", e.target.value)} className="input" placeholder="10 Ways to Use Turmeric" />
            </Field>
            <Field label="Slug" tip="URL-friendly identifier, auto-generated from title. e.g. /blog/10-ways-to-use-turmeric">
              <input value={form.slug} onChange={(e) => set("slug", e.target.value)} className="input" placeholder="10-ways-to-use-turmeric" />
            </Field>
            <Field label="Excerpt" tip="Short summary shown on blog listing cards and in search results">
              <textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} className="input" placeholder="Short summary..." />
            </Field>
            <Field label="Body (HTML)" tip="Full post content in HTML. Use <p>, <h2>, <ul> etc.">
              <textarea value={form.body} onChange={(e) => set("body", e.target.value)} rows={16} className="input font-mono text-xs" placeholder="<p>Write your post content...</p>" />
            </Field>
          </div>

          <div className="rounded-xl border border-line bg-paper p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink">SEO</h2>
            <Field label="Meta title" tip="Custom page title for search engines. Falls back to post title if blank">
              <input value={form.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} className="input" />
            </Field>
            <Field label="Meta description" tip="Description shown in Google search results. Keep under 160 characters">
              <textarea value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} rows={2} className="input" />
            </Field>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-paper p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink">Publish</h2>
            <Field label="Status" tip="Draft = only visible to admins, Published = live on the website">
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className="input">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </Field>

            <Field label="Cover image" tip="Featured image shown on the blog listing and at the top of the post">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 shrink-0 text-muted" />
                  <input
                    value={form.coverImage}
                    onChange={(e) => set("coverImage", e.target.value)}
                    className="input"
                    placeholder="Paste image URL..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-sand px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-line disabled:opacity-60"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {uploading ? "Uploading..." : "Upload file"}
                  </button>
                </div>
                {form.coverImage && (
                  <img
                    src={form.coverImage}
                    alt="Cover preview"
                    className="mt-2 h-32 w-full rounded-lg object-cover border border-line"
                  />
                )}
              </div>
            </Field>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-forest py-2.5 text-sm font-medium text-cream hover:bg-forest-dark disabled:opacity-60"
          >
            {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : mode === "edit" ? "Save changes" : "Create post"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">
        {label}
        {tip && <InfoTip text={tip} />}
      </label>
      {children}
    </div>
  );
}
