import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { query } from "../db";
import { authenticate } from "../middleware/auth";
import { audit } from "../lib/audit";
import { validate } from "../lib/validators";
import { assertTransition, orderTransitions } from "../lib/state-machine";
import { sseEmit } from "../lib/sse";
import { makeUploader, persistUpload } from "../lib/upload";

const router = Router();
const orderUpload = makeUploader("doc");
const ORDER_DEADLINE_TS =
  "CASE WHEN o.deadline ~ '^\\d{4}-\\d{2}-\\d{2}' THEN o.deadline::timestamptz ELSE NULL END";

async function getOrderParties(orderId: string) {
  const { rows } = await query<{ client_id: string | null; supplier_id: string | null; pct: number }>(
    "SELECT client_id, supplier_id, pct FROM orders WHERE id = $1",
    [orderId]
  );
  return rows[0];
}

function canAccessOrder(req: Request, order: { client_id: string | null; supplier_id: string | null }): boolean {
  return req.user!.role === "admin" ||
    order.client_id === req.user!.companyId ||
    order.supplier_id === req.user!.companyId;
}

router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, slaStatus, search } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (req.user!.role !== "admin" && req.user!.companyId) {
      conditions.push(`(o.client_id = $${p} OR o.supplier_id = $${p})`);
      params.push(req.user!.companyId); p++;
    }
    if (status)    { conditions.push(`o.status = $${p}`); params.push(status); p++; }
    if (slaStatus) {
      conditions.push(`(
        CASE
          WHEN ${ORDER_DEADLINE_TS} IS NOT NULL AND NOW() > ${ORDER_DEADLINE_TS} THEN 'overdue'
          WHEN ${ORDER_DEADLINE_TS} IS NOT NULL AND NOW() > ${ORDER_DEADLINE_TS} - INTERVAL '24 hours' THEN 'at_risk'
          ELSE 'on_time'
        END
      ) = $${p}`);
      params.push(slaStatus); p++;
    }
    if (search) {
      conditions.push(`(o.id ILIKE $${p} OR o.product ILIKE $${p} OR o.client ILIKE $${p})`);
      params.push(`%${search}%`); p++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT o.*,
              c1.name AS client_company_name,
              c2.name AS supplier_company_name,
              CASE
                WHEN ${ORDER_DEADLINE_TS} IS NOT NULL AND NOW() > ${ORDER_DEADLINE_TS} THEN 'overdue'
                WHEN ${ORDER_DEADLINE_TS} IS NOT NULL AND NOW() > ${ORDER_DEADLINE_TS} - INTERVAL '24 hours' THEN 'at_risk'
                ELSE 'on_time'
              END AS sla_status_computed,
              CASE
                WHEN ${ORDER_DEADLINE_TS} IS NOT NULL
                THEN EXTRACT(EPOCH FROM (${ORDER_DEADLINE_TS} - NOW())) / 3600
                ELSE NULL
              END AS hours_until_deadline
       FROM orders o
       LEFT JOIN companies c1 ON c1.id = o.client_id
       LEFT JOIN companies c2 ON c2.id = o.supplier_id
       ${where}
       ORDER BY o.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT o.*, c1.name AS client_company_name, c2.name AS supplier_company_name
       FROM orders o
       LEFT JOIN companies c1 ON c1.id = o.client_id
       LEFT JOIN companies c2 ON c2.id = o.supplier_id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Pedido não encontrado." });

    const order = rows[0] as { client_id: string; supplier_id: string };
    if (
      req.user!.role !== "admin" &&
      order.client_id !== req.user!.companyId &&
      order.supplier_id !== req.user!.companyId
    ) {
      return res.status(403).json({ error: "Permissão insuficiente." });
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.patch(
  "/:id/status",
  authenticate,
  validate([
    body("status").isString().notEmpty(),
    body("pct").optional().isInt({ min: 0, max: 100 }),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, pct } = req.body as { status: string; pct?: number };

      const cur = await query<{ status: string; client_id: string; supplier_id: string }>(
        "SELECT status, client_id, supplier_id FROM orders WHERE id = $1",
        [req.params.id]
      );
      if (!cur.rows[0]) return res.status(404).json({ error: "Pedido não encontrado." });

      if (
        req.user!.role !== "admin" &&
        cur.rows[0].client_id !== req.user!.companyId &&
        cur.rows[0].supplier_id !== req.user!.companyId
      ) {
        return res.status(403).json({ error: "Permissão insuficiente." });
      }

      try {
        assertTransition(orderTransitions, cur.rows[0].status, status, "status do pedido");
      } catch (e) {
        return res.status(400).json({ error: (e as Error).message });
      }

      const { rows } = await query(
        `UPDATE orders SET status = $1, pct = COALESCE($2, pct) WHERE id = $3 RETURNING *`,
        [status, pct ?? null, req.params.id]
      );

      if (status === "Entregue") {
        await query(
          `UPDATE transactions SET status = 'Liberado', released_at = NOW()
           WHERE order_id = $1 AND status = 'Retido'`,
          [req.params.id]
        );

        // Trigger NPS surveys for users of both companies (non-blocking)
        query(
          `INSERT INTO nps_surveys (order_id, user_id, role)
           SELECT $1, u.id, u.role
           FROM users u
           WHERE u.company_id IN (
             SELECT client_id FROM orders WHERE id = $1
             UNION
             SELECT supplier_id FROM orders WHERE id = $1
           )
           ON CONFLICT (order_id, user_id) DO NOTHING`,
          [req.params.id]
        ).catch(() => {});
      }

      sseEmit(`company:${cur.rows[0].client_id}`, {
        type: "order.status",
        payload: { orderId: req.params.id, status, pct },
      });
      sseEmit(`company:${cur.rows[0].supplier_id}`, {
        type: "order.status",
        payload: { orderId: req.params.id, status, pct },
      });

      await audit(req, `Status atualizado: ${status}`, "producao", `${req.params.id} – ${pct ?? "—"}%`);
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

router.post(
  "/:id/updates",
  authenticate,
  validate([
    body("message").isString().trim().notEmpty().isLength({ max: 2000 }),
    body("icon").optional().isString().isLength({ max: 10 }),
    body("pct_at").optional().isInt({ min: 0, max: 100 }),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cur = await query<{ client_id: string; supplier_id: string; pct: number }>(
        "SELECT client_id, supplier_id, pct FROM orders WHERE id = $1",
        [req.params.id]
      );
      if (!cur.rows[0]) return res.status(404).json({ error: "Pedido nao encontrado." });
      if (
        req.user!.role !== "admin" &&
        cur.rows[0].client_id !== req.user!.companyId &&
        cur.rows[0].supplier_id !== req.user!.companyId
      ) {
        return res.status(403).json({ error: "Permissao insuficiente." });
      }

      const { rows } = await query(
        `INSERT INTO order_updates (order_id, user_id, icon, message, pct_at)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [req.params.id, req.user!.userId, req.body.icon || "note", req.body.message, req.body.pct_at ?? cur.rows[0].pct]
      );

      sseEmit(`company:${cur.rows[0].client_id}`, { type: "order.update", payload: rows[0] });
      sseEmit(`company:${cur.rows[0].supplier_id}`, { type: "order.update", payload: rows[0] });
      await audit(req, "Atualizacao de pedido adicionada", "producao", req.params.id);
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

router.post("/:id/attachments", authenticate, orderUpload.array("files", 5), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cur = await query<{ client_id: string; supplier_id: string }>(
      "SELECT client_id, supplier_id FROM orders WHERE id = $1",
      [req.params.id]
    );
    if (!cur.rows[0]) return res.status(404).json({ error: "Pedido nao encontrado." });
    if (
      req.user!.role !== "admin" &&
      cur.rows[0].client_id !== req.user!.companyId &&
      cur.rows[0].supplier_id !== req.user!.companyId
    ) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) return res.status(400).json({ error: "Nenhum arquivo enviado." });
    const saved = [];
    for (const file of files) saved.push(await persistUpload(req, file, "order", req.params.id, false));
    await audit(req, "Arquivo anexado ao pedido", "producao", req.params.id);
    res.status(201).json({ files: saved, data: saved });
  } catch (err) { next(err); }
});

router.get("/:id/attachments", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await getOrderParties(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido nao encontrado." });
    if (!canAccessOrder(req, order)) return res.status(403).json({ error: "Permissao insuficiente." });
    const { rows } = await query(
      `SELECT id, original_name, mime_type, size_bytes, created_at, '/api/uploads/' || id AS url
       FROM uploaded_files
       WHERE entity_type = 'order' AND entity_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.patch(
  "/:id/tracking",
  authenticate,
  validate([
    body("tracking_code").optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
    body("tracking_carrier").optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await getOrderParties(req.params.id);
      if (!order) return res.status(404).json({ error: "Pedido nao encontrado." });
      if (req.user!.role !== "admin" && order.supplier_id !== req.user!.companyId) {
        return res.status(403).json({ error: "Apenas fornecedor ou admin atualiza rastreio." });
      }
      const { rows } = await query(
        `UPDATE orders
         SET tracking_code = $1, tracking_carrier = $2
         WHERE id = $3
         RETURNING *`,
        [req.body.tracking_code || null, req.body.tracking_carrier || null, req.params.id]
      );
      sseEmit(`company:${order.client_id}`, { type: "order.tracking", payload: rows[0] });
      await audit(req, "Rastreio atualizado", "producao", req.params.id);
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

router.get("/:id/deliveries", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await getOrderParties(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido nao encontrado." });
    if (!canAccessOrder(req, order)) return res.status(403).json({ error: "Permissao insuficiente." });
    const { rows } = await query(
      `SELECT od.*, u.name AS created_by_name
       FROM order_deliveries od
       LEFT JOIN users u ON u.id = od.created_by
       WHERE od.order_id = $1
       ORDER BY od.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post(
  "/:id/deliveries",
  authenticate,
  orderUpload.single("file"),
  validate([
    body("qty").optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
    body("pct").optional({ nullable: true }).isInt({ min: 1, max: 100 }).toInt(),
    body("notes").optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await getOrderParties(req.params.id);
      if (!order) return res.status(404).json({ error: "Pedido nao encontrado." });
      if (req.user!.role !== "admin" && order.supplier_id !== req.user!.companyId) {
        return res.status(403).json({ error: "Apenas fornecedor ou admin registra entrega." });
      }
      let attachmentUrl: string | null = null;
      if (req.file) {
        const saved = await persistUpload(req, req.file, "order_delivery", req.params.id, false);
        attachmentUrl = saved.url;
      }
      const { rows } = await query(
        `INSERT INTO order_deliveries (order_id, qty, pct, notes, attachment_url, created_by)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [req.params.id, req.body.qty || null, req.body.pct || null, req.body.notes || null, attachmentUrl, req.user!.userId]
      );
      sseEmit(`company:${order.client_id}`, { type: "order.delivery.created", payload: rows[0] });
      await audit(req, "Entrega parcial registrada", "producao", req.params.id);
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

router.patch("/:id/deliveries/:deliveryId", authenticate, validate([
  body("status").isIn(["Aceita", "Rejeitada"]),
  body("notes").optional({ nullable: true }).isString().trim().isLength({ max: 2000 }),
]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await getOrderParties(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido nao encontrado." });
    if (req.user!.role !== "admin" && order.client_id !== req.user!.companyId) {
      return res.status(403).json({ error: "Apenas demandante ou admin revisa entrega." });
    }
    const { rows } = await query<{ id: number; pct: number | null; status: string }>(
      `UPDATE order_deliveries
       SET status = $1, notes = COALESCE($2, notes), reviewed_by = $3, reviewed_at = NOW()
       WHERE id = $4 AND order_id = $5
       RETURNING *`,
      [req.body.status, req.body.notes || null, req.user!.userId, req.params.deliveryId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Entrega nao encontrada." });
    if (req.body.status === "Aceita" && rows[0].pct) {
      await query(
        `UPDATE orders
         SET pct = GREATEST(pct, $2),
             status = CASE WHEN $2 >= 100 THEN 'Entregue'::order_status ELSE status END
         WHERE id = $1`,
        [req.params.id, rows[0].pct]
      );
    }
    sseEmit(`company:${order.supplier_id}`, { type: "order.delivery.reviewed", payload: rows[0] });
    await audit(req, `Entrega ${req.body.status}`, "producao", `${req.params.id}/${req.params.deliveryId}`);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get("/:id/fiscal-documents", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await getOrderParties(req.params.id);
    if (!order) return res.status(404).json({ error: "Pedido nao encontrado." });
    if (!canAccessOrder(req, order)) return res.status(403).json({ error: "Permissao insuficiente." });
    const { rows } = await query(
      "SELECT * FROM fiscal_documents WHERE order_id = $1 ORDER BY created_at DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post(
  "/:id/fiscal-documents",
  authenticate,
  orderUpload.single("file"),
  validate([
    body("type").optional({ nullable: true }).isString().trim().isLength({ max: 30 }),
    body("number").optional({ nullable: true }).isString().trim().isLength({ max: 80 }),
    body("access_key").optional({ nullable: true }).isString().trim().isLength({ max: 80 }),
    body("amount").optional({ nullable: true }).isFloat({ min: 0 }).toFloat(),
    body("issued_at").optional({ nullable: true }).isISO8601(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await getOrderParties(req.params.id);
      if (!order) return res.status(404).json({ error: "Pedido nao encontrado." });
      if (req.user!.role !== "admin" && order.supplier_id !== req.user!.companyId) {
        return res.status(403).json({ error: "Apenas fornecedor ou admin anexa documento fiscal." });
      }
      let fileUrl: string | null = null;
      if (req.file) {
        const saved = await persistUpload(req, req.file, "fiscal_document", req.params.id, false);
        fileUrl = saved.url;
      }
      const { rows } = await query(
        `INSERT INTO fiscal_documents
           (order_id, type, number, access_key, amount, issued_at, file_url, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          req.params.id,
          req.body.type || "NF-e",
          req.body.number || null,
          req.body.access_key || null,
          req.body.amount || null,
          req.body.issued_at || null,
          fileUrl,
          req.user!.userId,
        ]
      );
      sseEmit(`company:${order.client_id}`, { type: "order.fiscal_document", payload: rows[0] });
      await audit(req, "Documento fiscal anexado", "producao", req.params.id);
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

const STATUS_STEPS = [
  "Publicado","Em cotação","Contratado","Em setup","Em produção",
  "Em inspeção","Aguardando coleta","Em transporte","Entregue","Finalizado"
];

router.get("/:id/timeline", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query("SELECT status, pct FROM orders WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Pedido não encontrado." });
    const { status, pct } = rows[0] as { status: string; pct: number };
    const currentIdx = STATUS_STEPS.indexOf(status);
    const timeline = STATUS_STEPS.map((s, i) => ({
      step: s,
      done: i < currentIdx,
      current: i === currentIdx,
      pct: i === currentIdx ? pct : i < currentIdx ? 100 : 0,
    }));
    res.json(timeline);
  } catch (err) { next(err); }
});

// ─── #19 Escrow / Payment flow ───────────────────────────────────────────────

/**
 * POST /:id/checkout — creates a Stripe Checkout session
 */
router.post("/:id/checkout", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT o.*, c.name AS buyer_name FROM orders o
       LEFT JOIN companies c ON c.id = o.buyer_company_id
       WHERE o.id = $1`,
      [req.params.id]
    );
    const order = rows[0];
    if (!order) return res.status(404).json({ error: "Pedido não encontrado." });
    if (order.payment_status !== "pending") {
      return res.status(409).json({ error: "Pedido já possui pagamento iniciado." });
    }

    const stripe = (await import("stripe")).default;
    const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });

    const amountCents = Math.round((order.value_raw || 0) * 100);
    const platformFeeCents = Math.round(amountCents * 0.05); // 5% platform fee

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: process.env.STRIPE_CURRENCY || "brl",
          product_data: { name: `Pedido #${order.id.slice(0, 8)}` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        capture_method: "automatic",
        metadata: { order_id: order.id },
      },
      success_url: `${process.env.APP_URL}/pedidos/${order.id}?payment=success`,
      cancel_url:  `${process.env.APP_URL}/pedidos/${order.id}?payment=cancelled`,
      metadata: { order_id: order.id },
    });

    await query(
      `UPDATE orders SET stripe_payment_intent_id = $1, payment_status = 'pending', platform_fee_amount = $2, updated_at = NOW() WHERE id = $3`,
      [session.payment_intent, platformFeeCents, order.id]
    );

    await audit(req, "Checkout Stripe criado", "order", order.id, { session_id: session.id });
    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) { next(err); }
});

/**
 * POST /:id/approve — buyer approves delivery, releases escrow
 */
router.post("/:id/approve", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT * FROM orders WHERE id = $1 AND buyer_company_id = (SELECT id FROM companies WHERE id = (SELECT company_id FROM users WHERE id = $2))`,
      [req.params.id, req.user!.userId]
    );
    const order = rows[0];
    if (!order) return res.status(404).json({ error: "Pedido não encontrado." });
    if (order.payment_status !== "captured") {
      return res.status(409).json({ error: "Pagamento não foi capturado ainda." });
    }

    const { rows: updated } = await query(
      `UPDATE orders SET payment_status = 'released', released_at = NOW(), status = 'Finalizado', updated_at = NOW() WHERE id = $1 RETURNING id, payment_status, released_at`,
      [req.params.id]
    );
    await audit(req, "Entrega aprovada pelo demandante", "order", req.params.id);
    res.json(updated[0]);
  } catch (err) { next(err); }
});

/**
 * POST /:id/dispute — buyer opens a dispute, blocking payment release
 */
router.post(
  "/:id/dispute",
  authenticate,
  validate([
    body("reason").isString().isLength({ min: 20, max: 2000 }),
    body("impact").optional().isIn(["Baixo", "Médio", "Alto", "Crítico"]),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reason, impact = "Médio" } = req.body as { reason: string; impact?: string };

      const { rows } = await query(`SELECT * FROM orders WHERE id = $1`, [req.params.id]);
      const order = rows[0];
      if (!order) return res.status(404).json({ error: "Pedido não encontrado." });
      if (order.payment_status === "released") {
        return res.status(409).json({ error: "Pagamento já liberado, não é possível abrir disputa." });
      }

      // Block payment release while dispute is open
      await query(`UPDATE orders SET payment_status = 'disputed', updated_at = NOW() WHERE id = $1`, [req.params.id]);

      const dueAt = new Date();
      dueAt.setHours(dueAt.getHours() + 72); // 72h SLA for admin review

      const { rows: dispute } = await query(
        `INSERT INTO disputes (order_id, opened_by, description, impact, status, due_at)
         VALUES ($1, $2, $3, $4, 'open', $5)
         RETURNING *`,
        [req.params.id, req.user!.userId, reason, impact, dueAt.toISOString()]
      );

      await audit(req, "Disputa aberta pelo demandante", "dispute", dispute[0].id, { reason, impact });
      res.status(201).json(dispute[0]);
    } catch (err) { next(err); }
  }
);

export default router;
