import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { authenticate, authorize } from "../middleware/auth";
import { query } from "../db";
import { audit } from "../lib/audit";
import { validate, v } from "../lib/validators";

const router = Router();

router.post("/", authenticate, validate([
  body("type").optional().isIn(["bug", "feedback", "feature"]),
  body("rating").optional({ nullable: true }).isInt({ min: 1, max: 5 }),
  v.optionalString("page", 200),
  v.notEmptyString("message", 5000),
  body("metadata").optional({ nullable: true }).isObject(),
]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, rating, page, message, metadata } = req.body;
    const { rows } = await query(
      `INSERT INTO feedback (user_id, type, rating, page, message, metadata) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user!.userId, type || "feedback", rating || null, page || null, message, metadata ? JSON.stringify(metadata) : null]
    );
    await audit(req, "Feedback beta enviado", "feedback", String(rows[0].id));
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.get("/", authenticate, authorize("admin"), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(`SELECT f.*, u.email, u.name FROM feedback f LEFT JOIN users u ON u.id = f.user_id ORDER BY f.created_at DESC LIMIT 200`);
    res.json(rows);
  } catch (err) { next(err); }
});

export default router;
