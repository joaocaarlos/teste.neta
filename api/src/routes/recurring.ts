import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { query } from "../db";
import { ok, fail } from "../lib/response";
import { authenticate, authorize } from "../middleware/auth";
import { validate, v } from "../lib/validators";
import { logger } from "../lib/logger";

const router = Router();

// ─── GET /recurring — list recurring orders for current user's company ─────────
router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 400);

      const statusFilter = (req.query.status as string) ?? "active";
      const validStatuses = ["active", "paused", "cancelled"];
      if (!validStatuses.includes(statusFilter)) {
        return fail(res, "status deve ser active, paused ou cancelled.", "VALIDATION_ERROR", 400);
      }

      const { rows } = await query(
        `SELECT * FROM recurring_orders
         WHERE (buyer_company_id = $1 OR supplier_company_id = $1)
           AND status = $2
         ORDER BY next_due_at ASC`,
        [companyId, statusFilter]
      );

      ok(res, rows);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /recurring — create recurring order ────────────────────────────────
router.post(
  "/",
  authenticate,
  authorize("demandante"),
  validate([
    body("supplier_company_id").isUUID().withMessage("supplier_company_id deve ser um UUID válido."),
    v.notEmptyString("description", 1000),
    body("frequency")
      .isIn(["weekly", "biweekly", "monthly", "quarterly"])
      .withMessage("frequency deve ser weekly, biweekly, monthly ou quarterly."),
    body("next_due_at").isISO8601().withMessage("next_due_at deve ser uma data ISO8601 válida."),
    body("auto_create").optional({ nullable: true }).isBoolean(),
    body("base_order_id").optional({ nullable: true }).isString().isLength({ max: 20 }),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 400);

      const { supplier_company_id, description, frequency, next_due_at, auto_create, base_order_id } =
        req.body as {
          supplier_company_id: string;
          description: string;
          frequency: string;
          next_due_at: string;
          auto_create?: boolean;
          base_order_id?: string | null;
        };

      // Verify supplier company exists
      const { rows: supplierRows } = await query<{ id: string }>(
        `SELECT id FROM companies WHERE id = $1`,
        [supplier_company_id]
      );
      if (!supplierRows[0]) {
        return fail(res, "Empresa fornecedora não encontrada.", "NOT_FOUND", 404);
      }

      const { rows } = await query(
        `INSERT INTO recurring_orders
           (buyer_company_id, supplier_company_id, description, frequency, next_due_at, auto_create, base_order_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          companyId,
          supplier_company_id,
          description,
          frequency,
          next_due_at,
          auto_create ?? false,
          base_order_id ?? null,
        ]
      );

      logger.info({ recurringId: rows[0].id, companyId }, "Recurring order created");
      ok(res, rows[0], "Pedido recorrente criado com sucesso.", 201);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /recurring/:id — get detail ─────────────────────────────────────────
router.get(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const { rows } = await query<{
        id: string;
        buyer_company_id: string;
        supplier_company_id: string;
      }>(
        `SELECT * FROM recurring_orders WHERE id = $1`,
        [req.params.id]
      );

      const record = rows[0];
      if (!record) return fail(res, "Pedido recorrente não encontrado.", "NOT_FOUND", 404);

      if (
        req.user!.role !== "admin" &&
        record.buyer_company_id !== companyId &&
        record.supplier_company_id !== companyId
      ) {
        return fail(res, "Permissão insuficiente.", "FORBIDDEN", 403);
      }

      ok(res, record);
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /recurring/:id — update ───────────────────────────────────────────
router.patch(
  "/:id",
  authenticate,
  validate([
    body("frequency")
      .optional()
      .isIn(["weekly", "biweekly", "monthly", "quarterly"])
      .withMessage("frequency deve ser weekly, biweekly, monthly ou quarterly."),
    body("next_due_at").optional().isISO8601().withMessage("next_due_at deve ser uma data ISO8601 válida."),
    body("status")
      .optional()
      .isIn(["active", "paused", "cancelled"])
      .withMessage("status deve ser active, paused ou cancelled."),
    body("auto_create").optional({ nullable: true }).isBoolean(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 400);

      const { rows: existing } = await query<{
        buyer_company_id: string;
        supplier_company_id: string;
      }>(
        `SELECT buyer_company_id, supplier_company_id FROM recurring_orders WHERE id = $1`,
        [req.params.id]
      );

      if (!existing[0]) return fail(res, "Pedido recorrente não encontrado.", "NOT_FOUND", 404);

      // Only buyer can update
      if (req.user!.role !== "admin" && existing[0].buyer_company_id !== companyId) {
        return fail(res, "Apenas o comprador pode atualizar este pedido recorrente.", "FORBIDDEN", 403);
      }

      const { frequency, next_due_at, status, auto_create } = req.body as {
        frequency?: string;
        next_due_at?: string;
        status?: string;
        auto_create?: boolean;
      };

      const sets: string[] = ["updated_at = NOW()"];
      const params: unknown[] = [];
      let p = 1;

      if (frequency !== undefined) { sets.push(`frequency = $${p}`); params.push(frequency); p++; }
      if (next_due_at !== undefined) { sets.push(`next_due_at = $${p}`); params.push(next_due_at); p++; }
      if (status !== undefined) { sets.push(`status = $${p}`); params.push(status); p++; }
      if (auto_create !== undefined) { sets.push(`auto_create = $${p}`); params.push(auto_create); p++; }

      if (sets.length === 1) {
        return fail(res, "Nenhum campo para atualizar.", "VALIDATION_ERROR", 400);
      }

      params.push(req.params.id);
      const { rows } = await query(
        `UPDATE recurring_orders SET ${sets.join(", ")} WHERE id = $${p} RETURNING *`,
        params
      );

      ok(res, rows[0], "Pedido recorrente atualizado com sucesso.");
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /recurring/:id — cancel (soft-delete via status) ─────────────────
router.delete(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      const { rows } = await query<{
        buyer_company_id: string;
        status: string;
      }>(
        `SELECT buyer_company_id, status FROM recurring_orders WHERE id = $1`,
        [req.params.id]
      );

      if (!rows[0]) return fail(res, "Pedido recorrente não encontrado.", "NOT_FOUND", 404);

      if (req.user!.role !== "admin" && rows[0].buyer_company_id !== companyId) {
        return fail(res, "Apenas o comprador pode cancelar este pedido recorrente.", "FORBIDDEN", 403);
      }

      if (rows[0].status === "cancelled") {
        return fail(res, "Pedido recorrente já está cancelado.", "CONFLICT", 409);
      }

      await query(
        `UPDATE recurring_orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );

      logger.info({ recurringId: req.params.id, companyId }, "Recurring order cancelled");
      ok(res, { id: req.params.id, status: "cancelled" }, "Pedido recorrente cancelado com sucesso.");
    } catch (err) {
      next(err);
    }
  }
);

export default router;
