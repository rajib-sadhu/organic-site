import Razorpay from "razorpay";
import crypto from "crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID!;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

let instance: Razorpay | null = null;

function getRazorpay() {
  if (!KEY_ID || !KEY_SECRET) {
    throw new Error("Razorpay credentials not configured.");
  }
  if (!instance) {
    instance = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
  }
  return instance;
}

export async function createRazorpayOrder(amountPaise: number, receipt: string) {
  const rzp = getRazorpay();
  const order = await rzp.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt,
    payment_capture: true,
  });
  return order;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(KEY_ID && KEY_SECRET);
}

/** The captured payment for a Razorpay order, if the customer actually paid. */
export async function fetchCapturedPayment(rzpOrderId: string): Promise<{ id: string } | null> {
  const { items } = await getRazorpay().orders.fetchPayments(rzpOrderId);
  const captured = items.find((p) => p.status === "captured");
  return captured ? { id: String(captured.id) } : null;
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!KEY_SECRET) return false;
  const body = `${orderId}|${paymentId}`;
  const expected = Buffer.from(crypto.createHmac("sha256", KEY_SECRET).update(body).digest("hex"));
  const actual = Buffer.from(signature);
  // timingSafeEqual throws on a length mismatch; a malformed signature is simply invalid.
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function getPublicKeyId() {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? KEY_ID;
}
