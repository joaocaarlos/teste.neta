import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { query } from "../db";
import { ok, fail } from "../lib/response";
import { authenticate, authorize } from "../middleware/auth";
import { validate, v } from "../lib/validators";
import { logger } from "../lib/logger";
import { newProposalId } from "../lib/idgen";

const router = Router();

// ─── GET /proposal-templates — list own company's templates ──────────────────
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 400);

      const { rows } = await query(
        `SELECT * FROM proposal_templates WHERE company_id = $1 ORDER BY name ASC`,
        [companyId]
      );
      ok(res, rows);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /proposal-templates — create template ───────────────────────────────
router.post(
  "/",
  authenticate,
  authorize("fornecedor"),
  validate([
    v.notEmptyString("name", 255),
    v.optionalString("process_desc", 2000),
    body("lead_time_days").optional({ nullable: true }).isInt({ min: 1, max: 3650 }),
    body("certifications").optional({ nullable: true }).isArray(),
    body("certifications.*").optional().isString().isLength({ max: 100 }),
    body("capacity_m3").optional({ nullable: true }).isFloat({ min: 0 }),
    body("payload").optional({ nullable: true }).isObject(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 400);

      const { name, process_desc, lead_time_days, certifications, capacity_m3, payload } =
        req.body as {
          name: string;
          process_desc?: string;
          lead_time_days?: number;
          certifications?: string[];
          capacity_m3?: number;
          payload?: Record<string, unknown>;
        };

      const { rows } = await query(
        `INSERT INTO proposal_templates
           (company_id, user_id, name, process_desc, lead_time_days, certifications, capacity_m3, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          companyId,
          req.user!.userId,
          name,
          process_desc ?? null,
          lead_time_days ?? null,
          certifications ?? null,
          capacity_m3 ?? null,
          payload ? JSON.stringify(payload) : null,
        ]
      );

      logger.info({ templateId: rows[0].id, companyId }, "Proposal template created");
      ok(res, rows[0], "Template criado com sucesso.", 201);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /proposal-templates/:id — get detail ────────────────────────────────
router.get(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rows } = await query<{ company_id: string }>(
        `SELECT * FROM proposal_templates WHERE id = $1`,
        [req.params.id]
      );
      const template = rows[0];
      if (!template) return fail(res, "Template não encontrado.", "NOT_FOUND", 404);

      if (
        req.user!.role !== "admin" &&
        template.company_id !== req.user!.companyId
      ) {
        return fail(res, "Permissão insuficiente.", "FORBIDDEN", 403);
      }

      ok(res, template);
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /proposal-templates/:id — update template ─────────────────────────
router.patch(
  "/:id",
  authenticate,
  authorize("fornecedor"),
  validate([
    v.optionalString("name", 255),
    v.optionalString("process_desc", 2000),
    body("lead_time_days").optional({ nullable: true }).isInt({ min: 1, max: 3650 }),
    body("certifications").optional({ nullable: true }).isArray(),
    body("certifications.*").optional().isString().isLength({ max: 100 }),
    body("capacity_m3").optional({ nullable: true }).isFloat({ min: 0 }),
    body("payload").optional({ nullable: true }).isObject(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const { rows: existing } = await query<{ company_id: string }>(
        `SELECT company_id FROM proposal_templates WHERE id = $1`,
        [req.params.id]
      );

      if (!existing[0]) return fail(res, "Template não encontrado.", "NOT_FOUND", 404);
      if (existing[0].company_id !== companyId) {
        return fail(res, "Permissão insuficiente.", "FORBIDDEN", 403);
      }

      const { name, process_desc, lead_time_days, certifications, capacity_m3, payload } =
        req.body as {
          name?: string;
          process_desc?: string | null;
          lead_time_days?: number | null;
          certifications?: string[] | null;
          capacity_m3?: number | null;
          payload?: Record<string, unknown> | null;
        };

      const sets: string[] = ["updated_at = NOW()"];
      const params: unknown[] = [];
      let p = 1;

      if (name !== undefined) { sets.push(`name = $${p}`); params.push(name); p++; }
      if (process_desc !== undefined) { sets.push(`process_desc = $${p}`); params.push(process_desc); p++; }
      if (lead_time_days !== undefined) { sets.push(`lead_time_days = $${p}`); params.push(lead_time_days); p++; }
      if (certifications !== undefined) { sets.push(`certifications = $${p}`); params.push(certifications); p++; }
      if (capacity_m3 !== undefined) { sets.push(`capacity_m3 = $${p}`); params.push(capacity_m3); p++; }
      if (payload !== undefined) {
        sets.push(`payload = $${p}`);
        params.push(payload !== null ? JSON.stringify(payload) : null);
        p++;
      }

      params.push(req.params.id);
      const { rows } = await query(
        `UPDATE proposal_templates SET ${sets.join(", ")} WHERE id = $${p} RETURNING *`,
        params
      );

      ok(res, rows[0], "Template atualizado com sucesso.");
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /proposal-templates/:id — delete template ────────────────────────
router.delete(
  "/:id",
  authenticate,
  authorize("fornecedor"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const { rows } = await query<{ company_id: string }>(
        `SELECT company_id FROM proposal_templates WHERE id = $1`,
        [req.params.id]
      );

      if (!rows[0]) return fail(res, "Template não encontrado.", "NOT_FOUND", 404);
      if (rows[0].company_id !== companyId) {
        return fail(res, "Permissão insuficiente.", "FORBIDDEN", 403);
      }

      await query(`DELETE FROM proposal_templates WHERE id = $1`, [req.params.id]);
      ok(res, { id: req.params.id }, "Template removido com sucesso.");
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /proposal-templates/:id/apply — create proposal from template ───────
router.post(
  "/:id/apply",
  authenticate,
  authorize("fornecedor"),
  validate([v.notEmptyString("demand_id", 20)]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 400);

      // Load the template — must belong to caller's company
      const { rows: tplRows } = await query<{
        company_id: string;
        process_desc: string | null;
        lead_time_days: number | null;
        certifications: string[] | null;
        capacity_m3: number | null;
      }>(
        `SELECT * FROM proposal_templates WHERE id = $1`,
        [req.params.id]
      );

      const template = tplRows[0];
      if (!template) return fail(res, "Template não encontrado.", "NOT_FOUND", 404);
      if (template.company_id !== companyId) {
        return fail(res, "Permissão insuficiente.", "FORBIDDEN", 403);
      }

      const { demand_id } = req.body as { demand_id: string };

      // Verify demand exists
      const { rows: demRows } = await query<{ id: string; status: string }>(
        `SELECT id, status FROM demands WHERE id = $1`,
        [demand_id]
      );
      if (!demRows[0]) return fail(res, "Demanda não encontrada.", "NOT_FOUND", 404);

      // Fetch supplier info for the proposal
      const { rows: supplierRows } = await query<{
        name: string;
        company: string;
        company_id: string;
        city: string;
      }>(
        `SELECT u.name, c.name AS company, c.id AS company_id, c.city
         FROM users u
         LEFT JOIN companies c ON c.id = u.company_id
         WHERE u.id = $1`,
        [req.user!.userId]
      );

      const supplier = supplierRows[0];
      if (!supplier?.company_id) {
        return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 400);
      }

      const proposalId = await newProposalId();
      const certString = template.certifications?.join(", ") ?? null;

      const { rows } = await query(
        `INSERT INTO proposals
           (id, demand_id, supplier_id, supplier_name, city,
            days, cert, obs, sent_by, status, score, total, risk, risk_factors)
         VALUES
           ($1, $2, $3, $4, $5,
            $6, $7, $8, $9, 'draft', 0, '', 'Médio', '[]')
         RETURNING *`,
        [
          proposalId,
          demand_id,
          supplier.company_id,
          supplier.company,
          supplier.city,
          template.lead_time_days ?? null,
          certString,
          template.process_desc ?? null,
          req.user!.userId,
        ]
      );

      logger.info(
        { proposalId, templateId: req.params.id, demand_id, companyId },
        "Proposal created from template"
      );
      ok(res, rows[0], "Proposta criada a partir do template.", 201);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
