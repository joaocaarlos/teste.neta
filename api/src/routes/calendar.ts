import { Router, Request, Response, NextFunction } from "express";
import { body, query as qv } from "express-validator";
import { query } from "../db";
import { ok, fail } from "../lib/response";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../lib/validators";
import { logger } from "../lib/logger";

const router = Router();

// ─── Public: available slots for a supplier ──────────────────────────────────
router.get(
  "/availability/:companyId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId } = req.params;
      const year = parseInt(req.query.year as string, 10);
      const month = parseInt(req.query.month as string, 10);

      if (!year || !month || month < 1 || month > 12) {
        return fail(res, "Parâmetros year e month são obrigatórios.", "VALIDATION_ERROR", 400);
      }

      const { rows } = await query(
        `SELECT id, machine_id, year, month, day, turn, status, start_at, end_at
         FROM calendar_slots
         WHERE company_id = $1
           AND year = $2
           AND month = $3
           AND status = 'available'
         ORDER BY day ASC, turn ASC`,
        [companyId, year, month]
      );

      // Group by day
      const grouped: Record<string, unknown[]> = {};
      for (const slot of rows) {
        const s = slot as { year: number; month: number; day: number };
        const key = `${s.year}-${String(s.month).padStart(2, "0")}-${String(s.day).padStart(2, "0")}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(slot);
      }

      ok(res, grouped);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /calendar — own company slots ───────────────────────────────────────
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 400);

      const year = parseInt(req.query.year as string, 10);
      const month = parseInt(req.query.month as string, 10);
      const machineId = req.query.machine_id as string | undefined;

      if (!year || !month || month < 1 || month > 12) {
        return fail(res, "Parâmetros year e month são obrigatórios.", "VALIDATION_ERROR", 400);
      }

      const conditions: string[] = [
        "company_id = $1",
        "year = $2",
        "month = $3",
      ];
      const params: unknown[] = [companyId, year, month];
      let p = 4;

      if (machineId) {
        conditions.push(`machine_id = $${p}`);
        params.push(machineId);
        p++;
      }

      const { rows } = await query(
        `SELECT * FROM calendar_slots
         WHERE ${conditions.join(" AND ")}
         ORDER BY day ASC, turn ASC`,
        params
      );

      // Group by day
      const grouped: Record<string, unknown[]> = {};
      for (const slot of rows) {
        const s = slot as { year: number; month: number; day: number };
        const key = `${s.year}-${String(s.month).padStart(2, "0")}-${String(s.day).padStart(2, "0")}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(slot);
      }

      ok(res, grouped);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /calendar — bulk upsert slots ──────────────────────────────────────
router.post(
  "/",
  authenticate,
  authorize("fornecedor"),
  validate([
    body("slots").isArray({ min: 1, max: 31 }).withMessage("slots deve ser um array com 1 a 31 itens."),
    body("slots.*.year").isInt({ min: 2020, max: 2100 }).withMessage("Ano inválido."),
    body("slots.*.month").isInt({ min: 1, max: 12 }).withMessage("Mês inválido."),
    body("slots.*.day").isInt({ min: 1, max: 31 }).withMessage("Dia inválido."),
    body("slots.*.turn").isIn(["morning", "afternoon", "night", "allday"]).withMessage("turn inválido."),
    body("slots.*.status").isIn(["available", "booked", "maintenance", "blocked"]).withMessage("status inválido."),
    body("slots.*.machine_id").optional({ nullable: true }).isUUID(),
    body("slots.*.start_at").optional({ nullable: true }).isISO8601(),
    body("slots.*.end_at").optional({ nullable: true }).isISO8601(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 400);

      interface SlotInput {
        machine_id?: string | null;
        year: number;
        month: number;
        day: number;
        turn: string;
        status: string;
        start_at?: string | null;
        end_at?: string | null;
      }

      const slots: SlotInput[] = req.body.slots;

      const upserted: unknown[] = [];
      for (const slot of slots) {
        const { rows } = await query(
          `INSERT INTO calendar_slots
             (company_id, machine_id, year, month, day, turn, status, start_at, end_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (company_id, machine_id, year, month, day, turn)
           DO UPDATE SET
             status   = EXCLUDED.status,
             start_at = EXCLUDED.start_at,
             end_at   = EXCLUDED.end_at
           RETURNING *`,
          [
            companyId,
            slot.machine_id ?? null,
            slot.year,
            slot.month,
            slot.day,
            slot.turn,
            slot.status,
            slot.start_at ?? null,
            slot.end_at ?? null,
          ]
        );
        upserted.push(rows[0]);
      }

      logger.info({ count: upserted.length, companyId }, "Calendar slots upserted");
      ok(res, upserted, "Slots atualizados com sucesso.", 201);
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /calendar/:id — delete a slot ────────────────────────────────────
router.delete(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const { rows } = await query<{ company_id: string }>(
        `SELECT company_id FROM calendar_slots WHERE id = $1`,
        [req.params.id]
      );

      if (!rows[0]) return fail(res, "Slot não encontrado.", "NOT_FOUND", 404);
      if (rows[0].company_id !== companyId && req.user!.role !== "admin") {
        return fail(res, "Permissão insuficiente.", "FORBIDDEN", 403);
      }

      await query(`DELETE FROM calendar_slots WHERE id = $1`, [req.params.id]);
      ok(res, { id: req.params.id }, "Slot removido com sucesso.");
    } catch (err) {
      next(err);
    }
  }
);

export default router;
