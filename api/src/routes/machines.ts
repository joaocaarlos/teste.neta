import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { query } from "../db";
import { ok, fail } from "../lib/response";
import { authenticate, authorize } from "../middleware/auth";
import { validate, v } from "../lib/validators";
import { logger } from "../lib/logger";

const router = Router();

// ─── Public: list a supplier's machines (no auth required) ───────────────────
router.get(
  "/public/:companyId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const { rows } = await query(
        `SELECT id, name, type, capacity, available_capacity, maintenance_until
         FROM machines
         WHERE company_id = $1
         ORDER BY name ASC`,
        [companyId]
      );
      ok(res, rows);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /machines — list own company's machines ──────────────────────────────
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 400);

      const { rows } = await query(
        `SELECT * FROM machines WHERE company_id = $1 ORDER BY name ASC`,
        [companyId]
      );
      ok(res, rows);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /machines — create machine ─────────────────────────────────────────
router.post(
  "/",
  authenticate,
  authorize("fornecedor"),
  validate([
    v.notEmptyString("name", 255),
    v.notEmptyString("type", 100),
    body("capacity").optional({ nullable: true }).isFloat({ min: 0 }),
    v.optionalString("description", 1000),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 400);

      const { name, type, capacity, description } = req.body as {
        name: string;
        type: string;
        capacity?: number;
        description?: string;
      };

      const { rows } = await query(
        `INSERT INTO machines (company_id, name, type, capacity, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [companyId, name, type, capacity ?? null, description ?? null]
      );

      logger.info({ machineId: rows[0].id, companyId }, "Machine created");
      ok(res, rows[0], "Máquina criada com sucesso.", 201);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /machines/:id — get detail ──────────────────────────────────────────
router.get(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rows } = await query<{
        id: string;
        company_id: string;
      }>(
        `SELECT * FROM machines WHERE id = $1`,
        [req.params.id]
      );

      const machine = rows[0];
      if (!machine) return fail(res, "Máquina não encontrada.", "NOT_FOUND", 404);

      if (
        req.user!.role !== "admin" &&
        machine.company_id !== req.user!.companyId
      ) {
        return fail(res, "Permissão insuficiente.", "FORBIDDEN", 403);
      }

      ok(res, machine);
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /machines/:id — update ────────────────────────────────────────────
router.patch(
  "/:id",
  authenticate,
  authorize("fornecedor"),
  validate([
    v.optionalString("name", 255),
    v.optionalString("type", 100),
    body("capacity").optional({ nullable: true }).isFloat({ min: 0 }),
    body("available_capacity").optional({ nullable: true }).isFloat({ min: 0 }),
    body("maintenance_until").optional({ nullable: true }).isISO8601(),
    v.optionalString("description", 1000),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const { rows: existing } = await query<{ company_id: string }>(
        `SELECT company_id FROM machines WHERE id = $1`,
        [req.params.id]
      );

      if (!existing[0]) return fail(res, "Máquina não encontrada.", "NOT_FOUND", 404);
      if (existing[0].company_id !== companyId) {
        return fail(res, "Permissão insuficiente.", "FORBIDDEN", 403);
      }

      const { name, type, capacity, available_capacity, maintenance_until, description } =
        req.body as {
          name?: string;
          type?: string;
          capacity?: number | null;
          available_capacity?: number | null;
          maintenance_until?: string | null;
          description?: string | null;
        };

      const sets: string[] = ["updated_at = NOW()"];
      const params: unknown[] = [];
      let p = 1;

      if (name !== undefined) { sets.push(`name = $${p}`); params.push(name); p++; }
      if (type !== undefined) { sets.push(`type = $${p}`); params.push(type); p++; }
      if (capacity !== undefined) { sets.push(`capacity = $${p}`); params.push(capacity); p++; }
      if (available_capacity !== undefined) { sets.push(`available_capacity = $${p}`); params.push(available_capacity); p++; }
      if (maintenance_until !== undefined) { sets.push(`maintenance_until = $${p}`); params.push(maintenance_until); p++; }
      if (description !== undefined) { sets.push(`description = $${p}`); params.push(description); p++; }

      params.push(req.params.id);
      const { rows } = await query(
        `UPDATE machines SET ${sets.join(", ")} WHERE id = $${p} RETURNING *`,
        params
      );

      ok(res, rows[0], "Máquina atualizada com sucesso.");
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /machines/:id — delete ───────────────────────────────────────────
router.delete(
  "/:id",
  authenticate,
  authorize("fornecedor"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const { rows } = await query<{ company_id: string }>(
        `SELECT company_id FROM machines WHERE id = $1`,
        [req.params.id]
      );

      if (!rows[0]) return fail(res, "Máquina não encontrada.", "NOT_FOUND", 404);
      if (rows[0].company_id !== companyId) {
        return fail(res, "Permissão insuficiente.", "FORBIDDEN", 403);
      }

      await query(`DELETE FROM machines WHERE id = $1`, [req.params.id]);
      ok(res, { id: req.params.id }, "Máquina removida com sucesso.");
    } catch (err) {
      next(err);
    }
  }
);

export default router;
