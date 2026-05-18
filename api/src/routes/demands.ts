/**
 * Demands routes — CRUD + industrial matching
 */
import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { query } from "../db";
import { authenticate, authorize } from "../middleware/auth";
import { audit } from "../lib/audit";
import { validate, v } from "../lib/validators";
import { calcScore } from "../lib/score";
import { ok } from "../lib/response";

const router = Router();

// ── List ────────────────────────────────────────────────────────────────────

router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page = "1", limit = "20" } = req.query as Record<string, string>;
    const user = req.user!;
    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(100, Number(limit) || 20);
    const offset   = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (user.role !== "admin") {
      conditions.push(`d.company_id = $${idx}`);
      params.push(user.companyId);
      idx++;
    }
    if (status) {
      conditions.push(`d.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT d.*, c.name AS company_name,
              (SELECT COUNT(*) FROM proposals p WHERE p.demand_id = d.id) AS proposals_count
       FROM demands d
       LEFT JOIN companies c ON c.id = d.company_id
       ${where}
       ORDER BY d.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limitNum, offset]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── Create ───────────────────────────────────────────────────────────────────

router.post(
  "/",
  authenticate,
  validate([
    body("title").isString().isLength({ min: 5, max: 200 }),
    body("description").optional().isString().isLength({ max: 5000 }),
    body("process").isString().isLength({ min: 2, max: 100 }),
    body("material").optional().isString(),
    body("quantity").optional().isInt({ min: 1 }),
    body("deadline").optional().isISO8601(),
    body("budget").optional().isString(),
    body("location").optional().isString(),
    body("certRequired").optional().isString(),
    body("ndaRequired").optional().isBoolean(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { title, description, process, material, quantity, deadline, budget, location, certRequired, ndaRequired } = req.body;

      const { rows } = await query(
        `INSERT INTO demands (title, description, process, material, quantity, deadline_at, budget, location, cert_required, nda_required, company_id, status, published_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Em cotação', NOW())
         RETURNING *`,
        [title, description, process, material, quantity, deadline, budget, location, certRequired, ndaRequired ?? false, user.companyId]
      );
      await audit(req, "Demanda criada", "demand", rows[0].id);
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

// ── Get by ID ────────────────────────────────────────────────────────────────

router.get("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT d.*, c.name AS company_name
       FROM demands d
       LEFT JOIN companies c ON c.id = d.company_id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Demanda não encontrada." });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── Update ───────────────────────────────────────────────────────────────────

router.patch(
  "/:id",
  authenticate,
  validate([
    body("title").optional().isString().isLength({ min: 5, max: 200 }),
    body("status").optional().isString(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { rows: existing } = await query(`SELECT * FROM demands WHERE id = $1`, [req.params.id]);
      if (!existing[0]) return res.status(404).json({ error: "Demanda não encontrada." });
      if (user.role !== "admin" && existing[0].company_id !== user.companyId) {
        return res.status(403).json({ error: "Sem permissão." });
      }

      const allowed = ["title", "description", "process", "material", "quantity", "deadline_at", "budget", "location", "cert_required", "nda_required", "status"];
      const sets: string[] = [];
      const vals: unknown[] = [];
      let idx = 1;
      for (const key of allowed) {
        const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        const val = req.body[key] ?? req.body[camel];
        if (val !== undefined) {
          sets.push(`${key} = $${idx}`);
          vals.push(val);
          idx++;
        }
      }
      if (!sets.length) return res.status(400).json({ error: "Nenhum campo para atualizar." });
      sets.push(`updated_at = NOW()`);
      vals.push(req.params.id);

      const { rows } = await query(`UPDATE demands SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`, vals);
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

// ── Delete ───────────────────────────────────────────────────────────────────

router.delete("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { rows } = await query(`SELECT company_id FROM demands WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Demanda não encontrada." });
    if (user.role !== "admin" && rows[0].company_id !== user.companyId) {
      return res.status(403).json({ error: "Sem permissão." });
    }
    await query(`DELETE FROM demands WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (err) { next(err); }
});

// ── #17 Industrial matching ─────────────────────────────────────────────────

/**
 * @swagger
 * /demands/{id}/matches:
 *   get:
 *     summary: Retorna fornecedores ranqueados por score de matching para a demanda
 *     tags: [Demands]
 */
router.get("/:id/matches", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows: demandRows } = await query(
      `SELECT d.*, c.name AS company_name, c.state AS company_state
       FROM demands d
       LEFT JOIN companies c ON c.id = d.company_id
       WHERE d.id = $1`,
      [req.params.id]
    );
    const demand = demandRows[0];
    if (!demand) return res.status(404).json({ error: "Demanda não encontrada." });

    // Fetch supplier candidates with their profile data
    const { rows: suppliers } = await query(`
      SELECT
        c.id,
        c.name,
        c.state,
        c.city,
        c.processes,
        c.certifications,
        c.monthly_capacity,
        c.avg_rating,
        c.completed_orders,
        COALESCE(
          (SELECT SUM(m.available_capacity)::FLOAT / NULLIF(SUM(m.total_capacity), 0) * 100
           FROM machines m WHERE m.company_id = c.id),
          50
        ) AS idle_pct
      FROM companies c
      WHERE c.role = 'fornecedor'
        AND c.status = 'Aprovado'
        AND c.id != $1
    `, [demand.company_id]);

    const scored = suppliers.map((s) => {
      const processes = Array.isArray(s.processes) ? s.processes.join(" ") : (s.processes || "");
      const certs = Array.isArray(s.certifications) ? s.certifications.join(" ") : (s.certifications || "");

      const result = calcScore({
        demand: {
          process: demand.process || "",
          location: demand.location,
          cert_required: demand.cert_required,
          deadline: demand.deadline_at,
          budget: demand.budget,
        },
        proposal: {
          process_match: processes,
          city: s.state ? `/${s.state}` : null,
          cert: certs,
          days: demand.deadline_at
            ? Math.round((new Date(demand.deadline_at).getTime() - Date.now()) / 86_400_000)
            : null,
          rating: s.avg_rating ? Number(s.avg_rating) : null,
          idle_pct: Number(s.idle_pct),
        },
      });

      return {
        supplier: { id: s.id, name: s.name, location: `${s.city || ""}, ${s.state || ""}`.trim().replace(/^,\s*/, "") },
        score: result.total,
        breakdown: result.breakdown.map((b) => ({
          criterion: b.criterion,
          score: b.earned,
          max: b.weight,
          reason: b.reason,
        })),
      };
    });

    scored.sort((a, b) => b.score - a.score);

    ok(res, scored.slice(0, 20));
  } catch (err) { next(err); }
});

// ─── #18 NDA flow ────────────────────────────────────────────────────────────

/**
 * POST /:id/nda/request — supplier requests NDA access to technical files
 */
router.post("/:id/nda/request", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows: demRows } = await query(`SELECT * FROM demands WHERE id = $1`, [req.params.id]);
    const demand = demRows[0];
    if (!demand) return res.status(404).json({ error: "Demanda não encontrada." });

    const user = req.user!;
    const supplierCompanyId = user.companyId;

    // Check if NDA already exists
    const { rows: existing } = await query(
      `SELECT * FROM ndas WHERE demand_id = $1 AND supplier_company_id = $2`,
      [req.params.id, supplierCompanyId]
    );
    if (existing[0]) return res.status(409).json({ error: "NDA já solicitado para esta demanda.", nda: existing[0] });

    // Generate document hash: SHA-256 of demand_id + company_id + timestamp
    const crypto = await import("crypto");
    const docHash = crypto.createHash("sha256")
      .update(`${req.params.id}:${supplierCompanyId}:${Date.now()}`)
      .digest("hex");

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { rows } = await query(
      `INSERT INTO ndas (demand_id, supplier_company_id, document_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, supplierCompanyId, docHash, expiresAt.toISOString()]
    );

    await audit(req, "NDA solicitado pelo fornecedor", "nda", rows[0].id);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

/**
 * GET /:id/nda — returns the NDA document for the requesting supplier
 */
router.get("/:id/nda", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT n.*, d.title AS demand_title, c.name AS supplier_name
       FROM ndas n
       JOIN demands d ON d.id = n.demand_id
       LEFT JOIN companies c ON c.id = n.supplier_company_id
       WHERE n.demand_id = $1 AND n.supplier_company_id = (SELECT id FROM companies WHERE id = (SELECT company_id FROM users WHERE id = $2))`,
      [req.params.id, req.user!.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: "NDA não encontrado." });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

/**
 * POST /:id/nda/sign — supplier signs the NDA
 */
router.post("/:id/nda/sign", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const ip = req.ip || "unknown";
    const userAgent = req.get("user-agent") || "";

    const { rows: ndaRows } = await query(
      `SELECT n.* FROM ndas n
       WHERE n.demand_id = $1 AND n.supplier_company_id = (SELECT company_id FROM users WHERE id = $2)`,
      [req.params.id, user.userId]
    );
    const nda = ndaRows[0];
    if (!nda) return res.status(404).json({ error: "NDA não encontrado." });
    if (nda.signed_at) return res.status(409).json({ error: "NDA já foi assinado." });
    if (nda.revoked_at) return res.status(410).json({ error: "NDA foi revogado." });

    const { rows } = await query(
      `UPDATE ndas
       SET signed_at = NOW(), signed_by_user_id = $1, signed_ip = $2, signed_user_agent = $3
       WHERE id = $4
       RETURNING *`,
      [user.userId, ip, userAgent, nda.id]
    );

    await audit(req, "NDA assinado digitalmente", "nda", nda.id, { ip, userAgent });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

/**
 * GET /:id/files — returns technical files (requires signed NDA)
 */
router.get("/:id/files", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    // Admins and the demand owner bypass NDA check
    const { rows: demRows } = await query(`SELECT company_id, nda_required FROM demands WHERE id = $1`, [req.params.id]);
    const demand = demRows[0];
    if (!demand) return res.status(404).json({ error: "Demanda não encontrada." });

    const isOwner = user.companyId === demand.company_id;
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin && demand.nda_required) {
      const { rows: ndaRows } = await query(
        `SELECT id FROM ndas
         WHERE demand_id = $1
           AND supplier_company_id = (SELECT company_id FROM users WHERE id = $2)
           AND signed_at IS NOT NULL
           AND revoked_at IS NULL
           AND (expires_at IS NULL OR expires_at > NOW())`,
        [req.params.id, user.userId]
      );
      if (!ndaRows[0]) {
        return res.status(403).json({ error: "Acesso negado. Assine o NDA para visualizar os arquivos técnicos.", code: "NDA_REQUIRED" });
      }
      await audit(req, "Arquivo técnico acessado com NDA assinado", "demand_file", req.params.id);
    }

    const { rows } = await query(
      `SELECT id, original_name, mime_type, size_bytes, created_at
       FROM uploaded_files
       WHERE entity_type = 'demand_technical_file' AND entity_id = $1
       ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

export default router;
