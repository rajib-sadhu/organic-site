// Notification drivers (ARCHITECTURE §6.14). Selected per channel from .env:
//   EMAIL_DRIVER = log | resend      SMS_DRIVER = log
// Call sites never use these directly — they go through notify().
import { appendFile, mkdir } from "fs/promises";
import path from "path";
import type { NotifChannel } from "@/generated/prisma/client";
import { getResend } from "@/server/lib/resend";

export type OutboundMessage = {
  channel: NotifChannel;
  to: string;
  subject: string | null;
  body: string;
  attachments?: { filename: string; content: Buffer }[];
};

export type NotificationDriver = {
  name: string;
  send(msg: OutboundMessage): Promise<void>;
};

// Dev/staging: writes the full message (unredacted) to stdout + a gitignored log file.
const logDriver: NotificationDriver = {
  name: "log",
  async send(msg) {
    const entry = [
      `[${new Date().toISOString()}] ${msg.channel} -> ${msg.to}`,
      msg.subject ? `Subject: ${msg.subject}` : null,
      msg.attachments?.length ? `Attachments: ${msg.attachments.map((a) => a.filename).join(", ")}` : null,
      "",
      msg.body,
    ]
      .filter((line) => line !== null)
      .join("\n");

    console.log(`[notify:log]\n${entry}\n`);

    const file = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.NOTIFICATION_LOG_FILE || "logs/notifications.log");
    await mkdir(path.dirname(file), { recursive: true });
    await appendFile(file, `${entry}\n${"-".repeat(72)}\n`);
  },
};

const resendDriver: NotificationDriver = {
  name: "resend",
  async send(msg) {
    // The Resend SDK reports failures in the result rather than throwing.
    const { error } = await getResend().emails.send({
      from: process.env.EMAIL_FROM as string,
      to: msg.to,
      subject: msg.subject ?? "",
      html: msg.body,
      attachments: msg.attachments,
    });
    if (error) throw new Error(`Resend: ${error.name}: ${error.message}`);
  },
};

const DRIVERS: Record<NotifChannel, Record<string, NotificationDriver>> = {
  EMAIL: { log: logDriver, resend: resendDriver },
  SMS: { log: logDriver },
};

const ENV_KEY: Record<NotifChannel, string> = { EMAIL: "EMAIL_DRIVER", SMS: "SMS_DRIVER" };

export function getDriver(channel: NotifChannel): NotificationDriver {
  const name = process.env[ENV_KEY[channel]] || "log";
  const driver = DRIVERS[channel][name];
  if (!driver) {
    throw new Error(`Unknown ${ENV_KEY[channel]} "${name}". Valid: ${Object.keys(DRIVERS[channel]).join(", ")}.`);
  }
  return driver;
}

/**
 * Fail fast at startup: an unknown driver, or a real driver without its
 * credentials, must stop the server — never silently fall back to `log`.
 */
export function assertDriverConfig(): void {
  const email = getDriver("EMAIL");
  getDriver("SMS");

  if (email.name === "resend") {
    const missing = ["RESEND_API_KEY", "EMAIL_FROM"].filter((k) => !process.env[k]);
    if (missing.length) {
      throw new Error(`EMAIL_DRIVER=resend requires ${missing.join(" and ")} in .env.`);
    }
  }
}
