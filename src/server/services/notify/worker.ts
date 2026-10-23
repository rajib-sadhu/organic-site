// In-process scheduler for the notification outbox (ARCHITECTURE §6.14).
// Started once per server instance from src/instrumentation.ts.
import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { queueAbandonedCartReminders } from "@/server/services/abandoned-cart";
import { expireUnpaidOrders } from "@/server/services/payment-expiry";
import { processDueNotifications, purgeOldNotifications } from "./index";

const globalForWorker = globalThis as unknown as {
  notificationWorkerStarted?: boolean;
  notificationWorkerLastTickAt?: number;
};

/** When the outbox tick last completed in this process, or null if it hasn't run yet. */
export function getWorkerLastTickAt(): number | null {
  return globalForWorker.notificationWorkerLastTickAt ?? null;
}

export function startNotificationWorker(): void {
  // Guard against double-start (dev HMR re-evaluates modules).
  if (globalForWorker.notificationWorkerStarted) return;
  globalForWorker.notificationWorkerStarted = true;

  cron.schedule(
    "* * * * *",
    async () => {
      try {
        const n = await processDueNotifications();
        if (n > 0) console.log(`[notify:worker] processed ${n} notification(s)`);
        globalForWorker.notificationWorkerLastTickAt = Date.now();
      } catch (e) {
        console.error("[notify:worker] tick failed:", e);
      }
    },
    { name: "notification-outbox", noOverlap: true },
  );

  cron.schedule(
    "*/10 * * * *",
    async () => {
      try {
        const n = await queueAbandonedCartReminders();
        if (n > 0) console.log(`[abandoned-cart] queued ${n} reminder(s)`);
      } catch (e) {
        console.error("[abandoned-cart] run failed:", e);
      }
    },
    { name: "abandoned-cart", noOverlap: true },
  );

  cron.schedule(
    "*/5 * * * *",
    async () => {
      try {
        const { cancelled, recovered } = await expireUnpaidOrders();
        if (cancelled || recovered) console.log(`[payment-expiry] cancelled ${cancelled}, recovered ${recovered}`);
      } catch (e) {
        console.error("[payment-expiry] run failed:", e);
      }
    },
    { name: "payment-expiry", noOverlap: true },
  );

  cron.schedule(
    "17 3 * * *",
    async () => {
      try {
        await purgeOldNotifications();
        // Expired OTP challenges have no further use.
        await prisma.otpChallenge.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86_400_000) } } });
      } catch (e) {
        console.error("[notify:worker] cleanup failed:", e);
      }
    },
    { name: "notification-cleanup", noOverlap: true },
  );

  console.log("[notify:worker] started");
}
