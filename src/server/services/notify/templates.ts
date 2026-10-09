// Notification templates: render a message body from data, and redact any
// live secret (OTP, magic-link token) once the message has been sent (§6.14).
import type { NotifChannel } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatPaise } from "@/lib/money";
import { siteConfig } from "@/lib/site";

export type RenderedMessage = {
  subject: string | null;
  body: string;
  orderId?: number;
  attachInvoiceForOrderId?: number;
};

type Template<D> = {
  channel: NotifChannel;
  render(data: D): Promise<RenderedMessage>;
  /** Replace secrets in the stored body once SENT. */
  redact?(body: string): string;
};

export type TemplateData = {
  "order.confirmation": { orderId: number };
  "cod.otp": { code: string; ttlMinutes: number };
};

export type TemplateName = keyof TemplateData;

const REDACTED = "••••";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const orderConfirmation: Template<TemplateData["order.confirmation"]> = {
  channel: "EMAIL",
  async render({ orderId }) {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

    const trackingUrl = `${siteConfig.url}/order/${order.trackingToken}`;
    const isPaid = order.paymentMethod === "RAZORPAY" && order.paymentStatus === "PAID";

    const itemsHtml = order.items
      .map(
        (item) =>
          `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f1ebdf">${esc(item.productName)} <span style="color:#6d655a">(${esc(item.variantLabel)})</span></td>
          <td style="padding:8px 0;border-bottom:1px solid #f1ebdf;text-align:center">${item.qty}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f1ebdf;text-align:right">${formatPaise(item.linePaise)}</td>
        </tr>`,
      )
      .join("");

    const body = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#faf8f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#211e19">
<div style="max-width:600px;margin:0 auto;padding:32px 20px">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="color:#24503a;font-size:28px;margin:0">${esc(siteConfig.name)}</h1>
    <p style="color:#6d655a;font-size:14px;margin:4px 0 0">${esc(siteConfig.tagline)}</p>
  </div>

  <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e7e1d3">
    <h2 style="color:#24503a;font-size:22px;margin:0 0 8px">Order confirmed!</h2>
    <p style="color:#6d655a;margin:0 0 24px">Thank you for shopping with us. Here are your order details.</p>

    <table style="width:100%;margin-bottom:16px">
      <tr><td style="color:#6d655a;padding:4px 0">Order number</td><td style="text-align:right;font-weight:600;color:#24503a">${esc(order.orderNo)}</td></tr>
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
      <strong>${esc(order.shipName)}</strong><br>
      ${esc(order.shipLine1)}${order.shipLine2 ? `<br>${esc(order.shipLine2)}` : ""}<br>
      ${esc(order.shipCity)}, ${esc(order.shipState)} ${esc(order.shipPincode)}
    </p>
  </div>

  <div style="text-align:center;margin-top:24px">
    <a href="${trackingUrl}" style="display:inline-block;background:#24503a;color:#faf8f3;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:14px;font-weight:600">Track your order</a>
  </div>

  <p style="text-align:center;color:#6d655a;font-size:12px;margin-top:32px">
    Questions? Reply to this email or contact us at ${esc(siteConfig.contact.email)}
  </p>
</div>
</body>
</html>`;

    return {
      subject: `Order confirmed — ${order.orderNo}`,
      body,
      orderId: order.id,
      attachInvoiceForOrderId: order.id,
    };
  },
  // The magic-link token stays on Order.trackingToken; the audit row doesn't need it.
  redact: (body) => body.replace(/\/order\/[A-Za-z0-9_-]+/g, `/order/${REDACTED}`),
};

const codOtp: Template<TemplateData["cod.otp"]> = {
  channel: "SMS",
  async render({ code, ttlMinutes }) {
    return {
      subject: null,
      body: `${code} is your ${siteConfig.name} code to confirm your Cash on Delivery order. Valid for ${ttlMinutes} minutes. Do not share it with anyone.`,
    };
  },
  redact: (body) => body.replace(/\b\d{6}\b/g, REDACTED),
};

export const templates: { [K in TemplateName]: Template<TemplateData[K]> } = {
  "order.confirmation": orderConfirmation,
  "cod.otp": codOtp,
};

export function redactBody(template: string, body: string): string {
  const t = templates[template as TemplateName];
  return t?.redact ? t.redact(body) : body;
}
