import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { query } from "../db";
import { authenticate } from "../middleware/auth";
import { audit } from "../lib/audit";
import { newNdaId } from "../lib/idgen";
import { validate, v } from "../lib/validators";

const router = Router();

const NDA_VALIDITY_DAYS = 365;

router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { demandId, status } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (req.user!.role !== "admin") {
      conditions.push(`(signed_by = $${p} OR demand_id IN (SELECT id FROM demands WHERE created_by = $${p}))`);
      params.push(req.user!.userId); p++;
    }
    if (demandId) { conditions.push(`demand_id = $${p}`); params.push(demandId); p++; }
    if (status)   { conditions.push(`status = $${p}`);    params.push(status);   p++; }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT id, demand_id, supplier_company_id, status, signed_at, document_hash, expires_at, created_at FROM ndas ${where} ORDER BY created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query("SELECT id, demand_id, supplier_company_id, status, signed_at, document_hash, expires_at, created_at FROM ndas WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "NDA não encontrado." });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post(
  "/",
  authenticate,
  validate([
    v.notEmptyString("demand_id", 20),
    v.notEmptyString("contraparte", 200),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { demand_id, contraparte } = req.body as { demand_id: string; contraparte: string };

      const dem = await query<{ nda_required: boolean }>(
        "SELECT nda_required FROM demands WHERE id = $1",
        [demand_id]
      );
      if (!dem.rows[0]) return res.status(404).json({ error: "Demanda não encontrada." });

      const id = await newNdaId();
      const { rows } = await query(
        `INSERT INTO ndas (id, demand_id, contraparte, status)
         VALUES ($1, $2, $3, 'Pendente') RETURNING id, demand_id, supplier_company_id, status, signed_at, document_hash, expires_at, created_at`,
        [id, demand_id, contraparte]
      );
      await audit(req, "NDA criado", "nda", id);
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

router.post("/:id/sign", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cur = await query<{ status: string }>(
      "SELECT status FROM ndas WHERE id = $1",
      [req.params.id]
    );
    if (!cur.rows[0]) return res.status(404).json({ error: "NDA não encontrado." });
    if (cur.rows[0].status === "Cancelado" || cur.rows[0].status === "Expirado") {
      return res.status(409).json({ error: `NDA ${cur.rows[0].status.toLowerCase()} não pode ser assinado.` });
    }

    const now = new Date().toLocaleDateString("pt-BR");
    const expires = new Date();
    expires.setDate(expires.getDate() + NDA_VALIDITY_DAYS);
    const ip = req.ip || "—";

    const { rows } = await query(
      `UPDATE ndas
       SET signed_at = $1, signed_by = $2, ip = $3, status = 'Ativo', expires_at = $4
       WHERE id = $5 RETURNING id, demand_id, supplier_company_id, status, signed_at, document_hash, expires_at, created_at`,
      [now, req.user!.userId, ip, expires.toISOString().slice(0, 10), req.params.id]
    );

    await audit(req, "NDA assinado", "nda", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post("/:id/cancel", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cur = await query<{ signed_by: string }>("SELECT signed_by FROM ndas WHERE id = $1", [req.params.id]);
    if (!cur.rows[0]) return res.status(404).json({ error: "NDA não encontrado." });

    if (req.user!.role !== "admin" && cur.rows[0].signed_by !== req.user!.userId) {
      return res.status(403).json({ error: "Permissão insuficiente." });
    }

    const { rows } = await query(
      "UPDATE ndas SET status = 'Cancelado' WHERE id = $1 RETURNING id, demand_id, supplier_company_id, status, signed_at, document_hash, expires_at, created_at",
      [req.params.id]
    );
    await audit(req, "NDA cancelado", "nda", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
