import { prisma } from "@/lib/prisma";
import type { CartWithDetails } from "@/server/repositories/cart";
import { computeTotals } from "@/server/services/cart";
import type { PaymentMethod, Prisma } from "@/generated/prisma/client";

type CheckoutAddress = {
  email: string;
  phone: string;
  shipName: string;
  shipLine1: string;
  shipLine2?: string;
  shipCity: string;
  shipState: string;
  shipPincode: string;
};

type ProviderPayment = { provider: string; rzpOrderId: string };

type CreateOrderInput = {
  cart: CartWithDetails;
  address: CheckoutAddress;
  paymentMethod: PaymentMethod;
  /**
   * Creates the order at the payment provider. Runs after validation but
   * before anything is written, so a provider failure leaves no order, no
   * reserved stock and an intact cart. The result is saved with the order.
   */
  createProviderPayment?: (order: { orderNo: string; totalPaise: number }) => Promise<ProviderPayment>;
};

async function generateOrderNo(): Promise<string> {
  const year = new Date().getFullYear();
  const last = await prisma.order.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
  const seq = ((last?.id ?? 0) + 1).toString().padStart(6, "0");
  return `ORD-${year}-${seq}`;
}

export async function createOrder(input: CreateOrderInput) {
  const { cart, address, paymentMethod } = input;

  if (cart.items.length === 0) {
    throw new Error("Cart is empty.");
  }

  const totals = await computeTotals(cart, paymentMethod);

  const variantIds = cart.items.map((ci) => ci.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, stock: true, label: true, sku: true, pricePaise: true, product: { select: { name: true } } },
  });
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  for (const ci of cart.items) {
    const v = variantMap.get(ci.variantId);
    if (!v) throw new Error(`Variant ${ci.variantId} not found.`);
    if (v.stock < ci.qty) throw new Error(`Insufficient stock for ${v.product.name} (${v.label}). Available: ${v.stock}.`);
  }

  const orderNo = await generateOrderNo();

  const providerPayment = input.createProviderPayment
    ? await input.createProviderPayment({ orderNo, totalPaise: totals.totalPaise })
    : null;

  const order = await prisma.$transaction(async (tx) => {
    for (const ci of cart.items) {
      const updated = await tx.productVariant.update({
        where: { id: ci.variantId },
        data: { stock: { decrement: ci.qty } },
        select: { stock: true },
      });
      if (updated.stock < 0) {
        throw new Error(`Stock race: ${variantMap.get(ci.variantId)!.product.name} sold out.`);
      }
    }

    const created = await tx.order.create({
      data: {
        orderNo,
        ...address,
        shipLine2: address.shipLine2 || null,
        subtotalPaise: totals.subtotalPaise,
        discountPaise: totals.discountPaise,
        shippingPaise: totals.shippingPaise,
        codFeePaise: totals.codFeePaise,
        totalPaise: totals.totalPaise,
        couponCode: cart.coupon?.code ?? null,
        couponId: cart.couponId,
        paymentMethod,
        paymentStatus: paymentMethod === "COD" ? "PENDING" : "PENDING",
        status: paymentMethod === "COD" ? "CONFIRMED" : "PENDING",
        items: {
          create: cart.items.map((ci) => {
            const v = variantMap.get(ci.variantId)!;
            return {
              variantId: v.id,
              productName: v.product.name,
              variantLabel: v.label,
              sku: v.sku,
              unitPaise: v.pricePaise,
              qty: ci.qty,
              linePaise: v.pricePaise * ci.qty,
            };
          }),
        },
      },
      include: { items: true },
    });

    const payment = providerPayment
      ? await tx.payment.create({
          data: {
            orderId: created.id,
            provider: providerPayment.provider,
            rzpOrderId: providerPayment.rzpOrderId,
            amountPaise: totals.totalPaise,
            status: "PENDING",
          },
        })
      : null;

    if (cart.coupon) {
      await tx.coupon.update({ where: { id: cart.coupon.id }, data: { usedCount: { increment: 1 } } });
    }

    return { ...created, payment };
  });

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });

  return order;
}

