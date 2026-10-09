// Online orders hold stock from checkout. If the customer never completes
// payment, cancel the order and release the stock — but first ask Razorpay,
// in case a payment was captured and its callback/webhook never reached us.
import { prisma } from "@/lib/prisma";
import { fetchCapturedPayment, isRazorpayConfigured } from "@/server/lib/razorpay";
import { queueOrderConfirmation } from "@/server/services/notify";
import { cancelOrder, markOrderPaid } from "@/server/services/order";

// Must exceed the checkout popup timeout (CHECKOUT_TIMEOUT_SECONDS on the checkout page).
export const UNPAID_ORDER_TTL_MS = 30 * 60_000;
const BATCH = 50;

export async function expireUnpaidOrders(): Promise<{ cancelled: number; recovered: number }> {
  if (!isRazorpayConfigured()) return { cancelled: 0, recovered: 0 };

  const orders = await prisma.order.findMany({
    where: {
      status: "PENDING",
      paymentMethod: "RAZORPAY",
      paymentStatus: { not: "PAID" },
      createdAt: { lt: new Date(Date.now() - UNPAID_ORDER_TTL_MS) },
    },
    select: { id: true, email: true, payment: { select: { id: true, rzpOrderId: true } } },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });

  let cancelled = 0;
  let recovered = 0;
  for (const order of orders) {
    try {
      if (order.payment?.rzpOrderId) {
        const captured = await fetchCapturedPayment(order.payment.rzpOrderId);
        if (captured) {
          const result = await markOrderPaid({ paymentId: order.payment.id, rzpPaymentId: captured.id });
          if (result.status === "confirmed") {
            await queueOrderConfirmation(order.id, order.email);
            recovered++;
          }
          continue;
        }
      }
      if (await cancelOrder(order.id, { paymentFailed: true })) cancelled++;
    } catch (e) {
      // Razorpay unreachable etc. — leave the order alone and try next run.
      console.error(`[payment-expiry] order ${order.id}:`, e);
    }
  }
  return { cancelled, recovered };
}
