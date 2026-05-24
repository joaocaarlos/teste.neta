import { Router, Request, Response, NextFunction } from "express";
import { body, query as qVal } from "express-validator";
import { query } from "../db";
import { ok, fail } from "../lib/response";
import { authenticate } from "../middleware/auth";
import { validate } from "../lib/validators";
import { logger } from "../lib/logger";

const router = Router();

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConversationRow {
  id: string;
  order_id: string | null;
  demand_id: string | null;
  created_at: string;
}

interface ParticipantRow {
  company_id: string;
  joined_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  msg: string;
  attachment_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

// ─── IDOR helper ─────────────────────────────────────────────────────────────

async function assertParticipant(convId: string, companyId: string): Promise<boolean> {
  const { rows } = await query<{ company_id: string }>(
    `SELECT company_id FROM conversation_participants WHERE conversation_id = $1 AND company_id = $2`,
    [convId, companyId]
  );
  return rows.length > 0;
}

// ─── GET /messages/conversations ─────────────────────────────────────────────

router.get(
  "/conversations",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 403);

      const { rows } = await query<
        ConversationRow & {
          last_message: string | null;
          last_message_at: string | null;
          unread_count: string;
        }
      >(
        `SELECT c.id,
                c.order_id,
                c.demand_id,
                c.created_at,
                lm.msg         AS last_message,
                lm.created_at  AS last_message_at,
                COALESCE(unread.cnt, 0)::TEXT AS unread_count
           FROM conversations c
           JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.company_id = $1
           LEFT JOIN LATERAL (
             SELECT msg, created_at
               FROM messages
              WHERE conversation_id = c.id AND deleted_at IS NULL
              ORDER BY created_at DESC
              LIMIT 1
           ) lm ON true
           LEFT JOIN LATERAL (
             SELECT COUNT(*) AS cnt
               FROM messages m
              WHERE m.conversation_id = c.id
                AND m.deleted_at IS NULL
                AND NOT EXISTS (
                  SELECT 1 FROM message_reads mr
                   WHERE mr.message_id = m.id AND mr.user_id = $2
                )
           ) unread ON true
          ORDER BY lm.created_at DESC NULLS LAST, c.created_at DESC`,
        [companyId, req.user!.userId]
      );

      return ok(res, rows);
    } catch (e) {
      logger.error({ err: e }, "[messages] GET /conversations error");
      next(e);
    }
  }
);

// ─── POST /messages/conversations ────────────────────────────────────────────

router.post(
  "/conversations",
  authenticate,
  validate([
    body("order_id").optional({ nullable: true }).isString().trim(),
    body("demand_id").optional({ nullable: true }).isUUID().withMessage("demand_id deve ser um UUID válido."),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 403);

      const { order_id, demand_id } = req.body as { order_id?: string; demand_id?: string };
      if (!order_id && !demand_id) {
        return fail(res, "Informe order_id ou demand_id.", "MISSING_CONTEXT", 400);
      }

      // Determine other party
      let otherCompanyId: string | null = null;
      if (order_id) {
        const { rows } = await query<{ client_id: string | null; supplier_id: string | null }>(
          `SELECT client_id, supplier_id FROM orders WHERE id = $1`,
          [order_id]
        );
        if (!rows[0]) return fail(res, "Pedido não encontrado.", "NOT_FOUND", 404);
        const { client_id, supplier_id } = rows[0];
        otherCompanyId = client_id === companyId ? supplier_id : client_id;
      } else if (demand_id) {
        const { rows } = await query<{ company_id: string | null; assigned_supplier_id: string | null }>(
          `SELECT company_id, assigned_supplier_id FROM demands WHERE id = $1`,
          [demand_id]
        );
        if (!rows[0]) return fail(res, "Demanda não encontrada.", "NOT_FOUND", 404);
        const { company_id, assigned_supplier_id } = rows[0];
        otherCompanyId = company_id === companyId ? assigned_supplier_id : company_id;
      }

      // Insert conversation
      const { rows: convRows } = await query<ConversationRow>(
        `INSERT INTO conversations (order_id, demand_id)
         VALUES ($1, $2)
         RETURNING id, order_id, demand_id, created_at`,
        [order_id ?? null, demand_id ?? null]
      );
      const conv = convRows[0];

      // Add current company as participant
      await query(
        `INSERT INTO conversation_participants (conversation_id, company_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [conv.id, companyId]
      );

      // Add other party if found
      if (otherCompanyId) {
        await query(
          `INSERT INTO conversation_participants (conversation_id, company_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [conv.id, otherCompanyId]
        );
      }

      return ok(res, conv, "Conversa criada.", 201);
    } catch (e) {
      logger.error({ err: e }, "[messages] POST /conversations error");
      next(e);
    }
  }
);

// ─── GET /messages/conversations/:id ─────────────────────────────────────────

router.get(
  "/conversations/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 403);

      if (!(await assertParticipant(req.params.id, companyId))) {
        return fail(res, "Acesso negado.", "FORBIDDEN", 403);
      }

      const { rows: convRows } = await query<ConversationRow>(
        `SELECT id, order_id, demand_id, created_at FROM conversations WHERE id = $1`,
        [req.params.id]
      );
      if (!convRows[0]) return fail(res, "Conversa não encontrada.", "NOT_FOUND", 404);

      const { rows: participants } = await query<ParticipantRow>(
        `SELECT company_id, joined_at FROM conversation_participants WHERE conversation_id = $1`,
        [req.params.id]
      );

      return ok(res, { ...convRows[0], participants });
    } catch (e) {
      logger.error({ err: e }, "[messages] GET /conversations/:id error");
      next(e);
    }
  }
);

