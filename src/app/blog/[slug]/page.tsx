import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";
import { JsonLd, absoluteUrl } from "@/components/ui/JsonLd";

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
      modifiedTime: post.updatedAt.toISOString(),
      ...(post.coverImage ? { images: [{ url: post.coverImage, width: 1344, height: 756 }] } : {}),
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

  const url = `${siteConfig.url}/blog/${post.slug}`;
  const org = { "@type": "Organization", name: siteConfig.name, url: siteConfig.url };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription ?? post.excerpt ?? undefined,
    ...(post.coverImage ? { image: absoluteUrl(post.coverImage) } : {}),
    datePublished: (post.publishedAt ?? post.createdAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: org,
    publisher: { ...org, logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") } },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.url },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteConfig.url}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

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
            <Image
              src={post.coverImage}
              alt={post.title}
              width={1344}
              height={756}
              sizes="(max-width: 704px) 100vw, 672px"
              fetchPriority="high"
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

      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbs} />
    </div>
  );
}
