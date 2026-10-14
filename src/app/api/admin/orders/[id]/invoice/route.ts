import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/lib/admin-auth";
import { generateInvoice } from "@/server/services/invoice/generate";

// Invoice PDFs live outside public/; this is the only way an admin downloads one.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requirePermission("orders.view");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);
  if (!numId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { id: numId }, select: { id: true } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { invoiceNo, pdfBuffer } = await generateInvoice(order.id);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoiceNo}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
