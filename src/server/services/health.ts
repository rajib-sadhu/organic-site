// Liveness/readiness checks for /api/health (uptime monitors, PM2 deploy smoke test).
import { prisma } from "@/lib/prisma";
import { getWorkerLastTickAt } from "@/server/services/notify/worker";

// The outbox tick runs every minute; allow a couple of missed ticks before alarming.
const WORKER_STALE_MS = 3 * 60_000;
// A PENDING row this far past its scheduledFor means the worker isn't draining the outbox.
const OUTBOX_OVERDUE_MS = 10 * 60_000;

type Check = { ok: boolean; detail?: string };

export type HealthReport = {
  ok: boolean;
  uptimeSeconds: number;
  checks: { database: Check; worker: Check; outbox: Check };
};

async function checkDatabase(): Promise<Check> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, detail: `${Date.now() - start}ms` };
  } catch {
    return { ok: false, detail: "unreachable" };
  }
}

function checkWorker(): Check {
  // The worker is only started on the Node server, never during `next build`.
  const lastTick = getWorkerLastTickAt();
  if (lastTick === null) {
    // Give a freshly started process time for its first tick.
    return process.uptime() * 1000 < WORKER_STALE_MS
      ? { ok: true, detail: "starting" }
      : { ok: false, detail: "no tick since startup" };
  }
  const ago = Date.now() - lastTick;
  return ago < WORKER_STALE_MS
    ? { ok: true, detail: `last tick ${Math.round(ago / 1000)}s ago` }
    : { ok: false, detail: `last tick ${Math.round(ago / 1000)}s ago` };
}

async function checkOutbox(): Promise<Check> {
  try {
    const overdue = await prisma.notification.count({
      where: { status: "PENDING", scheduledFor: { lt: new Date(Date.now() - OUTBOX_OVERDUE_MS) } },
    });
    return overdue === 0 ? { ok: true } : { ok: false, detail: `${overdue} overdue` };
  } catch {
    return { ok: false, detail: "query failed" };
  }
}

export async function checkHealth(): Promise<HealthReport> {
  const [database, outbox] = await Promise.all([checkDatabase(), checkOutbox()]);
  const worker = checkWorker();
  return {
    ok: database.ok && worker.ok && outbox.ok,
    uptimeSeconds: Math.round(process.uptime()),
    checks: { database, worker, outbox },
  };
}
