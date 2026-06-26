import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/lib/admin-auth";

export async function GET() {
  try {
    await requirePermission("settings.manage");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const banners = await prisma.banner.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    banners: banners.map((b) => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  try {
    await requirePermission("settings.manage");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.image) {
    return NextResponse.json({ error: "Image is required" }, { status: 400 });
  }

  const banner = await prisma.banner.create({
    data: {
      title: body.title ?? null,
      subtitle: body.subtitle ?? null,
      ctaText: body.ctaText ?? null,
      ctaLink: body.ctaLink ?? null,
      image: body.image,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json(
    {
      banner: {
        ...banner,
        createdAt: banner.createdAt.toISOString(),
        updatedAt: banner.updatedAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
