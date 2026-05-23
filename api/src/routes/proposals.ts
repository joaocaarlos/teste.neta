import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { z } from "zod";
import { query, transaction } from "../db";
import { authenticate, authorize } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { audit } from "../lib/audit";
import { newProposalId, newOrderId, newContractId, newTxnId } from "../lib/idgen";
import { validate, v } from "../lib/validators";
import { validateZod } from "../middleware/validate";
import { calcScore } from "../lib/score";
import { sseEmit } from "../lib/sse";
import { emailTemplates, sendEmail } from "../lib/email";
import { makeUploader, persistUpload } from "../lib/upload";
import { createNotification } from "./notifications";

const createProposalSchema = z.object({
  demand_id: z.string().min(1, "demand_id obrigatório"),
  price: z.number().positive().optional(),
  total: z.string().min(1, "total obrigatório"),
  total_raw: z.number().nonnegative().optional(),
  unit_price: z.string().optional(),
  description: z.string().min(10).max(5000).optional(),
  days: z.number().int().positive().optional(),
  start_date: z.string().optional(),
  cert: z.string().optional(),
  risk: z.enum(["Baixo", "Medio", "Médio", "Alto", "Critico", "Crítico"]).optional(),
  frete: z.string().optional(),
  payment: z.string().optional(),
  obs: z.string().max(2000).optional(),
  expires_at: z.string().optional().nullable(),
  risk_factors: z.array(z.unknown()).optional(),
});

const router = Router();
const proposalUpload = makeUploader("doc");

async function canAccessProposal(req: Request, proposalId: string): Promise<boolean> {
  if (req.user!.role === "admin") return true;
  const { rows } = await query<{ sent_by: string | null; supplier_id: string | null; created_by: string | null }>(
    `SELECT p.sent_by, p.supplier_id, d.created_by
     FROM proposals p
     LEFT JOIN demands d ON d.id = p.demand_id
     WHERE p.id = $1`,
    [proposalId]
  );
  const proposal = rows[0];
  return proposal?.sent_by === req.user!.userId ||
    proposal?.supplier_id === req.user!.companyId ||
    proposal?.created_by === req.user!.userId;
}

router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { demandId, status } = req.query as { demandId?: string; status?: string };
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (demandId) { conditions.push(`demand_id = $${p}`); params.push(demandId); p++; }
    if (status)   { conditions.push(`status = $${p}`);    params.push(status);   p++; }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT * FROM proposals ${where} ORDER BY score DESC, created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT p.*, d.created_by
       FROM proposals p
       LEFT JOIN demands d ON d.id = p.demand_id
       WHERE p.id = $1`,
      [req.params.id]
    );
    const proposal = rows[0] as { sent_by?: string; created_by?: string; supplier_id?: string } | undefined;
    if (!proposal) return res.status(404).json({ error: "Proposta nao encontrada." });
    if (
      req.user!.role !== "admin" &&
      proposal.sent_by !== req.user!.userId &&
      proposal.created_by !== req.user!.userId &&
      proposal.supplier_id !== req.user!.companyId
    ) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get("/:id/attachments", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await canAccessProposal(req, req.params.id))) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    const { rows } = await query(
      `SELECT id, original_name, mime_type, size_bytes, created_at, '/api/uploads/' || id AS url
       FROM uploaded_files
       WHERE entity_type = 'proposal' AND entity_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post(
  "/:id/attachments",
  authenticate,
  proposalUpload.array("files", 5),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await canAccessProposal(req, req.params.id))) {
        return res.status(403).json({ error: "Permissao insuficiente." });
      }
      const files = Array.isArray(req.files) ? req.files : [];
      if (!files.length) return res.status(400).json({ error: "Nenhum arquivo enviado." });

      const saved = [];
      for (const file of files) {
        saved.push(await persistUpload(req, file, "proposal", req.params.id, false));
      }

      await audit(req, "Anexo de proposta enviado", "proposta", req.params.id);
      res.status(201).json({ files: saved, data: saved });
    } catch (err) { next(err); }
  }
);

