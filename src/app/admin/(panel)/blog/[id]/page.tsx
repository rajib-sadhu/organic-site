"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { BlogForm } from "@/components/admin/BlogForm";

export default function EditBlogPostPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [post, setPost] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/blog/${id}`)
      .then((r) => r.json())
      .then((j) => setPost(j.post ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>;
  if (!post) return <p className="py-8 text-muted">Post not found.</p>;

  return (
    <div className="space-y-4">
      <Link href="/admin/blog" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest">
        <ArrowLeft className="h-4 w-4" /> Back to blog
      </Link>
      <h1 className="text-2xl font-semibold text-ink">Edit: {post.title}</h1>
      <BlogForm
        mode="edit"
        postId={Number(id)}
        defaultValues={{
          title: post.title ?? "",
          slug: post.slug ?? "",
          excerpt: post.excerpt ?? "",
          body: post.body ?? "",
          coverImage: post.coverImage ?? "",
          status: post.status ?? "DRAFT",
          metaTitle: post.metaTitle ?? "",
          metaDescription: post.metaDescription ?? "",
        }}
      />
    </div>
  );
}
