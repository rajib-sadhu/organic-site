import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { InvoiceDocument, type InvoiceData } from "./template";

// Invoices hold customer PII: keep them out of public/ (which is served
// statically) and hand them out only through authorized routes.
const INVOICE_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "invoices");

function invoiceFile(pdfPath: string): string {
  return path.join(INVOICE_DIR, path.basename(pdfPath));
}

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

  if (order.invoice?.pdfPath) {
    try {
      const pdfBuffer = await readFile(invoiceFile(order.invoice.pdfPath));
      return { invoiceNo: order.invoice.invoiceNo, pdfPath: order.invoice.pdfPath, pdfBuffer };
    } catch {
      // file missing, regenerate
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

  // Stored as a bare filename, resolved against the private invoice dir.
  const pdfPath = `${invoiceNo.replace(/[^A-Za-z0-9-]/g, "-")}.pdf`;
  await mkdir(INVOICE_DIR, { recursive: true });
  await writeFile(invoiceFile(pdfPath), pdfBuffer);

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
