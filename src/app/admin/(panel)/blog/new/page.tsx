"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BlogForm } from "@/components/admin/BlogForm";

export default function NewBlogPostPage() {
  return (
    <div className="space-y-6">
      <Link href="/admin/blog" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest">
        <ArrowLeft className="h-4 w-4" /> Back to blog
      </Link>
      <h1 className="text-2xl font-semibold text-ink">New post</h1>
      <BlogForm mode="create" />
    </div>
  );
}
