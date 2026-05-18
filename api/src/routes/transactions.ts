import { Router, Request, Response, NextFunction } from "express";
import { query } from "../db";
import { authenticate, authorize } from "../middleware/auth";
import { audit } from "../lib/audit";
import { sseEmit } from "../lib/sse";
import { emailTemplates, sendEmail } from "../lib/email";
import { amountToCents, isStripeEnabled, stripe } from "../lib/stripe";
import { createNotification } from "./notifications";

const router = Router();

router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, status, party } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (req.user!.role !== "admin" && req.user!.companyId) {
      conditions.push(
        `t.order_id IN (SELECT id FROM orders WHERE client_id = $${p} OR supplier_id = $${p})`
      );
      params.push(req.user!.companyId); p++;
    }
    if (orderId) { conditions.push(`t.order_id = $${p}`); params.push(orderId); p++; }
    if (status)  { conditions.push(`t.status = $${p}`);   params.push(status);  p++; }
    if (party)   { conditions.push(`t.party ILIKE $${p}`); params.push(`%${party}%`); p++; }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT t.*, (t.gross - t.commission) AS liquido
       FROM transactions t ${where} ORDER BY t.date DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/stats/summary", authenticate, authorize("admin"), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'Retido')        AS retido_count,
        COALESCE(SUM(gross) FILTER (WHERE status = 'Retido'),0)        AS retido_total,
        COUNT(*) FILTER (WHERE status = 'Liberado')      AS liberado_count,
        COALESCE(SUM(gross) FILTER (WHERE status = 'Liberado'),0)      AS liberado_total,
        COUNT(*) FILTER (WHERE status = 'Em disputa')    AS disputa_count,
        COALESCE(SUM(gross) FILTER (WHERE status = 'Em disputa'),0)    AS disputa_total,
        COALESCE(SUM(commission),0)                                    AS total_commission,
        COALESCE(SUM(gross),0)                                          AS gmv_total
      FROM transactions
    `);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get("/:id/attempts", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const own = await query<{ client_id: string | null; supplier_id: string | null }>(
      `SELECT o.client_id, o.supplier_id
       FROM transactions t
       LEFT JOIN orders o ON o.id = t.order_id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (!own.rows[0]) return res.status(404).json({ error: "Transacao nao encontrada." });
    if (
      req.user!.role !== "admin" &&
      own.rows[0].client_id !== req.user!.companyId &&
      own.rows[0].supplier_id !== req.user!.companyId
    ) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    const { rows } = await query(
      `SELECT id, provider, provider_ref, status, amount, created_at
       FROM transaction_payment_attempts
       WHERE transaction_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post("/:id/checkout", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query<{
      id: string; order_id: string; gross: string; status: string;
      client_id: string; supplier_id: string; product: string; client: string; supplier: string | null;
    }>(
      `SELECT t.id, t.order_id, t.gross, t.status,
              o.client_id, o.supplier_id, o.product, o.client, c.name AS supplier
       FROM transactions t
       LEFT JOIN orders o ON o.id = t.order_id
       LEFT JOIN companies c ON c.id = o.supplier_id
       WHERE t.id = $1`,
      [req.params.id]
    );
    const tx = rows[0];
    if (!tx) return res.status(404).json({ error: "Transacao nao encontrada." });
    if (req.user!.role !== "admin" && tx.client_id !== req.user!.companyId) {
      return res.status(403).json({ error: "Apenas o cliente do pedido pode iniciar o pagamento." });
    }
    if (tx.status === "Retido" || tx.status === "Liberado") {
      return res.status(409).json({ error: `Transacao ja processada (status atual: ${tx.status}).` });
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: tx.id,
      success_url: `${appUrl}/financeiro?checkout=success&tx=${encodeURIComponent(tx.id)}`,
      cancel_url: `${appUrl}/financeiro?checkout=cancel&tx=${encodeURIComponent(tx.id)}`,
      metadata: {
        transactionId: tx.id,
        orderId: tx.order_id || "",
        clientCompanyId: tx.client_id || "",
        supplierCompanyId: tx.supplier_id || "",
      },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: (process.env.STRIPE_CURRENCY || "brl").toLowerCase(),
          unit_amount: amountToCents(tx.gross),
          product_data: {
            name: tx.product || `Pedido ${tx.order_id}`,
            description: `CapaCity ${tx.order_id} - ${tx.client} -> ${tx.supplier || "Fornecedor"}`,
          },
        },
      }],
      payment_intent_data: {
        metadata: { transactionId: tx.id, orderId: tx.order_id || "" },
      },
    });

    await query(
      `UPDATE transactions
       SET status = 'Pendente',
           payment_provider = 'stripe',
           payment_method = 'stripe_checkout',
           provider_session_id = $2,
           checkout_url = $3
       WHERE id = $1`,
      [tx.id, session.id, session.url || null]
    );
    await query(
      `INSERT INTO transaction_payment_attempts
         (transaction_id, provider, provider_ref, status, amount, raw)
       VALUES ($1,'stripe',$2,$3,$4,$5)`,
      [tx.id, session.id, session.status || "created", Number(tx.gross), JSON.stringify(session)]
    );
    await audit(req, "Checkout Stripe criado", "financeiro", tx.id);
    res.status(201).json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) { next(err); }
});

router.get("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT t.*, (t.gross - t.commission) AS liquido,
              o.client_id, o.supplier_id
       FROM transactions t
       LEFT JOIN orders o ON o.id = t.order_id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Transação não encontrada." });

    const t = rows[0] as { client_id: string; supplier_id: string };
    if (
      req.user!.role !== "admin" &&
      t.client_id !== req.user!.companyId &&
      t.supplier_id !== req.user!.companyId
    ) {
      return res.status(403).json({ error: "Permissão insuficiente." });
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post("/:id/release", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cur = await query<{
      status: string; gross: string; commission: string;
      client_id: string; supplier_id: string; supplier_email: string | null;
      stripe_account_id: string | null; stripe_payouts_enabled: boolean;
      transfer_provider_id: string | null;
    }>(
      `SELECT t.status, t.gross, t.commission, t.transfer_provider_id,
              o.client_id, o.supplier_id,
              c.stripe_account_id, c.stripe_payouts_enabled,
              (SELECT email FROM users WHERE company_id = o.supplier_id AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1) AS supplier_email
       FROM transactions t LEFT JOIN orders o ON o.id = t.order_id
       LEFT JOIN companies c ON c.id = o.supplier_id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (!cur.rows[0]) return res.status(404).json({ error: "Transação não encontrada." });

    if (req.user!.role !== "admin" && cur.rows[0].client_id !== req.user!.companyId) {
      return res.status(403).json({ error: "Apenas o cliente do pedido pode liberar o pagamento." });
    }
    if (cur.rows[0].status !== "Retido") {
      return res.status(409).json({ error: `Transação não pode ser liberada (status atual: ${cur.rows[0].status}).` });
    }

    const tx = cur.rows[0];
    const netAmount = Number(tx.gross || 0) - Number(tx.commission || 0);
    let transferId: string | null = tx.transfer_provider_id;
    let transferStatus = tx.transfer_provider_id ? "transferred" : "manual_required";

    if (!transferId && tx.stripe_account_id && tx.stripe_payouts_enabled && isStripeEnabled()) {
      const transfer = await stripe().transfers.create({
        amount: amountToCents(netAmount),
        currency: (process.env.STRIPE_CURRENCY || "brl").toLowerCase(),
        destination: tx.stripe_account_id,
        description: `Repasse CapaCity ${req.params.id}`,
        metadata: {
          transactionId: req.params.id,
          supplierCompanyId: tx.supplier_id || "",
        },
      }, { idempotencyKey: `capacity-transfer-${req.params.id}` });
      transferId = transfer.id;
      transferStatus = "transferred";
      await query(
        `INSERT INTO transaction_payment_attempts
           (transaction_id, provider, provider_ref, status, amount, raw)
         VALUES ($1,'stripe_transfer',$2,$3,$4,$5)`,
        [req.params.id, transfer.id, "created", netAmount, JSON.stringify(transfer)]
      );
    }

    const { rows } = await query(
      `UPDATE transactions
       SET status = 'Liberado',
           released_at = NOW(),
           transfer_provider_id = COALESCE($2, transfer_provider_id),
           transfer_status = $3,
           transfer_amount = $4,
           transferred_at = CASE WHEN $3 = 'transferred' THEN COALESCE(transferred_at, NOW()) ELSE transferred_at END
       WHERE id = $1 AND status = 'Retido'
       RETURNING *`,
      [req.params.id, transferId, transferStatus, netAmount]
    );

    sseEmit(`company:${cur.rows[0].supplier_id}`, {
      type: "payment.released",
      payload: { transactionId: req.params.id, gross: rows[0].gross, transferStatus },
    });
    void createNotification({
      user_role: "fornecedor",
      tipo: "pagamento",
      icone: "$",
      titulo: "Pagamento liberado",
      descricao: `Transacao ${req.params.id} liberada para repasse`,
      group_key: `transaction:${req.params.id}:released`,
    }).catch(() => undefined);
    if (cur.rows[0].supplier_email) {
      const tpl = emailTemplates.paymentReleased({ txId: req.params.id, gross: Number(rows[0].gross || 0) });
      void sendEmail({ to: cur.rows[0].supplier_email, ...tpl });
    }

    await audit(req, "Pagamento liberado", "financeiro", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post("/:id/refund", authenticate, authorize("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query<{
      id: string; gross: string; commission: string; status: string;
      provider_payment_intent_id: string | null;
      transfer_provider_id: string | null;
      transfer_amount: string | null;
    }>(
      "SELECT id, gross, commission, status, provider_payment_intent_id, transfer_provider_id, transfer_amount FROM transactions WHERE id = $1",
      [req.params.id]
    );
    const tx = rows[0];
    if (!tx) return res.status(404).json({ error: "Transacao nao encontrada." });
    if (!tx.provider_payment_intent_id) {
      return res.status(409).json({ error: "Transacao sem pagamento Stripe confirmado." });
    }
    if (tx.status === "Cancelado") {
      return res.status(409).json({ error: "Transacao ja cancelada/reembolsada." });
    }

    const amount = req.body?.amount ? amountToCents(req.body.amount) : undefined;
    let reversalId: string | null = null;
    if (tx.transfer_provider_id) {
      const gross = Number(tx.gross || 0);
      const net = Number(tx.gross || 0) - Number(tx.commission || 0);
      const refundGross = req.body?.amount ? Number(req.body.amount) : gross;
      const reversalAmount = gross > 0 ? Math.round((refundGross / gross) * net * 100) : undefined;
      const reversal = await stripe().transfers.createReversal(tx.transfer_provider_id, {
        ...(reversalAmount ? { amount: reversalAmount } : {}),
        description: `Reversao de repasse CapaCity ${tx.id}`,
        metadata: { transactionId: tx.id },
      }, { idempotencyKey: `capacity-transfer-reversal-${tx.id}-${amount || "full"}` });
      reversalId = reversal.id;
      await query(
        `INSERT INTO transaction_payment_attempts
           (transaction_id, provider, provider_ref, status, amount, raw)
         VALUES ($1,'stripe_transfer_reversal',$2,$3,$4,$5)`,
        [tx.id, reversal.id, "created", reversalAmount ? reversalAmount / 100 : Number(tx.transfer_amount || 0), JSON.stringify(reversal)]
      );
    }
    const refund = await stripe().refunds.create({
      payment_intent: tx.provider_payment_intent_id,
      ...(amount ? { amount } : {}),
      metadata: { transactionId: tx.id },
      reason: ["duplicate", "fraudulent", "requested_by_customer"].includes(req.body?.reason) ? req.body.reason : undefined,
    });

    const updated = await query(
      `UPDATE transactions
       SET status = 'Cancelado',
           refunded_at = NOW(),
           refund_provider_id = $2,
           refund_amount = $3,
           refund_status = $4,
           refund_reason = $5,
           transfer_status = CASE WHEN $6::text IS NULL THEN transfer_status ELSE 'reversed' END
       WHERE id = $1
       RETURNING *`,
      [tx.id, refund.id, Number(refund.amount || 0) / 100, refund.status || "created", req.body?.reason || null, reversalId]
    );
    await query(
      `INSERT INTO transaction_payment_attempts
         (transaction_id, provider, provider_ref, status, amount, raw)
       VALUES ($1,'stripe',$2,$3,$4,$5)`,
      [tx.id, refund.id, refund.status || "refund_created", Number(refund.amount || 0) / 100, JSON.stringify(refund)]
    );
    await audit(req, "Reembolso Stripe criado", "financeiro", tx.id);
    res.status(201).json(updated.rows[0]);
  } catch (err) { next(err); }
});

router.post("/:id/dispute", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cur = await query<{ client_id: string; supplier_id: string }>(
      `SELECT o.client_id, o.supplier_id
       FROM transactions t LEFT JOIN orders o ON o.id = t.order_id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (!cur.rows[0]) return res.status(404).json({ error: "Transação não encontrada." });
    if (
      req.user!.role !== "admin" &&
      cur.rows[0].client_id !== req.user!.companyId &&
      cur.rows[0].supplier_id !== req.user!.companyId
    ) {
      return res.status(403).json({ error: "Permissão insuficiente." });
    }

    const { rows } = await query(
      "UPDATE transactions SET status = 'Em disputa' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    await audit(req, "Transação em disputa", "financeiro", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
