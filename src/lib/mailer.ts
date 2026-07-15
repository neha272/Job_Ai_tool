import "server-only";
import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

export interface SendOptions {
  to: string;
  subject: string;
  text: string;
  attachmentPath?: string;
  attachmentName?: string;
}

// Interface so an OAuth-backed mailer can swap in later without touching call sites.
export interface Mailer {
  verify(): Promise<void>;
  send(opts: SendOptions): Promise<{ messageId: string }>;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`${name} is not set. Configure SMTP in .env, then restart.`);
  }
  return v;
}

class NodemailerMailer implements Mailer {
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    const port = Number(process.env.SMTP_PORT || 465);
    this.transporter = nodemailer.createTransport({
      host: requireEnv("SMTP_HOST"),
      port,
      secure: port === 465,
      auth: { user: requireEnv("SMTP_USER"), pass: requireEnv("SMTP_PASS") },
    });
  }

  async verify(): Promise<void> {
    await this.transporter.verify();
  }

  async send(opts: SendOptions): Promise<{ messageId: string }> {
    const from = requireEnv("MAIL_FROM");
    const info = await this.transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      attachments: opts.attachmentPath
        ? [
            {
              filename: opts.attachmentName || "resume.pdf",
              path: opts.attachmentPath,
              contentType: "application/pdf",
            },
          ]
        : undefined,
    });
    logger.info("mailer", "sent", { to: opts.to, messageId: info.messageId });
    return { messageId: info.messageId };
  }
}

let mailer: Mailer | null = null;

export function getMailer(): Mailer {
  if (!mailer) mailer = new NodemailerMailer();
  return mailer;
}
