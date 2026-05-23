import { Request, Response, NextFunction } from "express";
import { query, transaction } from "../db";
import { stripe } from "../lib/stripe";
import { logger } from "../lib/logger";
import { sseEmit } from "../lib/sse";
import { audit } from "../lib/audit";
import { emailTemplates, sendEmail } from "../lib/email";
import { createNotification } from "./notifications";

async function markEventProcessed(eventId: string): Promise<boolean> {
  try {
    const res = await query(
      `INSERT INTO stripe_events (event_id, processed_at) VALUES ($1, NOW()) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
      [eventId]
    );
    return (res.rowCount ?? 0) > 0;
  } catch { return true; }
}

export async function stripeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return res.status(501).json({ error: "STRIPE_WEBHOOK_SECRET nao configurado." });
    const signature = req.get("stripe-signature");
    if (!signature) return res.status(400).json({ error: "Stripe signature ausente." });
    let event: ReturnType<ReturnType<typeof stripe>["webhooks"]["constructEvent"]>;
    try {
      event = stripe().webhooks.constructEvent(req.body, signature, secret);
    } catch (err) {
      logger.warn({ err }, "[stripe-webhook] signature invalid");
      return res.status(400).json({ error: `Webhook Stripe invalido: ${(err as Error).message}` });
    }
    logger.info({ eventId: event.id, type: event.type }, "[stripe-webhook] received");
    const isNew = await markEventProcessed(event.id);
    if (!isNew) {
      logger.info({ eventId: event.id }, "[stripe-webhook] duplicate, skipping");
      return res.json({ received: true, duplicate: true });
    }
    res.json({ received: true });
    setImmediate(() => processStripeEvent(event).catch((err) => {
      logger.error({ err, eventId: event.id, type: event.type }, "[stripe-webhook] processing error");
    }));
  } catch (err) { next(err); }
}

interface StripePayload {
  id?: string;
  metadata?: Record<string, string> | null;
  payment_intent?: string | { id?: string };
  payment_status?: string;
  amount_total?: number;
  payment_method?: string;
  charge?: string;
  amount?: number;
  reason?: string;
  last_payment_error?: { message?: string };
}

async function processStripeEvent(event: { id: string; type: string; data: { object: unknown } }) {
  const obj = event.data.object as StripePayload;
  switch (event.type) {
    case "checkout.session.completed": {
      const txId = obj.metadata?.transactionId;
      if (!txId) { logger.warn({ eventId: event.id }, "[stripe] no transactionId in metadata"); break; }
      const paymentIntentId = typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent?.id;
      const result = await transaction(async (client) => {
        const { rows } = await client.query<{ supplier_id: string | null; client_id: string | null; gross: string; order_id: string; supplier_email: string | null }>(
          `UPDATE transactions t SET status = 'Retido', payment_provider = 'stripe', payment_method = COALESCE(payment_method, 'stripe_checkout'), provider_session_id = $2, provider_payment_intent_id = COALESCE($3, provider_payment_intent_id), paid_at = COALESCE(paid_at, NOW())
           FROM orders o WHERE t.order_id = o.id AND t.id = $1 AND t.status IN ('Pendente','Retido')
           RETURNING o.supplier_id, o.client_id, t.gross, t.order_id, (SELECT email FROM users WHERE company_id = o.supplier_id AND deleted_at IS NULL ORDER BY created_at LIMIT 1) AS supplier_email`,
          [txId, obj.id, paymentIntentId || null]
        );
        await client.query(
          `INSERT INTO transaction_payment_attempts (transaction_id, provider, provider_ref, status, amount, raw) VALUES ($1, 'stripe', $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
          [txId, obj.id, obj.payment_status || "paid", Number(obj.amount_total || 0) / 100, JSON.stringify({ id: obj.id, amount: obj.amount_total, status: obj.payment_status })]
        ).catch((err) => logger.warn({ err, txId }, "[stripe] failed to store payment attempt"));
        return rows[0];
      });
      if (result?.supplier_id) {
        sseEmit(`company:${result.supplier_id}`, { type: "payment.held", payload: { transactionId: txId, gross: result.gross } });
        void createNotification({ user_role: "fornecedor", tipo: "pagamento", icone: "$", titulo: "Pagamento retido", descricao: `Transacao ${txId} confirmada e retida ate entrega/aprovacao`, group_key: `transaction:${txId}:held` }).catch(() => undefined);
      }
      if (result?.supplier_email) {
        const tpl = emailTemplates.paymentReleased ? emailTemplates.paymentReleased({ txId, gross: Number(result.gross) }) : { subject: `Pagamento retido - Pedido ${result.order_id}`, html: `Pagamento de R$ ${result.gross} foi retido com sucesso.` };
        void sendEmail({ to: result.supplier_email, ...tpl }).catch(() => {});
      }
      logger.info({ txId, orderId: result?.order_id }, "[stripe] checkout.session.completed processed");
      break;
    }
    case "checkout.session.expired": {
      const txId = obj.metadata?.transactionId;
      if (!txId) break;
      await query(`UPDATE transactions SET status = 'Cancelado', provider_session_id = COALESCE(provider_session_id, $2) WHERE id = $1 AND status = 'Pendente'`, [txId, obj.id]);
      logger.info({ txId }, "[stripe] checkout.session.expired, transaction cancelled");
      break;
    }
    case "charge.refunded": {
      const paymentIntentId = typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent?.id;
      if (!paymentIntentId) break;
      const { rows } = await query<{ id: string; order_id: string }>(`UPDATE transactions SET status = 'Estornado' WHERE provider_payment_intent_id = $1 AND status IN ('Retido','Liberado') RETURNING id, order_id`, [paymentIntentId]);
      if (rows[0]) logger.info({ txId: rows[0].id, orderId: rows[0].order_id }, "[stripe] charge.refunded processed");
      break;
    }
    case "payment_intent.payment_failed": {
      const txId = obj.metadata?.transactionId;
      if (txId) {
        logger.warn({ txId, reason: obj.last_payment_error?.message }, "[stripe] payment_intent.payment_failed");
        await query(`INSERT INTO transaction_payment_attempts (transaction_id, provider, provider_ref, status, amount, raw) VALUES ($1, 'stripe', $2, 'failed', 0, $3) ON CONFLICT DO NOTHING`, [txId, obj.id, JSON.stringify({ error: obj.last_payment_error?.message })]).catch(() => {});
      }
      break;
    }
    case "charge.dispute.created": {
      logger.warn({ chargeId: obj.charge, amount: obj.amount }, "[stripe] chargeback dispute created");
      await query(`INSERT INTO audit_logs (evento, usuario, empresa, ip, data, tipo, ref, user_id, created_at) VALUES ($1, 'Sistema', NULL, NULL, $2, 'stripe_dispute', $3, NULL, NOW())`, [`Chargeback Stripe aberto: ${obj.reason || "unknown"}`, new Date().toLocaleString("pt-BR"), obj.charge]).catch(() => {});
      break;
    }
    default:
      logger.debug({ type: event.type, eventId: event.id }, "[stripe-webhook] unhandled event type");
  }
}
