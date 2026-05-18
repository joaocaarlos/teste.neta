import { Router, Request, Response, NextFunction } from "express";
import { query } from "../db";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, authorize("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tipo, usuario, empresa, search, from, to, limit = "100", offset = "0" } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;
    if (tipo)    { conditions.push(`tipo = $${p}`);             params.push(tipo);    p++; }
    if (usuario) { conditions.push(`usuario ILIKE $${p}`);      params.push(`%${usuario}%`); p++; }
    if (empresa) { conditions.push(`empresa ILIKE $${p}`);      params.push(`%${empresa}%`); p++; }
    if (search)  { conditions.push(`(evento ILIKE $${p} OR ref ILIKE $${p})`); params.push(`%${search}%`); p++; }
    if (from) { conditions.push(`created_at >= $${p}`); params.push(from); p++; }
    if (to)   { conditions.push(`created_at <= $${p}`); params.push(to);   p++; }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${p} OFFSET $${p+1}`, [...params, Number(limit), Number(offset)]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/stats", authenticate, authorize("admin"), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(`SELECT tipo, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS last_24h, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS last_7d FROM audit_logs GROUP BY tipo ORDER BY total DESC`);
    res.json(rows);
  } catch (err) { next(err); }
});

export default router;
