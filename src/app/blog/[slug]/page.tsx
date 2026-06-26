import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";

export const revalidate = 300;

async function getPost(slug: string) {
  try {
    return await prisma.blogPost.findFirst({
      where: { slug, status: "PUBLISHED" },
    });
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true },
    });
    return posts.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.metaTitle ?? post.title,
    description: post.metaDescription ?? post.excerpt ?? undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.metaTitle ?? post.title,
      description: post.metaDescription ?? post.excerpt ?? undefined,
      url: `${siteConfig.url}/blog/${post.slug}`,
      publishedTime: post.publishedAt?.toISOString(),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <div className="py-10 sm:py-14">
      <Container>
        <nav className="flex items-center gap-1.5 text-sm text-muted">
          <Link href="/" className="hover:text-forest">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/blog" className="hover:text-forest">Blog</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-ink">{post.title}</span>
        </nav>

        <article className="mx-auto mt-8 max-w-2xl">
          {post.coverImage && (
            <img
              src={post.coverImage}
              alt={post.title}
              className="mb-8 aspect-[16/9] w-full rounded-2xl object-cover"
            />
          )}

          {post.publishedAt && (
            <time className="text-sm text-muted">
              {new Date(post.publishedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          )}

          <h1 className="mt-2 font-display text-4xl text-forest-dark sm:text-5xl">
            {post.title}
          </h1>

          <div
            className="prose-organic mt-8"
            dangerouslySetInnerHTML={{ __html: post.body }}
          />
        </article>
      </Container>
    </div>
  );
}
