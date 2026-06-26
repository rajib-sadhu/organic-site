import { prisma } from "@/lib/prisma";
import { formatPaise } from "@/lib/money";
import { getResend, getFromEmail } from "@/server/lib/resend";
import { generateInvoice } from "@/server/services/invoice/generate";

export async function sendOrderConfirmation(orderId: number) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });

  let invoiceAttachment: { filename: string; content: Buffer } | undefined;
  try {
    const { invoiceNo, pdfBuffer } = await generateInvoice(orderId);
    invoiceAttachment = { filename: `${invoiceNo}.pdf`, content: pdfBuffer };
  } catch (e) {
    console.error("[email] Invoice generation failed:", e);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const trackingUrl = `${siteUrl}/order/${order.trackingToken}`;
  const isPaid = order.paymentMethod === "RAZORPAY" && order.paymentStatus === "PAID";

  const itemsHtml = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f1ebdf">${item.productName} <span style="color:#6d655a">(${item.variantLabel})</span></td>
          <td style="padding:8px 0;border-bottom:1px solid #f1ebdf;text-align:center">${item.qty}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f1ebdf;text-align:right">${formatPaise(item.linePaise)}</td>
        </tr>`,
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#faf8f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#211e19">
<div style="max-width:600px;margin:0 auto;padding:32px 20px">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="color:#24503a;font-size:28px;margin:0">Verdant</h1>
    <p style="color:#6d655a;font-size:14px;margin:4px 0 0">Pure organic foods, delivered fresh</p>
  </div>

  <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e7e1d3">
    <h2 style="color:#24503a;font-size:22px;margin:0 0 8px">Order confirmed!</h2>
    <p style="color:#6d655a;margin:0 0 24px">Thank you for shopping with us. Here are your order details.</p>

    <table style="width:100%;margin-bottom:16px">
      <tr><td style="color:#6d655a;padding:4px 0">Order number</td><td style="text-align:right;font-weight:600;color:#24503a">${order.orderNo}</td></tr>
      <tr><td style="color:#6d655a;padding:4px 0">Payment</td><td style="text-align:right">${isPaid ? "Paid online" : "Cash on Delivery"}</td></tr>
      <tr><td style="color:#6d655a;padding:4px 0">Status</td><td style="text-align:right;color:#3c7a52;font-weight:600">Confirmed</td></tr>
    </table>

    <hr style="border:none;border-top:1px solid #e7e1d3;margin:16px 0">

    <table style="width:100%;font-size:14px">
      <thead>
        <tr style="color:#6d655a;font-size:12px;text-transform:uppercase">
          <th style="text-align:left;padding-bottom:8px">Item</th>
          <th style="text-align:center;padding-bottom:8px">Qty</th>
          <th style="text-align:right;padding-bottom:8px">Amount</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <div style="margin-top:16px;text-align:right;font-size:14px">
      <p style="margin:4px 0;color:#6d655a">Subtotal: <strong style="color:#211e19">${formatPaise(order.subtotalPaise)}</strong></p>
      ${order.discountPaise > 0 ? `<p style="margin:4px 0;color:#3c7a52">Discount: <strong>-${formatPaise(order.discountPaise)}</strong></p>` : ""}
      <p style="margin:4px 0;color:#6d655a">Shipping: <strong style="color:#211e19">${order.shippingPaise === 0 ? "Free" : formatPaise(order.shippingPaise)}</strong></p>
      ${order.codFeePaise > 0 ? `<p style="margin:4px 0;color:#6d655a">COD fee: <strong style="color:#211e19">${formatPaise(order.codFeePaise)}</strong></p>` : ""}
      <p style="margin:12px 0 0;font-size:18px;color:#24503a"><strong>Total: ${formatPaise(order.totalPaise)}</strong></p>
    </div>

    <hr style="border:none;border-top:1px solid #e7e1d3;margin:24px 0 16px">

    <p style="color:#6d655a;font-size:13px;margin:0 0 4px">Shipping to:</p>
    <p style="margin:0;font-size:14px">
      <strong>${order.shipName}</strong><br>
      ${order.shipLine1}${order.shipLine2 ? `<br>${order.shipLine2}` : ""}<br>
      ${order.shipCity}, ${order.shipState} ${order.shipPincode}
    </p>
  </div>

  <div style="text-align:center;margin-top:24px">
    <a href="${trackingUrl}" style="display:inline-block;background:#24503a;color:#faf8f3;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:14px;font-weight:600">Track your order</a>
  </div>

  <p style="text-align:center;color:#6d655a;font-size:12px;margin-top:32px">
    Questions? Reply to this email or contact us at hello@verdant.example
  </p>
</div>
</body>
</html>`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: getFromEmail(),
      to: order.email,
      subject: `Order confirmed — ${order.orderNo}`,
      html,
      attachments: invoiceAttachment
        ? [{ filename: invoiceAttachment.filename, content: invoiceAttachment.content }]
        : undefined,
    });
    console.log(`[email] Confirmation sent for ${order.orderNo} to ${order.email}`);
  } catch (e) {
    console.error(`[email] Failed to send confirmation for ${order.orderNo}:`, e);
  }
}
