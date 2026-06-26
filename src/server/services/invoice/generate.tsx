import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { InvoiceDocument, type InvoiceData } from "./template";

async function generateInvoiceNo(orderId: number): Promise<string> {
  const year = new Date().getFullYear();
  const seq = orderId.toString().padStart(6, "0");
  return `INV-${year}-${seq}`;
}

export async function generateInvoice(orderId: number): Promise<{ invoiceNo: string; pdfPath: string; pdfBuffer: Buffer }> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, invoice: true },
  });

  if (order.invoice) {
    const existing = order.invoice;
    if (existing.pdfPath) {
      const { readFile } = await import("fs/promises");
      try {
        const buf = await readFile(path.join(process.cwd(), "public", existing.pdfPath));
        return { invoiceNo: existing.invoiceNo, pdfPath: existing.pdfPath, pdfBuffer: buf as Buffer };
      } catch {
        // file missing, regenerate
      }
    }
  }

  const invoiceNo = order.invoice?.invoiceNo ?? await generateInvoiceNo(orderId);

  const data: InvoiceData = {
    invoiceNo,
    orderNo: order.orderNo,
    date: order.createdAt.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
    customer: {
      name: order.shipName,
      email: order.email,
      phone: order.phone,
      address: [order.shipLine1, order.shipLine2, order.shipCity, order.shipState, order.shipPincode]
        .filter(Boolean)
        .join(", "),
    },
    items: order.items.map((item) => ({
      name: item.productName,
      variant: item.variantLabel,
      qty: item.qty,
      unitPaise: item.unitPaise,
      linePaise: item.linePaise,
    })),
    subtotalPaise: order.subtotalPaise,
    discountPaise: order.discountPaise,
    shippingPaise: order.shippingPaise,
    codFeePaise: order.codFeePaise,
    totalPaise: order.totalPaise,
    paymentMethod: order.paymentMethod,
    couponCode: order.couponCode,
  };

  const pdfBuffer = await renderToBuffer(<InvoiceDocument data={data} />);

  const dir = path.join(process.cwd(), "public", "invoices");
  await mkdir(dir, { recursive: true });
  const filename = `${invoiceNo.replace(/\//g, "-")}.pdf`;
  const pdfPath = `/invoices/${filename}`;
  await writeFile(path.join(dir, filename), pdfBuffer);

  if (order.invoice) {
    await prisma.invoice.update({
      where: { id: order.invoice.id },
      data: { pdfPath },
    });
  } else {
    await prisma.invoice.create({
      data: { orderId, invoiceNo, pdfPath },
    });
  }

  return { invoiceNo, pdfPath, pdfBuffer: pdfBuffer as Buffer };
}
