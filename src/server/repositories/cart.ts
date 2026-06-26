import { prisma } from "@/lib/prisma";

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: { select: { slug: true, name: true, images: { take: 1, orderBy: { sortOrder: "asc" as const }, select: { url: true, alt: true } } } },
        },
      },
    },
  },
  coupon: true,
} as const;

export type CartWithDetails = NonNullable<Awaited<ReturnType<typeof findCart>>>;

export async function findCart(cartId: string) {
  return prisma.cart.findUnique({ where: { id: cartId }, include: cartInclude });
}

export async function createCart() {
  return prisma.cart.create({ data: {}, include: cartInclude });
}

export async function addItem(cartId: string, variantId: number, qty: number) {
  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId } },
    create: { cartId, variantId, qty },
    update: { qty: { increment: qty } },
  });
  return findCart(cartId);
}

export async function setItemQty(cartId: string, variantId: number, qty: number) {
  if (qty <= 0) {
    await prisma.cartItem.deleteMany({ where: { cartId, variantId } });
  } else {
    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      create: { cartId, variantId, qty },
      update: { qty },
    });
  }
  return findCart(cartId);
}

export async function removeItem(cartId: string, variantId: number) {
  await prisma.cartItem.deleteMany({ where: { cartId, variantId } });
  return findCart(cartId);
}

export async function clearCart(cartId: string) {
  await prisma.cartItem.deleteMany({ where: { cartId } });
  await prisma.cart.update({ where: { id: cartId }, data: { couponId: null } });
  return findCart(cartId);
}

export async function setCoupon(cartId: string, couponId: number | null) {
  await prisma.cart.update({ where: { id: cartId }, data: { couponId } });
  return findCart(cartId);
}

export async function setEmail(cartId: string, email: string) {
  await prisma.cart.update({ where: { id: cartId }, data: { email } });
}

export async function deleteCart(cartId: string) {
  await prisma.cartItem.deleteMany({ where: { cartId } });
  await prisma.cart.delete({ where: { id: cartId } });
}