// ─── GET /messages/conversations/:id/messages ────────────────────────────────

router.get(
  "/conversations/:id/messages",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 403);

      if (!(await assertParticipant(req.params.id, companyId))) {
        return fail(res, "Acesso negado.", "FORBIDDEN", 403);
      }

      const before = req.query.before ? String(req.query.before) : null;
      const limit = Math.min(Number(req.query.limit) || 50, 100);

      const params: unknown[] = [req.params.id, limit];
      let cursor = "";
      if (before) {
        params.push(before);
        cursor = `AND m.id < $${params.length}`;
      }

      const { rows } = await query<MessageRow>(
        `SELECT m.id, m.conversation_id, m.sender_id, m.msg,
                m.attachment_id, m.edited_at, m.deleted_at, m.created_at
           FROM messages m
          WHERE m.conversation_id = $1
            ${cursor}
          ORDER BY m.created_at DESC
          LIMIT $2`,
        params
      );

      return ok(res, rows.reverse());
    } catch (e) {
      logger.error({ err: e }, "[messages] GET /conversations/:id/messages error");
      next(e);
    }
  }
);

// ─── POST /messages/conversations/:id/messages ───────────────────────────────

router.post(
  "/conversations/:id/messages",
  authenticate,
  validate([
    body("msg").isString().trim().notEmpty().isLength({ max: 4000 }).withMessage("Mensagem inválida."),
    body("attachment_id").optional({ nullable: true }).isUUID().withMessage("attachment_id deve ser UUID."),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 403);

      if (!(await assertParticipant(req.params.id, companyId))) {
        return fail(res, "Acesso negado.", "FORBIDDEN", 403);
      }

      const { msg, attachment_id } = req.body as { msg: string; attachment_id?: string };

      const { rows } = await query<MessageRow>(
        `INSERT INTO messages (conversation_id, sender_id, msg, attachment_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, conversation_id, sender_id, msg, attachment_id, edited_at, deleted_at, created_at`,
        [req.params.id, req.user!.userId, msg, attachment_id ?? null]
      );

      return ok(res, rows[0], undefined, 201);
    } catch (e) {
      logger.error({ err: e }, "[messages] POST /conversations/:id/messages error");
      next(e);
    }
  }
);

// ─── PATCH /messages/:messageId ──────────────────────────────────────────────

router.patch(
  "/:messageId",
  authenticate,
  validate([
    body("msg").isString().trim().notEmpty().isLength({ max: 4000 }).withMessage("Mensagem inválida."),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rows } = await query<MessageRow>(
        `SELECT id, sender_id, deleted_at, created_at FROM messages WHERE id = $1`,
        [req.params.messageId]
      );

      if (!rows[0]) return fail(res, "Mensagem não encontrada.", "NOT_FOUND", 404);
      const message = rows[0];

      if (message.deleted_at) return fail(res, "Mensagem removida.", "GONE", 410);
      if (message.sender_id !== req.user!.userId) {
        return fail(res, "Somente o autor pode editar a mensagem.", "FORBIDDEN", 403);
      }

      const ageMs = Date.now() - new Date(message.created_at).getTime();
      if (ageMs > 15 * 60 * 1000) {
        return fail(res, "Prazo de 15 minutos para edição expirado.", "EDIT_WINDOW_CLOSED", 403);
      }

      const { rows: updated } = await query<MessageRow>(
        `UPDATE messages SET msg = $1, edited_at = NOW()
          WHERE id = $2
          RETURNING id, conversation_id, sender_id, msg, attachment_id, edited_at, deleted_at, created_at`,
        [req.body.msg as string, req.params.messageId]
      );

      return ok(res, updated[0]);
    } catch (e) {
      logger.error({ err: e }, "[messages] PATCH /:messageId error");
      next(e);
    }
  }
);

// ─── DELETE /messages/:messageId ─────────────────────────────────────────────

router.delete(
  "/:messageId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rows } = await query<MessageRow>(
        `SELECT id, sender_id, deleted_at FROM messages WHERE id = $1`,
        [req.params.messageId]
      );

      if (!rows[0]) return fail(res, "Mensagem não encontrada.", "NOT_FOUND", 404);
      const message = rows[0];

      if (message.deleted_at) return fail(res, "Mensagem já removida.", "ALREADY_DELETED", 410);

      const isOwner = message.sender_id === req.user!.userId;
      const isAdmin = req.user!.role === "admin";

      if (!isOwner && !isAdmin) {
        return fail(res, "Permissão insuficiente.", "FORBIDDEN", 403);
      }

      await query(`UPDATE messages SET deleted_at = NOW() WHERE id = $1`, [req.params.messageId]);

      return ok(res, { id: req.params.messageId }, "Mensagem removida.");
    } catch (e) {
      logger.error({ err: e }, "[messages] DELETE /:messageId error");
      next(e);
    }
  }
);

// ─── POST /messages/conversations/:id/read ───────────────────────────────────

router.post(
  "/conversations/:id/read",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 403);

      if (!(await assertParticipant(req.params.id, companyId))) {
        return fail(res, "Acesso negado.", "FORBIDDEN", 403);
      }

      await query(
        `INSERT INTO message_reads (message_id, user_id)
         SELECT m.id, $1
           FROM messages m
          WHERE m.conversation_id = $2
            AND m.deleted_at IS NULL
            AND m.sender_id <> $1
         ON CONFLICT DO NOTHING`,
        [req.user!.userId, req.params.id]
      );

      return ok(res, { conversation_id: req.params.id }, "Mensagens marcadas como lidas.");
    } catch (e) {
      logger.error({ err: e }, "[messages] POST /conversations/:id/read error");
      next(e);
    }
  }
);

export default router;
