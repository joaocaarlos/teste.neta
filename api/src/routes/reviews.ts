import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { query } from "../db";
import { authenticate, authorize } from "../middleware/auth";
import { audit } from "../lib/audit";
import { newReviewId } from "../lib/idgen";
import { validate, v } from "../lib/validators";

const router = Router();

router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, fromCompany, includeUnmoderated } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (orderId)     { conditions.push(`order_id = $${p}`);         params.push(orderId);           p++; }
    if (fromCompany) { conditions.push(`from_company ILIKE $${p}`); params.push(`%${fromCompany}%`); p++; }
    if (!(req.user!.role === "admin" && includeUnmoderated === "true")) {
      conditions.push(`moderated = TRUE`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT r.*, u.name AS reviewer_name FROM reviews r LEFT JOIN users u ON u.id = r.from_user ${where} ORDER BY r.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/stats/supplier/:company", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = decodeURIComponent(req.params.company);
    const { rows } = await query(
      `SELECT COUNT(r.*)::int AS total, ROUND(AVG(r.rating), 1) AS avg_rating,
              COUNT(*) FILTER (WHERE r.rating = 5)::int AS five_stars,
              COUNT(*) FILTER (WHERE r.rating = 4)::int AS four_stars,
              COUNT(*) FILTER (WHERE r.rating = 3)::int AS three_stars,
              COUNT(*) FILTER (WHERE r.rating <= 2)::int AS low_stars
       FROM reviews r JOIN orders o ON o.id = r.order_id
       WHERE (o.client ILIKE $1 OR r.from_company ILIKE $1) AND r.moderated = TRUE`,
      [`%${company}%`]
    );
    res.json(rows[0] || { total: 0, avg_rating: null });
  } catch (err) { next(err); }
});

router.get("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query("SELECT * FROM reviews WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Avaliação não encontrada." });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post("/", authenticate, authorize("demandante", "fornecedor"), validate([
  v.notEmptyString("order_id", 20),
  v.intRange("rating", 1, 5),
  v.optionalString("comment", 5000),
  body("criterios").optional().isArray(),
]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { order_id, rating, comment, criterios } = req.body as {
      order_id: string; rating: number; comment?: string; criterios?: unknown[];
    };

    const ord = await query<{ status: string; client_id: string; supplier_id: string }>(
      "SELECT status, client_id, supplier_id FROM orders WHERE id = $1",
      [order_id]
    );
    if (!ord.rows[0]) return res.status(404).json({ error: "Pedido não encontrado." });
    if (!["Entregue", "Finalizado"].includes(ord.rows[0].status)) {
      return res.status(400).json({ error: "Pedido ainda não foi entregue. Avaliação não permitida." });
    }
    if (
      req.user!.role !== "admin" &&
      ord.rows[0].client_id !== req.user!.companyId &&
      ord.rows[0].supplier_id !== req.user!.companyId
    ) {
      return res.status(403).json({ error: "Você não é parte deste pedido." });
    }

    const existing = await query("SELECT id FROM reviews WHERE order_id = $1 AND from_user = $2", [order_id, req.user!.userId]);
    if (existing.rowCount) return res.status(409).json({ error: "Você já avaliou este pedido." });

    const userRes = await query(
      "SELECT u.name, c.name AS company FROM users u LEFT JOIN companies c ON c.id=u.company_id WHERE u.id=$1",
      [req.user!.userId]
    );
    const reviewer = userRes.rows[0] as { name: string; company: string };
    const id = await newReviewId();
    const today = new Date().toLocaleDateString("pt-BR");
    const { rows } = await query(
      `INSERT INTO reviews (id, order_id, from_company, from_user, rating, comment, date, criterios)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, order_id, reviewer.company || reviewer.name, req.user!.userId, rating, comment || null, today, JSON.stringify(criterios || [])]
    );
    await audit(req, "Avaliação enviada", "review", id);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch("/:id/reply", authenticate, validate([v.notEmptyString("reply", 2000)]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cur = await query<{ from_user: string; order_id: string }>(
      "SELECT from_user, order_id FROM reviews WHERE id = $1", [req.params.id]
    );
    if (!cur.rows[0]) return res.status(404).json({ error: "Avaliação não encontrada." });
    if (cur.rows[0].from_user === req.user!.userId) {
      return res.status(403).json({ error: "Autor não pode responder à própria review." });
    }
    const { rows } = await query(
      "UPDATE reviews SET reply = $1, reply_at = NOW() WHERE id = $2 RETURNING *",
      [req.body.reply, req.params.id]
    );
    await audit(req, "Resposta de avaliação", "review", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.patch("/:id/moderate", authenticate, authorize("admin"), validate([body("moderated").isBoolean()]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      "UPDATE reviews SET moderated = $1 WHERE id = $2 RETURNING *",
      [req.body.moderated, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Avaliação não encontrada." });
    await audit(req, `Avaliação ${req.body.moderated ? "publicada" : "ocultada"}`, "review", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
