// In-process scheduler for the notification outbox (ARCHITECTURE §6.14).
// Started once per server instance from src/instrumentation.ts.
import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { processDueNotifications, purgeOldNotifications } from "./index";

const globalForWorker = globalThis as unknown as { notificationWorkerStarted?: boolean };

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
      } catch (e) {
        console.error("[notify:worker] tick failed:", e);
      }
    },
    { name: "notification-outbox", noOverlap: true },
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
