import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { query, transaction } from "../db";
import { authenticate, authorize } from "../middleware/auth";
import { audit } from "../lib/audit";
import { newDisputeId } from "../lib/idgen";
import { validate, v } from "../lib/validators";
import { assertTransition, disputeTransitions } from "../lib/state-machine";
import { sseEmit } from "../lib/sse";
import { emailTemplates, sendEmail } from "../lib/email";
import { makeUploader, persistUpload } from "../lib/upload";

const router = Router();
const disputeUpload = makeUploader("default");

async function canAccessDispute(req: Request, disputeId: string): Promise<boolean> {
  if (req.user!.role === "admin") return true;
  const { rows } = await query<{ client_id: string | null; supplier_id: string | null }>(
    `SELECT o.client_id, o.supplier_id
     FROM disputes d
     LEFT JOIN orders o ON o.id = d.order_id
     WHERE d.id = $1`,
    [disputeId]
  );
  return rows[0]?.client_id === req.user!.companyId || rows[0]?.supplier_id === req.user!.companyId;
}

router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, type, orderId } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (req.user!.role !== "admin" && req.user!.companyId) {
      conditions.push(`d.order_id IN (SELECT id FROM orders WHERE client_id = $${p} OR supplier_id = $${p})`);
      params.push(req.user!.companyId); p++;
    }
    if (status)  { conditions.push(`d.status = $${p}`);   params.push(status);  p++; }
    if (type)    { conditions.push(`d.type = $${p}`);     params.push(type);    p++; }
    if (orderId) { conditions.push(`d.order_id = $${p}`); params.push(orderId); p++; }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query(`SELECT d.id, d.order_id, d.opened_by, d.status, d.description, d.admin_decision, d.admin_reason, d.refund_percent, d.due_at, d.resolved_at, d.created_at FROM disputes d ${where} ORDER BY d.created_at DESC`, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query("SELECT id, order_id, opened_by, status, description, admin_decision, admin_reason, refund_percent, due_at, resolved_at, created_at FROM disputes WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Disputa não encontrada." });
    if (!(await canAccessDispute(req, req.params.id))) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get("/:id/attachments", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await canAccessDispute(req, req.params.id))) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    const { rows } = await query(
      `SELECT id, original_name, mime_type, size_bytes, created_at, '/api/uploads/' || id AS url
       FROM uploaded_files
       WHERE entity_type = 'dispute' AND entity_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post("/:id/attachments", authenticate, disputeUpload.array("files", 5), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await canAccessDispute(req, req.params.id))) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) return res.status(400).json({ error: "Nenhum arquivo enviado." });
    const saved = [];
    for (const file of files) saved.push(await persistUpload(req, file, "dispute", req.params.id, false));
    await audit(req, "Anexo de disputa enviado", "disputa", req.params.id);
    res.status(201).json({ files: saved, data: saved });
  } catch (err) { next(err); }
});

router.get("/:id/messages", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await canAccessDispute(req, req.params.id))) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    const { rows } = await query(
      `SELECT dm.*, u.name AS sender_name
       FROM dispute_messages dm
       LEFT JOIN users u ON u.id = dm.sender_id
       WHERE dm.dispute_id = $1
         AND (dm.internal = FALSE OR $2 = TRUE)
       ORDER BY dm.created_at ASC`,
      [req.params.id, req.user!.role === "admin"]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post("/:id/messages", authenticate, validate([
  body("msg").isString().trim().notEmpty().isLength({ max: 5000 }),
  body("attachment_url").optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
  body("internal").optional().isBoolean().toBoolean(),
]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await canAccessDispute(req, req.params.id))) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    if (req.body.internal && req.user!.role !== "admin") {
      return res.status(403).json({ error: "Somente admin cria mensagem interna." });
    }
    const { rows } = await query(
      `INSERT INTO dispute_messages (dispute_id, sender_id, sender_role, msg, attachment_url, internal)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, req.user!.userId, req.user!.role, req.body.msg, req.body.attachment_url || null, req.body.internal || false]
    );
    const parties = await query<{ client_id: string | null; supplier_id: string | null }>(
      `SELECT o.client_id, o.supplier_id FROM disputes d LEFT JOIN orders o ON o.id = d.order_id WHERE d.id = $1`,
      [req.params.id]
    );
    if (parties.rows[0]) {
      sseEmit(`company:${parties.rows[0].client_id}`, { type: "dispute.message", payload: rows[0] });
      sseEmit(`company:${parties.rows[0].supplier_id}`, { type: "dispute.message", payload: rows[0] });
    }
    await audit(req, "Mensagem adicionada na disputa", "disputa", req.params.id);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.post("/", authenticate, validate([
  v.notEmptyString("order_id", 20),
  v.notEmptyString("type", 100),
  v.enumOneOf("impact", ["Baixo", "Médio", "Alto", "Crítico"]),
  v.notEmptyString("demandante", 200),
  v.notEmptyString("fornecedor", 200),
  v.optionalString("description", 5000),
]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { order_id, type, impact, demandante, fornecedor, description } = req.body;

    const ord = await query<{ client_id: string; supplier_id: string; client_email: string | null; supplier_email: string | null }>(
      `SELECT client_id, supplier_id,
              (SELECT email FROM users WHERE company_id = orders.client_id AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1) AS client_email,
              (SELECT email FROM users WHERE company_id = orders.supplier_id AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1) AS supplier_email
       FROM orders WHERE id = $1`,
      [order_id]
    );
    if (!ord.rows[0]) return res.status(404).json({ error: "Pedido não encontrado." });
    if (
      req.user!.role !== "admin" &&
      ord.rows[0].client_id !== req.user!.companyId &&
      ord.rows[0].supplier_id !== req.user!.companyId
    ) {
      return res.status(403).json({ error: "Você não é parte deste pedido." });
    }

    const id = await newDisputeId();
    const today = new Date().toLocaleDateString("pt-BR");

    const result = await transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO disputes (id, order_id, type, impact, demandante, fornecedor, description, date, status, due_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Aberta', NOW() + INTERVAL '3 days') RETURNING id, order_id, opened_by, status, description, admin_decision, admin_reason, refund_percent, due_at, resolved_at, created_at`,
        [id, order_id, type, impact || "Médio", demandante, fornecedor, description || null, today]
      );
      await client.query(
        `UPDATE transactions SET status = 'Em disputa' WHERE order_id = $1 AND status IN ('Retido','Pendente')`,
        [order_id]
      );
      if (description) {
        await client.query(
          `INSERT INTO dispute_messages (dispute_id, sender_id, sender_role, msg) VALUES ($1,$2,$3,$4)`,
          [id, req.user!.userId, req.user!.role, description]
        );
      }
      return rows[0];
    });

    sseEmit("role:admin", { type: "dispute.opened", payload: { id, order_id, type, impact } });
    sseEmit(`company:${ord.rows[0].client_id}`, { type: "dispute.opened", payload: { id, order_id } });
    sseEmit(`company:${ord.rows[0].supplier_id}`, { type: "dispute.opened", payload: { id, order_id } });

    await query(
      `INSERT INTO notifications (user_role,tipo,icone,titulo,descricao,tempo) VALUES ('admin','disputa','⚠️','Nova disputa aberta',$1,'agora')`,
      [`${id} · ${type} · ${demandante} vs ${fornecedor}`]
    );

    const tpl = emailTemplates.disputeOpened({ disputeId: id, orderId: order_id, type });
    for (const to of [ord.rows[0].client_email, ord.rows[0].supplier_email].filter(Boolean)) {
      void sendEmail({ to: to as string, ...tpl });
    }

    await audit(req, "Disputa aberta", "disputa", id);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.post("/:id/resolve", authenticate, authorize("admin"), validate([
  v.optionalString("parecer", 5000),
  body("resolution").optional({ nullable: true }).isIn(["release_payment", "refund", "partial_refund", "replacement", "no_action"]),
]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cur = await query<{ status: string; order_id: string }>("SELECT status, order_id FROM disputes WHERE id = $1", [req.params.id]);
    if (!cur.rows[0]) return res.status(404).json({ error: "Disputa não encontrada." });
    try { assertTransition(disputeTransitions, cur.rows[0].status, "Resolvida", "status da disputa"); }
    catch (e) { return res.status(400).json({ error: (e as Error).message }); }

    const today = new Date().toLocaleDateString("pt-BR");
    const { rows } = await query(
      `UPDATE disputes SET status = 'Resolvida', parecer = $1, resolved_at = $2, resolved_by = $3, resolution = $5 WHERE id = $4 RETURNING id, order_id, opened_by, status, description, admin_decision, admin_reason, refund_percent, due_at, resolved_at, created_at`,
      [req.body.parecer || null, today, req.user!.userId, req.params.id, req.body.resolution || "no_action"]
    );
    await query(`UPDATE transactions SET status = 'Retido' WHERE order_id = $1 AND status = 'Em disputa'`, [cur.rows[0].order_id]);
    await audit(req, "Disputa resolvida", "disputa", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post("/:id/close", authenticate, authorize("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cur = await query<{ status: string }>("SELECT status FROM disputes WHERE id = $1", [req.params.id]);
    if (!cur.rows[0]) return res.status(404).json({ error: "Disputa não encontrada." });
    try { assertTransition(disputeTransitions, cur.rows[0].status, "Encerrada", "status da disputa"); }
    catch (e) { return res.status(400).json({ error: (e as Error).message }); }
    const { rows } = await query("UPDATE disputes SET status = 'Encerrada' WHERE id = $1 RETURNING id, order_id, opened_by, status, description, admin_decision, admin_reason, refund_percent, due_at, resolved_at, created_at", [req.params.id]);
    await audit(req, "Disputa encerrada", "disputa", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
