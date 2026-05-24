import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { query } from "../db";

const router = Router();

// GET /surveys/nps/pending — unanswered NPS for current user (not expired)
router.get("/nps/pending", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { rows } = await query(
      `SELECT s.id, s.order_id, s.sent_at, s.expires_at,
              o.title as order_title
       FROM nps_surveys s
       JOIN orders o ON s.order_id = o.id
       WHERE s.user_id = $1
         AND s.answered_at IS NULL
         AND s.expires_at > NOW()
       ORDER BY s.sent_at ASC
       LIMIT 1`,
      [userId]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// POST /surveys/nps/:surveyId — submit answer
router.post("/nps/:surveyId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { surveyId } = req.params;
    const userId = req.user!.userId;
    const { score, comment } = req.body as { score: unknown; comment?: string };
    if (typeof score !== "number" || score < 0 || score > 10) {
      return res.status(400).json({ error: "Score deve ser entre 0 e 10." });
    }
    const { rowCount } = await query(
      `UPDATE nps_surveys SET score=$1, comment=$2, answered_at=NOW()
       WHERE id=$3 AND user_id=$4 AND answered_at IS NULL`,
      [score, comment || null, surveyId, userId]
    );
    if (!rowCount) return res.status(404).json({ error: "Survey não encontrado." });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /surveys/nps/stats — admin only
router.get("/nps/stats", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.user!.role;
    if (role !== "admin") return res.status(403).json({ error: "Acesso negado." });
    const { rows } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE score >= 9) as promoters,
         COUNT(*) FILTER (WHERE score BETWEEN 7 AND 8) as passives,
         COUNT(*) FILTER (WHERE score <= 6) as detractors,
         COUNT(*) as total,
         ROUND(AVG(score), 1) as avg_score
       FROM nps_surveys WHERE answered_at IS NOT NULL`
    );
    const r = rows[0] as {
      promoters: string;
      passives: string;
      detractors: string;
      total: string;
      avg_score: string;
    };
    const total = Number(r.total) || 1;
    const nps = Math.round((Number(r.promoters) / total - Number(r.detractors) / total) * 100);
    res.json({ data: { ...r, nps_score: nps } });
  } catch (err) { next(err); }
});

export default router;
