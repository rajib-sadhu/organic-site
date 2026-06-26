import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/lib/admin-auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("products.view");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id: Number(id) } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    post: {
      ...post,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    },
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("products.edit");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await prisma.blogPost.findUnique({ where: { id: numId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.slug && body.slug !== existing.slug) {
    const conflict = await prisma.blogPost.findFirst({ where: { slug: body.slug, id: { not: numId } } });
    if (conflict) return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
  }

  const wasPublished = existing.status === "PUBLISHED";
  const isPublishing = body.status === "PUBLISHED" && !wasPublished;

  const post = await prisma.blogPost.update({
    where: { id: numId },
    data: {
      slug: body.slug ?? existing.slug,
      title: body.title ?? existing.title,
      excerpt: body.excerpt !== undefined ? (body.excerpt || null) : existing.excerpt,
      body: body.body ?? existing.body,
      coverImage: body.coverImage !== undefined ? (body.coverImage || null) : existing.coverImage,
      status: body.status ?? existing.status,
      publishedAt: isPublishing ? new Date() : existing.publishedAt,
      metaTitle: body.metaTitle !== undefined ? (body.metaTitle || null) : existing.metaTitle,
      metaDescription: body.metaDescription !== undefined ? (body.metaDescription || null) : existing.metaDescription,
    },
  });

  return NextResponse.json({ post });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("products.delete");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.blogPost.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
