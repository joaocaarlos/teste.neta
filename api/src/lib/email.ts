import nodemailer, { Transporter } from "nodemailer";
import { Resend } from "resend";
import { logger } from "./logger";

/**
 * Camada de envio de e-mail.
 * - Em produção: usa SMTP_HOST/PORT/USER/PASS
 * - Em dev sem SMTP: loga o conteúdo (Ethereal-like fallback).
 */

export interface SendOpts {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: Transporter | null = null;
let resend: Resend | null = null;
let initialized = false;

function init(): void {
  if (initialized) return;
  initialized = true;

  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    logger.info("[email] Resend transport ready");
  } else if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    logger.info({ host: process.env.SMTP_HOST }, "[email] SMTP transport ready");
  } else {
    logger.warn("[email] No SMTP_HOST set — emails will be logged only");
  }
}

export async function deliverEmail(opts: SendOpts): Promise<void> {
  init();
  const from = process.env.MAIL_FROM || "CapaCity <noreply@capacity.local>";

  if (resend) {
    try {
      const info = await resend.emails.send({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text || stripHtml(opts.html),
      });
      logger.info({ messageId: info.data?.id, to: opts.to }, "[email] sent via resend");
    } catch (err) {
      logger.error({ err, to: opts.to }, "[email] failed to send via resend");
    }
    return;
  }

  if (!transporter) {
    // Dev fallback: log o e-mail
    logger.info({ to: opts.to, subject: opts.subject, preview: opts.html.slice(0, 200) }, "[email-stub]");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || stripHtml(opts.html),
    });
    logger.info({ messageId: info.messageId, to: opts.to }, "[email] sent");
  } catch (err) {
    logger.error({ err, to: opts.to }, "[email] failed to send");
    // Não rethrow — falha de e-mail não deve quebrar fluxo do usuário
  }
}

export async function sendEmail(opts: SendOpts): Promise<void> {
  if (process.env.EMAIL_QUEUE_ENABLED === "false") {
    await deliverEmail(opts);
    return;
  }

  try {
    const { enqueueEmail } = await import("./email-queue");
    await enqueueEmail(opts);
  } catch (err) {
    logger.warn({ err, to: opts.to, subject: opts.subject }, "[email] queue unavailable; sending inline");
    await deliverEmail(opts);
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ─── Templates ───────────────────────────────────────────────────────────────────────────────────

/**
 * Templates de e-mail.
 *
 * Delega para `email-templates.ts` (templates HTML responsivos profissionais).
 * Mantém as signatures originais por compatibilidade com rotas existentes.
 */
import { emailTemplates as proTemplates } from "./email-templates";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

function priceBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export const emailTemplates = {
  welcome(name: string): { subject: string; html: string; text?: string } {
    return proTemplates.welcome(name);
  },

  emailVerify(token: string): { subject: string; html: string; text?: string } {
    return proTemplates.emailVerify(token);
  },

  passwordReset(token: string, name: string): { subject: string; html: string; text?: string } {
    return proTemplates.passwordReset(token, name);
  },

  proposalReceived(opts: { demandId: string; supplier: string; score: number; demandTitle: string }): { subject: string; html: string; text?: string } {
    return proTemplates.proposalReceived({
      demandTitle: opts.demandTitle,
      demandId: opts.demandId,
      proposalCount: 1,
      supplierName: opts.supplier,
    });
  },

  proposalAccepted(opts: { demandTitle: string; proposalId: string }): { subject: string; html: string; text?: string } {
    return proTemplates.proposalAccepted(opts);
  },

  contractSigned(opts: { contractId: string; signedBy: "demandante" | "fornecedor"; bothSigned: boolean }): { subject: string; html: string; text?: string } {
    return proTemplates.contractSigned({
      contractId: opts.contractId,
      otherParty: opts.signedBy,
    });
  },

  paymentReceived(opts: { orderId: string; amount: number }): { subject: string; html: string; text?: string } {
    return proTemplates.paymentReceived({
      orderId: opts.orderId,
      amount: priceBRL(opts.amount),
    });
  },

  paymentReleased(opts: { txId: string; gross: number }): { subject: string; html: string; text?: string } {
    return proTemplates.paymentReleased({
      orderId: opts.txId,
      amount: priceBRL(opts.gross),
    });
  },

  disputeOpened(opts: { disputeId: string; orderId: string; type: string }): { subject: string; html: string; text?: string } {
    return proTemplates.disputeOpened(opts);
  },

  kycApproved(opts: { companyName: string }): { subject: string; html: string; text?: string } {
    return proTemplates.kycApproved(opts);
  },

  kycRejected(opts: { companyName: string; reason: string }): { subject: string; html: string; text?: string } {
    return proTemplates.kycRejected(opts);
  },

  weeklyDigest(opts: { name: string; newDemands: number; newProposals: number; openOrders: number }): { subject: string; html: string; text?: string } {
    return proTemplates.weeklyDigest(opts);
  },
};

// Re-export para uso direto se preferir API tipada
export { emailTemplates as proEmailTemplates } from "./email-templates";
export { APP_URL };