router.get("/:id/thread", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await canAccessProposal(req, req.params.id))) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    const { rows } = await query(
      `WITH RECURSIVE root AS (
         SELECT COALESCE(counter_of, id) AS id FROM proposals WHERE id = $1
       ), chain AS (
         SELECT p.* FROM proposals p WHERE p.id = (SELECT id FROM root)
         UNION ALL
         SELECT child.* FROM proposals child
         JOIN chain parent ON child.counter_of = parent.id
       )
       SELECT * FROM chain ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post(
  "/:id/counter",
  authenticate,
  validate([
    v.notEmptyString("total", 50),
    body("total_raw").optional().isFloat({ min: 0 }),
    v.optionalString("unit_price", 50),
    body("days").optional().isInt({ min: 1, max: 365 }),
    v.optionalString("start_date", 20),
    v.optionalString("payment", 100),
    v.optionalString("obs", 2000),
    body("expires_at").optional({ nullable: true }).isISO8601(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await canAccessProposal(req, req.params.id))) {
        return res.status(403).json({ error: "Permissao insuficiente." });
      }
      const baseRes = await query(
        `SELECT p.*, d.created_by
         FROM proposals p
         LEFT JOIN demands d ON d.id = p.demand_id
         WHERE p.id = $1`,
        [req.params.id]
      );
      const base = baseRes.rows[0] as Record<string, unknown> | undefined;
      if (!base) return res.status(404).json({ error: "Proposta nao encontrada." });
      if (base.status === "Aceita" || base.status === "Retirada") {
        return res.status(409).json({ error: `Proposta nao aceita contraproposta no status ${base.status}.` });
      }

      const id = await newProposalId();
      const { total, total_raw, unit_price, days, start_date, payment, obs, expires_at } = req.body;
      const { rows } = await query(
        `INSERT INTO proposals
           (id,demand_id,supplier_id,supplier_name,city,score,total,total_raw,unit_price,
            days,start_date,rating,cert,risk,frete,payment,obs,risk_factors,status,sent_by,expires_at,counter_of)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'Enviada',$19,$20,$21)
         RETURNING *`,
        [
          id, base.demand_id, base.supplier_id, base.supplier_name, base.city, base.score,
          total, total_raw ?? base.total_raw, unit_price ?? base.unit_price,
          days ?? base.days, start_date ?? base.start_date, base.rating, base.cert, base.risk,
          base.frete, payment ?? base.payment, obs ?? base.obs,
          JSON.stringify(base.risk_factors || []), req.user!.userId,
          expires_at || base.expires_at || null, base.id,
        ]
      );
      await query("UPDATE proposals SET status = 'Contraproposta' WHERE id = $1", [base.id]);
      await query("UPDATE demands SET status = 'Em negociação' WHERE id = $1 AND status IN ('Publicado','Em cotação')", [base.demand_id]);
      const targetUserId = (req.user!.userId === base.created_by ? base.sent_by : base.created_by) as string | undefined;
      const targetRole = targetUserId === base.created_by ? "demandante" : "fornecedor";
      if (targetUserId) {
        sseEmit(`user:${targetUserId}`, {
          type: "proposal.countered",
          payload: { id, demand_id: base.demand_id, counter_of: base.id, total },
        });
        void createNotification({
          user_role: targetRole,
          user_id: targetUserId,
          tipo: "proposta",
          icone: "↔",
          titulo: "Contraproposta recebida",
          descricao: `${id} para ${base.demand_id}`,
          group_key: `proposal:${base.demand_id}:counter`,
        }).catch(() => undefined);
      }
      await audit(req, "Contraproposta enviada", "proposta", `${id} -> ${base.id}`);
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

router.post(
  "/",
  authenticate,
  authorize("fornecedor"),
  validateZod(createProposalSchema),
  validate([
    v.notEmptyString("demand_id", 20),
    v.notEmptyString("total", 50),
    body("total_raw").optional().isFloat({ min: 0 }),
    v.optionalString("unit_price", 50),
    body("days").optional().isInt({ min: 1, max: 365 }),
    v.optionalString("start_date", 20),
    v.optionalString("cert", 100),
    v.enumOneOf("risk", ["Baixo", "Medio", "Médio", "Alto", "Critico", "Crítico"]),
    v.optionalString("frete", 50),
    v.optionalString("payment", 100),
    v.optionalString("obs", 2000),
    body("expires_at").optional({ nullable: true }).isISO8601(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { demand_id, total, total_raw, unit_price, days, start_date,
              cert, risk, frete, payment, obs, risk_factors, expires_at } = req.body;

      const dem = await query<{ status: string; process: string; location: string; cert_required: string; deadline: string; budget: string; title: string }>(
        "SELECT status, process, location, cert_required, deadline, budget, title FROM demands WHERE id = $1",
        [demand_id]
      );
      if (!dem.rows[0]) return res.status(404).json({ error: "Demanda nao encontrada." });
      const demand = dem.rows[0];
      if (!["Publicado", "Em cotação", "Em negociação"].includes(demand.status)) {
        return res.status(400).json({ error: `Demanda nao esta aceitando propostas (status: ${demand.status}).` });
      }

      const userRes = await query(
        `SELECT u.name, c.name AS company, c.id AS company_id, c.city
         FROM users u LEFT JOIN companies c ON c.id = u.company_id
         WHERE u.id = $1`,
        [req.user!.userId]
      );
      const supplier = userRes.rows[0] as { name: string; company: string; company_id: string; city: string } | undefined;
      if (!supplier?.company_id) return res.status(400).json({ error: "Usuario sem empresa associada." });

      const dup = await query("SELECT id FROM proposals WHERE demand_id = $1 AND supplier_id = $2 AND status <> 'Retirada'", [demand_id, supplier.company_id]);
      if (dup.rowCount) return res.status(409).json({ error: "Sua empresa ja enviou proposta para esta demanda." });

      const stats = await query<{ avg_rating: string; avg_idle: string }>(
        `SELECT
           (SELECT AVG(rating)::numeric(3,1) FROM reviews r
              JOIN orders o ON o.id = r.order_id
              WHERE o.supplier_id = $1) AS avg_rating,
           (SELECT AVG(idle)::numeric(5,1) FROM machines WHERE company_id = $1) AS avg_idle`,
        [supplier.company_id]
      );

      const { total: computedScore } = calcScore({
        demand: {
          process: demand.process,
          location: demand.location,
          cert_required: demand.cert_required,
          deadline: demand.deadline,
          budget: demand.budget,
        },
        proposal: {
          process_match: req.body.process_match || demand.process,
          city: supplier.city,
          cert,
          days,
          rating: Number(stats.rows[0]?.avg_rating || 4),
          total_raw,
          idle_pct: Number(stats.rows[0]?.avg_idle || 50),
        },
      });

      const normalizedRisk = risk === "Medio" ? "Médio" : risk === "Critico" ? "Crítico" : risk;
      const id = await newProposalId();
      const { rows } = await query(
        `INSERT INTO proposals
           (id,demand_id,supplier_id,supplier_name,city,score,total,total_raw,unit_price,
            days,start_date,cert,risk,frete,payment,obs,risk_factors,sent_by,expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING *`,
        [id, demand_id, supplier.company_id, supplier.company, supplier.city,
         computedScore, total, total_raw || null, unit_price || null,
         days || null, start_date || null, cert || null, normalizedRisk || "Médio",
         frete || null, payment || null, obs || null,
         JSON.stringify(risk_factors || []), req.user!.userId, expires_at || null]
      );

      await query("UPDATE demands SET proposals_count = proposals_count + 1 WHERE id = $1", [demand_id]);

      const demOwner = await query<{ created_by: string; email: string; name: string; title: string }>(
        `SELECT d.created_by, d.title, u.email, u.name
         FROM demands d
         LEFT JOIN users u ON u.id = d.created_by
         WHERE d.id = $1`,
        [demand_id]
      );
      if (demOwner.rows[0]?.created_by) {
        sseEmit(`user:${demOwner.rows[0].created_by}`, {
          type: "proposal.received",
          payload: { id, demand_id, supplier: supplier.company, score: computedScore },
        });
      }
      if (demOwner.rows[0]?.email) {
        const tpl = emailTemplates.proposalReceived({
          demandId: demand_id,
          supplier: supplier.company,
          score: computedScore,
          demandTitle: demOwner.rows[0].title || demand.title,
        });
        void sendEmail({ to: demOwner.rows[0].email, ...tpl });
      }

      await query(
        `INSERT INTO notifications (user_role,user_id,tipo,icone,titulo,descricao,tempo)
         VALUES ('demandante',$1,'proposta','📬','Nova proposta recebida',$2,'agora')`,
        [demOwner.rows[0]?.created_by || null,
         `${supplier.company} enviou proposta para ${demand_id} · Score ${computedScore}`]
      );

      await audit(req, "Proposta enviada", "proposta", `${id} -> ${demand_id}`);
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

router.delete("/:id", authenticate, authorize("fornecedor", "admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cur = await query<{ status: string; sent_by: string; demand_id: string }>(
      "SELECT status, sent_by, demand_id FROM proposals WHERE id = $1",
      [req.params.id]
    );
    if (!cur.rows[0]) return res.status(404).json({ error: "Proposta nao encontrada." });
    if (req.user!.role !== "admin" && cur.rows[0].sent_by !== req.user!.userId) {
      return res.status(403).json({ error: "Voce so pode retirar suas proprias propostas." });
    }
    if (cur.rows[0].status === "Aceita") {
      return res.status(409).json({ error: "Proposta ja aceita nao pode ser retirada." });
    }
    await query("UPDATE proposals SET status = 'Retirada' WHERE id = $1", [req.params.id]);
    await query("UPDATE demands SET proposals_count = GREATEST(proposals_count - 1, 0) WHERE id = $1", [cur.rows[0].demand_id]);
    await audit(req, "Proposta retirada", "proposta", req.params.id);
    res.json({ message: "Proposta retirada." });
  } catch (err) { next(err); }
});

router.post(
  "/:id/accept",
  authenticate,
  authorize("demandante"),
  validate([v.notEmptyString("demandId", 20)]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { demandId } = req.body as { demandId: string };

      const result = await transaction(async (client) => {
        const dem = await client.query<{ created_by: string; status: string }>(
          "SELECT created_by, status FROM demands WHERE id = $1 FOR UPDATE",
          [demandId]
        );
        if (!dem.rows[0]) throw new AppError("Demanda nao encontrada.", 404);
        if (req.user!.role !== "admin" && dem.rows[0].created_by !== req.user!.userId) {
          throw new AppError("Voce so pode aceitar propostas das suas proprias demandas.", 403);
        }
        if (dem.rows[0].status === "Contratado") throw new AppError("Demanda ja contratada.", 409);

        const propRes = await client.query(
          "SELECT * FROM proposals WHERE id = $1 AND demand_id = $2 FOR UPDATE",
          [req.params.id, demandId]
        );
        const prop = propRes.rows[0] as Record<string, unknown> | undefined;
        if (!prop) throw new AppError("Proposta nao encontrada.", 404);
        if (prop.status !== "Enviada") {
          throw new AppError(`Proposta nao pode ser aceita (status atual: ${String(prop.status)}).`, 409);
        }

        const orderId = await newOrderId();
        const ctId = await newContractId();
        const txId = await newTxnId();

        const userRes = await client.query(
          `SELECT u.name, c.name AS company, c.id AS company_id
           FROM users u LEFT JOIN companies c ON c.id = u.company_id WHERE u.id = $1`,
          [req.user!.userId]
        );
        const dr = userRes.rows[0] as { name: string; company: string; company_id: string };
        if (!dr?.company_id) throw new AppError("Usuario sem empresa associada.", 400);

        const orderRes = await client.query(
          `INSERT INTO orders (id,demand_id,proposal_id,client_id,supplier_id,client,product,value,value_raw,status,pct,deadline)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Contratado',0,$10) RETURNING *`,
          [orderId, demandId, prop.id, dr.company_id, prop.supplier_id,
           dr.company, `Pedido ${orderId}`, prop.total, prop.total_raw || null,
           (prop as { deadline?: string }).deadline || null]
        );

        await client.query("UPDATE demands SET status = 'Contratado' WHERE id = $1", [demandId]);
        await client.query(
          "UPDATE proposals SET status = 'Recusada' WHERE demand_id = $1 AND id != $2 AND status = 'Enviada'",
          [demandId, prop.id]
        );
        await client.query("UPDATE proposals SET status = 'Aceita' WHERE id = $1", [prop.id]);

        const initialPaymentStatus = (process.env.PAYMENTS_PROVIDER || "").toLowerCase() === "stripe" ? "Pendente" : "Retido";
        await client.query(
          "INSERT INTO transactions (id,order_id,party,gross,status,date,payment_provider) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [txId, orderId, prop.supplier_name, prop.total_raw || 0, initialPaymentStatus, new Date().toLocaleDateString("pt-BR"),
           initialPaymentStatus === "Pendente" ? "stripe" : "manual"]
        );

        await client.query(
          `INSERT INTO contracts (id,order_id,demandante,fornecedor,demandante_id,fornecedor_id,
                                  valor,valor_raw,prazo,status,scope,generated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Aguardando assinatura',$10,$11)`,
          [ctId, orderId, dr.company, prop.supplier_name,
           dr.company_id, prop.supplier_id,
           prop.total, prop.total_raw || null,
           (prop as { deadline?: string }).deadline || "-",
           `Pedido ${orderId} · ${prop.supplier_name}`,
           new Date().toLocaleDateString("pt-BR")]
        );

        return { order: orderRes.rows[0], orderId, ctId, txId, propId: prop.id, sentBy: prop.sent_by };
      });

      if (result.sentBy) {
        sseEmit(`user:${result.sentBy as string}`, {
          type: "proposal.accepted",
          payload: { proposalId: result.propId, orderId: result.orderId },
        });
        void createNotification({
          user_role: "fornecedor",
          user_id: result.sentBy as string,
          tipo: "contrato",
          icone: "✓",
          titulo: "Proposta aceita",
          descricao: `Pedido ${result.orderId} gerado a partir da proposta ${result.propId}`,
          group_key: `proposal:${result.propId}:accepted`,
        }).catch(() => undefined);
      }
      sseEmit("role:admin", {
        type: "proposal.accepted",
        payload: { proposalId: result.propId, orderId: result.orderId, demandId },
      });
      void createNotification({
        user_role: "admin",
        tipo: "contrato",
        icone: "✓",
        titulo: "Novo contrato gerado",
        descricao: `Pedido ${result.orderId} criado apos aceite de proposta`,
        group_key: `order:${result.orderId}:created`,
      }).catch(() => undefined);

      await audit(req, "Proposta aceita", "proposta", req.params.id);
      res.status(201).json(result.order);
    } catch (err) { next(err); }
  }
);

export default router;
