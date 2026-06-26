import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/lib/admin-auth";

export async function GET(req: Request) {
  try {
    await requirePermission("products.view");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = 20;

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      select: {
        id: true, slug: true, title: true, status: true,
        coverImage: true, publishedAt: true, createdAt: true,
      },
    }),
    prisma.blogPost.count(),
  ]);

  return NextResponse.json({
    posts: posts.map((p) => ({
      ...p,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: Request) {
  try {
    await requirePermission("products.create");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.slug || !body?.body) {
    return NextResponse.json({ error: "Missing title, slug, or body." }, { status: 400 });
  }

  const existing = await prisma.blogPost.findUnique({ where: { slug: body.slug } });
  if (existing) return NextResponse.json({ error: "Slug already exists." }, { status: 409 });

  const post = await prisma.blogPost.create({
    data: {
      slug: body.slug,
      title: body.title,
      excerpt: body.excerpt || null,
      body: body.body,
      coverImage: body.coverImage || null,
      status: body.status ?? "DRAFT",
      publishedAt: body.status === "PUBLISHED" ? new Date() : null,
      metaTitle: body.metaTitle || null,
      metaDescription: body.metaDescription || null,
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