type Tx = Prisma.TransactionClient;

/** Give an order's items back to stock and its coupon use back to the coupon. */
async function releaseOrder(tx: Tx, orderId: number) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { couponId: true, items: { select: { variantId: true, sku: true, qty: true } } },
  });
  for (const item of order.items) {
    await tx.productVariant.updateMany({
      // Items from before variantId existed fall back to the (unique) SKU.
      where: item.variantId ? { id: item.variantId } : { sku: item.sku },
      data: { stock: { increment: item.qty } },
    });
  }
  if (order.couponId) {
    await tx.coupon.updateMany({
      where: { id: order.couponId, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }
}

/** Take stock again for a previously released order. All-or-nothing; false if any item is short. */
async function reserveOrder(tx: Tx, orderId: number): Promise<boolean> {
  const items = await tx.orderItem.findMany({ where: { orderId }, select: { variantId: true, sku: true, qty: true } });
  const taken: typeof items = [];
  for (const item of items) {
    const match = item.variantId ? { id: item.variantId } : { sku: item.sku };
    const { count } = await tx.productVariant.updateMany({
      where: { ...match, stock: { gte: item.qty } },
      data: { stock: { decrement: item.qty } },
    });
    if (count !== 1) {
      // Put back what this attempt already took.
      for (const t of taken) {
        await tx.productVariant.updateMany({
          where: t.variantId ? { id: t.variantId } : { sku: t.sku },
          data: { stock: { increment: t.qty } },
        });
      }
      return false;
    }
    taken.push(item);
  }
  return true;
}

/**
 * Cancel an order and release its stock + coupon use. Only acts on orders that
 * still hold stock; returns false if the order was already cancelled/finished.
 */
export async function cancelOrder(orderId: number, opts: { paymentFailed?: boolean } = {}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: { in: ["PENDING", "CONFIRMED", "PACKED"] } },
      data: { status: "CANCELLED", ...(opts.paymentFailed ? { paymentStatus: "FAILED" } : {}) },
    });
    if (count !== 1) return false;
    await releaseOrder(tx, orderId);
    return true;
  });
}

export type MarkPaidResult =
  | { status: "already_paid"; orderId: number }
  | { status: "confirmed"; orderId: number }
  /** Paid after the order was cancelled and its stock is gone — needs a refund. */
  | { status: "paid_needs_refund"; orderId: number };

/**
 * Record a captured Razorpay payment (from the checkout callback, the webhook,
 * or the expiry reconciler). Idempotent. If the order had already been
 * auto-cancelled, it is revived when stock allows.
 */
export async function markOrderPaid(input: {
  paymentId: number;
  rzpPaymentId: string;
  rzpSignature?: string;
  rawWebhook?: Prisma.InputJsonValue;
}): Promise<MarkPaidResult> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: input.paymentId },
      select: { orderId: true, order: { select: { status: true } } },
    });

    const { count } = await tx.payment.updateMany({
      where: { id: input.paymentId, status: { not: "PAID" } },
      data: {
        status: "PAID",
        rzpPaymentId: input.rzpPaymentId,
        ...(input.rzpSignature ? { rzpSignature: input.rzpSignature } : {}),
        ...(input.rawWebhook ? { rawWebhook: input.rawWebhook } : {}),
      },
    });
    if (count !== 1) return { status: "already_paid", orderId: payment.orderId };

    if (payment.order.status === "CANCELLED") {
      const revived = await reserveOrder(tx, payment.orderId);
      if (!revived) {
        // Stock is gone. Keep it cancelled but record the payment so an admin refunds it.
        await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: "PAID" } });
        console.error(`[payment] order ${payment.orderId} was paid after cancellation and is out of stock — REFUND NEEDED`);
        return { status: "paid_needs_refund", orderId: payment.orderId };
      }
      const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId }, select: { couponId: true } });
      if (order.couponId) {
        await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
      }
    }

    await tx.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: "PAID", status: "CONFIRMED" },
    });
    return { status: "confirmed", orderId: payment.orderId };
  });
}
