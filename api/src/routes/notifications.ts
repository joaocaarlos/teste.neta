import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { query } from "../db";
import { authenticate, authorize } from "../middleware/auth";
import { audit } from "../lib/audit";
import { validate, v } from "../lib/validators";
import { sseEmit } from "../lib/sse";

const router = Router();

export async function createNotification(opts: {
  user_id?: string | null;
  user_role: "demandante" | "fornecedor" | "admin";
  tipo: string;
  titulo: string;
  descricao?: string | null;
  icone?: string;
  group_key?: string | null;
  tempo?: string;
}): Promise<{ id: number; grouped: boolean }> {
  const { user_id = null, user_role, tipo, titulo, descricao = null, icone = "🔔", group_key = null, tempo = "agora" } = opts;
  const channel = user_id ? `user:${user_id}` : `role:${user_role}`;

  if (group_key) {
    const existing = await query<{ id: number }>(
      `SELECT id FROM notifications
       WHERE COALESCE(user_id::text,'') = COALESCE($1::text,'')
         AND user_role = $2
         AND group_key = $3
         AND lida = FALSE
         AND created_at > NOW() - INTERVAL '1 hour'
       LIMIT 1`,
      [user_id, user_role, group_key]
    );
    if (existing.rows[0]) {
      await query(`UPDATE notifications SET count = count + 1, tempo = 'agora', titulo = $2 WHERE id = $1`, [existing.rows[0].id, titulo]);
      sseEmit(channel, { type: "notification.new", payload: { id: existing.rows[0].id, user_role, user_id, tipo, icone, titulo, descricao, tempo: "agora", grouped: true } });
      return { id: existing.rows[0].id, grouped: true };
    }
  }

  const { rows } = await query<{ id: number }>(
    `INSERT INTO notifications (user_role, user_id, tipo, icone, titulo, descricao, tempo, group_key, count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1) RETURNING id`,
    [user_role, user_id, tipo, icone, titulo, descricao, tempo, group_key]
  );
  sseEmit(channel, { type: "notification.new", payload: { id: rows[0].id, user_role, user_id, tipo, icone, titulo, descricao, tempo, grouped: false } });
  return { id: rows[0].id, grouped: false };
}

export async function userAcceptsEmail(userId: string, channel: "transactional" | "digest" = "transactional"): Promise<boolean> {
  if (channel === "transactional") return true;
  const { rows } = await query<{ email_enabled: boolean; digest_frequency: string }>(
    `SELECT email_enabled, digest_frequency FROM notification_prefs WHERE user_id = $1`, [userId]
  );
  if (!rows[0]) return true;
  return rows[0].email_enabled && rows[0].digest_frequency !== "off";
}

router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { unread } = req.query as { unread?: string };
    const userRole = req.user!.role;
    const userId = req.user!.userId;
    const conditions: string[] = [`(user_id = $1 OR (user_id IS NULL AND user_role = $2))`];
    const params: unknown[] = [userId, userRole];
    if (unread === "true") conditions.push(`lida = FALSE`);
    const { rows } = await query(`SELECT * FROM notifications WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC LIMIT 50`, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post("/:id/read", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cur = await query<{ user_id: string | null; user_role: string }>("SELECT user_id, user_role FROM notifications WHERE id = $1", [req.params.id]);
    if (!cur.rows[0]) return res.status(404).json({ error: "Notificação não encontrada." });
    if (req.user!.role !== "admin" && cur.rows[0].user_id && cur.rows[0].user_id !== req.user!.userId) {
      return res.status(403).json({ error: "Permissão insuficiente." });
    }
    const { rows } = await query("UPDATE notifications SET lida = TRUE WHERE id = $1 RETURNING *", [req.params.id]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post("/read-all", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await query(
      `UPDATE notifications SET lida = TRUE WHERE lida = FALSE AND (user_id = $1 OR (user_id IS NULL AND user_role = $2))`,
      [req.user!.userId, req.user!.role]
    );
    res.json({ message: "Todas as notificações marcadas como lidas." });
  } catch (err) { next(err); }
});

router.post("/", authenticate, authorize("admin"), validate([
  body("user_role").isIn(["demandante", "fornecedor", "admin"]),
  v.notEmptyString("tipo", 50),
  v.notEmptyString("titulo", 200),
  v.optionalString("descricao", 2000),
  v.optionalString("icone", 10),
  body("user_id").optional().isUUID(),
  v.optionalString("group_key", 100),
]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await createNotification({
      user_role: req.body.user_role,
      user_id: req.body.user_id || null,
      tipo: req.body.tipo,
      icone: req.body.icone,
      titulo: req.body.titulo,
      descricao: req.body.descricao,
      group_key: req.body.group_key || null,
      tempo: req.body.tempo,
    });
    await audit(req, result.grouped ? "Notificação agrupada" : "Notificação criada", "notif", String(result.id));
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.get("/prefs", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query<{ email_enabled: boolean; in_app_enabled: boolean; push_enabled: boolean; digest_frequency: string; prefs: unknown; updated_at: Date | null }>(
      `SELECT email_enabled, in_app_enabled, push_enabled, digest_frequency, prefs, updated_at FROM notification_prefs WHERE user_id = $1`,
      [req.user!.userId]
    );
    if (!rows[0]) return res.json({ email_enabled: true, in_app_enabled: true, push_enabled: false, digest_frequency: "realtime", prefs: {}, updated_at: null });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.patch("/prefs", authenticate, validate([
  body("email_enabled").optional().isBoolean(),
  body("in_app_enabled").optional().isBoolean(),
  body("push_enabled").optional().isBoolean(),
  body("digest_frequency").optional().isIn(["realtime", "hourly", "daily", "off"]),
  body("prefs").optional().isObject(),
]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fields: string[] = [];
    const values: unknown[] = [];
    let p = 1;
    for (const key of ["email_enabled", "in_app_enabled", "push_enabled", "digest_frequency"]) {
      if (req.body[key] !== undefined) { fields.push(`${key} = $${p}`); values.push(req.body[key]); p++; }
    }
    if (req.body.prefs !== undefined) { fields.push(`prefs = $${p}`); values.push(JSON.stringify(req.body.prefs)); p++; }
    await query(`INSERT INTO notification_prefs (user_id, prefs) VALUES ($1, '{}'::jsonb) ON CONFLICT (user_id) DO NOTHING`, [req.user!.userId]);
    if (fields.length) {
      fields.push(`updated_at = NOW()`);
      values.push(req.user!.userId);
      await query(`UPDATE notification_prefs SET ${fields.join(", ")} WHERE user_id = $${p}`, values);
    }
    const { rows } = await query(`SELECT email_enabled, in_app_enabled, push_enabled, digest_frequency, prefs, updated_at FROM notification_prefs WHERE user_id = $1`, [req.user!.userId]);
    await audit(req, "Preferencias de notificacao atualizadas", "notif");
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cur = await query<{ user_id: string | null }>("SELECT user_id FROM notifications WHERE id = $1", [req.params.id]);
    if (!cur.rows[0]) return res.status(404).json({ error: "Notificação não encontrada." });
    if (req.user!.role !== "admin" && cur.rows[0].user_id && cur.rows[0].user_id !== req.user!.userId) {
      return res.status(403).json({ error: "Permissão insuficiente." });
    }
    await query("DELETE FROM notifications WHERE id = $1", [req.params.id]);
    res.json({ message: "Notificação removida." });
  } catch (err) { next(err); }
});

export default router;
