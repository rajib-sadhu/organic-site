// Notification outbox facade (ARCHITECTURE §6.14).
// notify() renders a template, persists the row, and — for HIGH priority —
// dispatches it inline. Everything else is picked up by the worker.
import { Prisma, type Notification, type NotifPriority } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { generateInvoice } from "@/server/services/invoice/generate";
import { getDriver, type OutboundMessage } from "./drivers";
import { templates, redactBody, type TemplateData, type TemplateName } from "./templates";

// Delay before retry N (1-based). With maxAttempts = 10 the window spans ~28h.
const BACKOFF_MINUTES = [1, 5, 15, 30, 60, 120, 240, 480, 720];
const CLAIM_BATCH = 20;
// A row stuck in SENDING this long belonged to a process that died mid-send.
const STALE_SENDING_MS = 10 * 60_000;
const SENT_RETENTION_DAYS = 30;

type NotifyInput<T extends TemplateName> = {
  template: T;
  data: TemplateData[T];
  to: string;
  priority?: NotifPriority;
  /** Re-enqueue with the same key is a no-op (e.g. "confirmation:order:123"). */
  dedupeKey?: string;
  /** 1 = no background retries (e.g. an OTP is useless once the customer has moved on). */
  maxAttempts?: number;
};

type NotifyOptions = {
  /** HIGH only: await the inline send (default) or let it finish in the background. */
  wait?: boolean;
};

export async function notify<T extends TemplateName>(
  input: NotifyInput<T>,
  { wait = true }: NotifyOptions = {},
): Promise<{ id: number; sent: boolean }> {
  const template = templates[input.template];
  const rendered = await template.render(input.data);
  const priority = input.priority ?? "NORMAL";

  let row: Notification;
  try {
    row = await prisma.notification.create({
      data: {
        channel: template.channel,
        priority,
        toAddress: input.to,
        subject: rendered.subject,
        body: rendered.body,
        template: input.template,
        orderId: rendered.orderId ?? null,
        attachInvoiceForOrderId: rendered.attachInvoiceForOrderId ?? null,
        dedupeKey: input.dedupeKey ?? null,
        ...(input.maxAttempts ? { maxAttempts: input.maxAttempts } : {}),
      },
    });
  } catch (e) {
    if (input.dedupeKey && e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await prisma.notification.findUniqueOrThrow({ where: { dedupeKey: input.dedupeKey } });
      return { id: existing.id, sent: existing.status === "SENT" };
    }
    throw e;
  }

  if (priority !== "HIGH") return { id: row.id, sent: false };

  if (!wait) {
    dispatchNotification(row.id).catch((e) => console.error(`[notify] inline dispatch #${row.id} crashed:`, e));
    return { id: row.id, sent: false };
  }
  return { id: row.id, sent: await dispatchNotification(row.id) };
}

/** Claim one PENDING row and send it. Returns true only if this call delivered it. */
export async function dispatchNotification(id: number): Promise<boolean> {
  const { count } = await prisma.notification.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "SENDING" },
  });
  if (count !== 1) return false; // already claimed (worker / another request)

  const row = await prisma.notification.findUniqueOrThrow({ where: { id } });
  return deliver(row);
}

async function deliver(row: Notification): Promise<boolean> {
  const attempts = row.attempts + 1;
  let attachmentError: string | null = null;

  try {
    const msg: OutboundMessage = {
      channel: row.channel,
      to: row.toAddress,
      subject: row.subject,
      body: row.body,
    };

    if (row.attachInvoiceForOrderId) {
      // Regenerated from the immutable order snapshot; never stored on the row.
      // A broken invoice must not hold back the confirmation itself.
      try {
        const { invoiceNo, pdfBuffer } = await generateInvoice(row.attachInvoiceForOrderId);
        msg.attachments = [{ filename: `${invoiceNo}.pdf`, content: pdfBuffer }];
      } catch (e) {
        attachmentError = `Invoice attachment skipped: ${errorMessage(e)}`;
        console.error(`[notify] #${row.id} ${attachmentError}`);
      }
    }

    await getDriver(row.channel).send(msg);

    await prisma.notification.update({
      where: { id: row.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        attempts,
        body: redactBody(row.template, row.body),
        lastError: attachmentError,
      },
    });
    return true;
  } catch (e) {
    const failed = attempts >= row.maxAttempts;
    const delayMin = BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length) - 1];
    await prisma.notification.update({
      where: { id: row.id },
      data: {
        status: failed ? "FAILED" : "PENDING",
        attempts,
        lastError: errorMessage(e),
        ...(failed ? {} : { scheduledFor: new Date(Date.now() + delayMin * 60_000) }),
      },
    });
    console.error(`[notify] #${row.id} ${row.template} -> ${row.toAddress} attempt ${attempts} failed${failed ? " (FAILED)" : ""}:`, e);
    return false;
  }
}

/** Worker tick: recover stuck rows, then claim and send a batch of due rows. */
export async function processDueNotifications(): Promise<number> {
  await prisma.notification.updateMany({
    where: { status: "SENDING", updatedAt: { lt: new Date(Date.now() - STALE_SENDING_MS) } },
    data: { status: "PENDING" },
  });

  let processed = 0;
  for (;;) {
    // SKIP LOCKED: concurrent PM2 instances claim disjoint rows, so nothing is double-sent.
    // Prisma stores DateTime as UTC, hence UTC_TIMESTAMP rather than NOW().
    const ids = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM Notification
        WHERE status = 'PENDING' AND scheduledFor <= UTC_TIMESTAMP(3)
        ORDER BY priority, scheduledFor
        LIMIT ${CLAIM_BATCH}
        FOR UPDATE SKIP LOCKED`;
      const claimed = rows.map((r) => Number(r.id));
      if (claimed.length) {
        await tx.notification.updateMany({ where: { id: { in: claimed } }, data: { status: "SENDING" } });
      }
      return claimed;
    });
    if (ids.length === 0) break;

    const rows = await prisma.notification.findMany({ where: { id: { in: ids } } });
    for (const row of rows) {
      await deliver(row);
      processed++;
    }
    if (ids.length < CLAIM_BATCH) break;
  }
  return processed;
}

/** Retention: SENT rows are purged after 30 days; FAILED rows are kept for investigation. */
export async function purgeOldNotifications(): Promise<void> {
  const cutoff = new Date(Date.now() - SENT_RETENTION_DAYS * 86_400_000);
  await prisma.notification.deleteMany({ where: { status: "SENT", sentAt: { lt: cutoff } } });
}

function errorMessage(e: unknown): string {
  return (e instanceof Error ? e.message : String(e)).slice(0, 2000);
}

/** Order confirmation (HIGH): row is written durably; the send never blocks the caller. */
export async function queueOrderConfirmation(orderId: number, email: string): Promise<void> {
  try {
    await notify(
      {
        template: "order.confirmation",
        data: { orderId },
        to: email,
        priority: "HIGH",
        dedupeKey: `confirmation:order:${orderId}`,
      },
      { wait: false },
    );
  } catch (e) {
    console.error(`[notify] failed to queue confirmation for order ${orderId}:`, e);
  }
}
