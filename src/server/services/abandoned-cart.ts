// Abandoned-cart reminders (ARCHITECTURE §6.10). Run by the notification
// worker; each reminder is a NORMAL-priority outbox row, so it is retried and
// audited like any other message.
import { prisma } from "@/lib/prisma";
import { notify } from "@/server/services/notify";

export const CART_REMINDER_SCOPE = "cart_reminder";

// Reminder N is sent once the cart has been idle this long.
const REMINDER_DELAYS_MS = [60 * 60_000, 24 * 60 * 60_000]; // 1h, 24h
// Never send two reminders closer together than this (e.g. right after enabling the feature).
const MIN_GAP_MS = 60 * 60_000;
// Carts idle longer than this are left alone — enabling the toggle must not mail old carts.
const MAX_IDLE_MS = 7 * 24 * 60 * 60_000;
const BATCH = 50;

export async function queueAbandonedCartReminders(): Promise<number> {
  const settings = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { abandonedCartOn: true, abandonedCartCoupon: { select: { code: true } } },
  });
  if (!settings?.abandonedCartOn) return 0;

  const now = Date.now();
  let queued = 0;

  for (let i = 0; i < REMINDER_DELAYS_MS.length; i++) {
    const reminderNo = i + 1;
    const isLast = reminderNo === REMINDER_DELAYS_MS.length;

    const carts = await prisma.cart.findMany({
      where: {
        email: { not: null },
        recoveryToken: { not: null },
        remindersSent: i,
        activityAt: { lte: new Date(now - REMINDER_DELAYS_MS[i]), gte: new Date(now - MAX_IDLE_MS) },
        items: { some: {} },
        ...(i > 0 ? { lastReminderAt: { lte: new Date(now - MIN_GAP_MS) } } : {}),
      },
      select: { id: true, email: true, activityAt: true },
      orderBy: { activityAt: "asc" },
      take: BATCH,
    });
    if (carts.length === 0) continue;

    const emails = [...new Set(carts.map((c) => c.email!))];
    const optedOut = new Set(
      (
        await prisma.emailOptOut.findMany({
          where: { scope: CART_REMINDER_SCOPE, email: { in: emails } },
          select: { email: true },
        })
      ).map((o) => o.email),
    );

    for (const cart of carts) {
      const email = cart.email!;

      // Bought since abandoning (perhaps on another device)? Then this cart is done.
      const ordered = await prisma.order.count({ where: { email, createdAt: { gte: cart.activityAt } } });
      if (optedOut.has(email) || ordered > 0) {
        await prisma.cart.updateMany({
          where: { id: cart.id, remindersSent: i },
          data: { remindersSent: REMINDER_DELAYS_MS.length },
        });
        continue;
      }

      // Claim this step first so concurrent workers (PM2 instances) can't both send it.
      const { count } = await prisma.cart.updateMany({
        where: { id: cart.id, remindersSent: i },
        data: { remindersSent: reminderNo, lastReminderAt: new Date() },
      });
      if (count !== 1) continue;

      try {
        await notify({
          template: "cart.reminder",
          data: {
            cartId: cart.id,
            reminderNo,
            couponCode: isLast ? (settings.abandonedCartCoupon?.code ?? null) : null,
          },
          to: email,
          priority: "NORMAL",
          dedupeKey: `cart:${cart.id}:reminder:${reminderNo}`,
        });
        queued++;
      } catch (e) {
        console.error(`[abandoned-cart] failed to queue reminder ${reminderNo} for cart ${cart.id}:`, e);
      }
    }
  }

  return queued;
}
