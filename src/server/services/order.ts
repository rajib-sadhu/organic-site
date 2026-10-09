import { prisma } from "@/lib/prisma";
import type { CartWithDetails } from "@/server/repositories/cart";
import { computeTotals } from "@/server/services/cart";
import type { PaymentMethod } from "@/generated/prisma/client";

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
