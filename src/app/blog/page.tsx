import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blog — Organic insights, recipes & tips",
  description: "Read about organic living, seasonal recipes, and healthy eating tips from our farm to your kitchen.",
};

async function getPosts() {
  try {
    return await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
      },
    });
  } catch {
    return [];
  }
}

export default async function BlogListPage() {
  const posts = await getPosts();

  return (
    <div className="py-10 sm:py-14">
      <Container>
        <h1 className="font-display text-4xl text-forest-dark sm:text-5xl">Blog</h1>
        <p className="mt-3 max-w-lg text-muted">
          Stories from the farm, seasonal recipes, and tips for healthier living.
        </p>

        {posts.length === 0 ? (
          <p className="mt-12 text-center text-muted">No posts yet. Check back soon!</p>
        ) : (
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-paper transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-forest/10"
              >
                {post.coverImage ? (
                  <div className="relative aspect-[16/9] w-full overflow-hidden">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[16/9] w-full items-center justify-center bg-sand text-4xl text-muted/30">
                    &#x270D;
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  {post.publishedAt && (
                    <time className="text-xs text-muted">
                      {new Date(post.publishedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                  )}
                  <h2 className="mt-1 font-display text-lg leading-snug text-ink transition-colors group-hover:text-forest">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-3 text-sm text-muted">{post.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
