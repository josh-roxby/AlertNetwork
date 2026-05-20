// SMTP transport wrapper. Reads SMTP_* env vars and exposes a single
// `sendMail` function backed by a pooled nodemailer transport.
//
// Why a single shared module:
//   - Both `/api/cron/reports` (batched send) and
//     `/api/reports/[id]/send-test` (one-off) call this.
//   - Pooling keeps the SMTP socket alive across multiple sends in
//     the same function invocation — Gmail's 587 endpoint penalises
//     callers that open a fresh connection per message.
//
// Env (see `.env.example`):
//   SMTP_HOST       smtp.gmail.com
//   SMTP_PORT       587
//   SMTP_USER       ora@exhale.studio
//   SMTP_PASSWORD   <16-char Google App Password, no spaces>
//   SMTP_FROM       "Alert Network <ora@exhale.studio>"

import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
};

let cachedTransport: Transporter | null = null;
let cachedFrom: string | null = null;

function readConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM ?? (user ? `Alert Network <${user}>` : "");

  const missing: string[] = [];
  if (!host) missing.push("SMTP_HOST");
  if (!portStr) missing.push("SMTP_PORT");
  if (!user) missing.push("SMTP_USER");
  if (!password) missing.push("SMTP_PASSWORD");
  if (!from) missing.push("SMTP_FROM (or SMTP_USER to derive)");
  if (missing.length > 0) {
    throw new Error(
      `SMTP not configured. Missing env: ${missing.join(", ")}. ` +
        `See .env.example.`,
    );
  }

  const port = Number(portStr);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`SMTP_PORT must be a positive integer, got "${portStr}"`);
  }

  return { host: host!, port, user: user!, password: password!, from };
}

function getTransport(): { transport: Transporter; from: string } {
  if (cachedTransport && cachedFrom) {
    return { transport: cachedTransport, from: cachedFrom };
  }
  const cfg = readConfig();
  cachedTransport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    // 587 uses STARTTLS — `secure: false` lets nodemailer upgrade
    // the connection after STARTTLS. 465 would set secure: true.
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.password },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  });
  cachedFrom = cfg.from;
  return { transport: cachedTransport, from: cfg.from };
}

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendMailResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

// Sends one email. Returns ok=true on accepted SMTP response.
// Never throws — wraps the error so a single bad recipient address
// doesn't abort the whole batch in the cron route.
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  try {
    const { transport, from } = getTransport();
    const info = await transport.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "SMTP send failed",
    };
  }
}
