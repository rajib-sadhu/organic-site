// Node-only startup, imported from instrumentation.ts.
import { assertDriverConfig } from "@/server/services/notify/drivers";
import { startNotificationWorker } from "@/server/services/notify/worker";

// Fail fast on a misconfigured notification driver — no silent fallback (§6.14).
// Exit outright: a thrown error here leaves Next alive but not listening,
// which PM2 would report as "online".
try {
  assertDriverConfig();
} catch (e) {
  console.error(`[startup] ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}

startNotificationWorker();
