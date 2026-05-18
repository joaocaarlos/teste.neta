import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { query } from "../db";
import { authenticate, authorize } from "../middleware/auth";
import { audit } from "../lib/audit";
import { validate } from "../lib/validators";
import { validateCNPJ } from "../lib/kyc";

const router = Router();

router.get("/stats", authenticate, authorize("admin"), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [users, companies, demands, orders, gmvTotal, gmv30, proposals, churn] = await Promise.all([
      query<{ total: string; active: string }>(`SELECT COUNT(*)::TEXT AS total, COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '30 days')::TEXT AS active FROM users WHERE deleted_at IS NULL`),
      query<{ total: string; approved: string }>(`SELECT COUNT(*)::TEXT AS total, COUNT(*) FILTER (WHERE status = 'Aprovado')::TEXT AS approved FROM companies`),
      query<{ total: string; open: string }>(`SELECT COUNT(*)::TEXT AS total, COUNT(*) FILTER (WHERE status IN ('Em cotação','Em negociação'))::TEXT AS open FROM demands`),
      query<{ total: string }>(`SELECT COUNT(*)::TEXT AS total FROM orders`),
      query<{ gmv: string | null }>(`SELECT COALESCE(SUM(value_raw), 0)::TEXT AS gmv FROM orders WHERE status = 'Finalizado'`),
      query<{ gmv: string | null }>(`SELECT COALESCE(SUM(value_raw), 0)::TEXT AS gmv FROM orders WHERE status = 'Finalizado' AND created_at > NOW() - INTERVAL '30 days'`),
      query<{ total: string; accepted: string }>(`SELECT COUNT(*)::TEXT AS total, COUNT(*) FILTER (WHERE status = 'Aceita')::TEXT AS accepted FROM proposals`),
      query<{ suspended_30d: string }>(`SELECT COUNT(*)::TEXT AS suspended_30d FROM companies WHERE status = 'Suspenso' AND updated_at > NOW() - INTERVAL '30 days'`),
    ]);

    const totalUsers = Number(users.rows[0]?.total || 0);
    const totalCompanies = Number(companies.rows[0]?.total || 0);
    const totalProposals = Number(proposals.rows[0]?.total || 0);
    const acceptedProposals = Number(proposals.rows[0]?.accepted || 0);
    const gmvTotalNum = Number(gmvTotal.rows[0]?.gmv || 0);
    const totalOrders = Number(orders.rows[0]?.total || 0);

    res.json({
      users: { total: totalUsers, active_30d: Number(users.rows[0]?.active || 0) },
      companies: { total: totalCompanies, approved: Number(companies.rows[0]?.approved || 0) },
      demands: { total: Number(demands.rows[0]?.total || 0), open: Number(demands.rows[0]?.open || 0) },
      orders: { total: totalOrders, gmv_total: gmvTotalNum, gmv_30d: Number(gmv30.rows[0]?.gmv || 0), avg_ticket: totalOrders > 0 ? gmvTotalNum / totalOrders : 0 },
      proposals: { total: totalProposals, accepted: acceptedProposals, conversion_rate: totalProposals > 0 ? acceptedProposals / totalProposals : 0 },
      churn: { suspended_30d: Number(churn.rows[0]?.suspended_30d || 0), rate_30d: totalCompanies > 0 ? Number(churn.rows[0]?.suspended_30d || 0) / totalCompanies : 0 },
      generated_at: new Date().toISOString(),
    });
  } catch (err) { next(err); }
});

router.get("/stats/timeseries", authenticate, authorize("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metric = (req.query.metric as string) || "orders";
    const period = (req.query.period as string) || "30d";
    const days = Math.min(Math.max(Number(period.replace("d", "")) || 30, 1), 365);
    const TABLES: Record<string, { table: string; dateCol: string }> = {
      orders: { table: "orders", dateCol: "created_at" },
      demands: { table: "demands", dateCol: "created_at" },
      users: { table: "users", dateCol: "created_at" },
      proposals: { table: "proposals", dateCol: "created_at" },
    };
    const cfg = TABLES[metric];
    if (!cfg) return res.status(400).json({ error: "Métrica inválida." });
    const { rows } = await query<{ day: string; count: string }>(
      `SELECT to_char(date_trunc('day', ${cfg.dateCol}), 'YYYY-MM-DD') AS day, COUNT(*)::TEXT AS count
       FROM ${cfg.table}
       WHERE ${cfg.dateCol} > NOW() - ($1 || ' days')::INTERVAL
       GROUP BY 1 ORDER BY 1 ASC`,
      [String(days)]
    );
    res.json({ metric, period: `${days}d`, series: rows.map((r) => ({ day: r.day, count: Number(r.count) })) });
  } catch (err) { next(err); }
});

router.get("/companies/:id/kyc", authenticate, authorize("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query<{ id: string; name: string; cnpj: string | null; status: string; kyc_verified_at: Date | null; kyc_source: string | null }>(
      `SELECT id, name, cnpj, status, kyc_verified_at, kyc_source FROM companies WHERE id = $1`,
      [req.params.id]
    );
    const company = rows[0];
    if (!company) return res.status(404).json({ error: "Empresa não encontrada." });
    const cnpjCheck = company.cnpj ? await validateCNPJ(company.cnpj) : null;
    const docs = await query(`SELECT id, original_name, mime_type, created_at FROM uploaded_files WHERE entity_type IN ('verification_document', 'company_logo') AND entity_id::TEXT = $1::TEXT ORDER BY created_at DESC`, [company.id]);
    res.json({ company, cnpj_check: cnpjCheck, documents: docs.rows });
  } catch (err) { next(err); }
});

router.post("/companies/:id/kyc/verify", authenticate, authorize("admin"), validate([body("notes").optional().isString().isLength({ max: 1000 })]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `UPDATE companies SET kyc_verified_at = NOW(), kyc_source = 'manual', status = CASE WHEN status = 'Pendente' THEN 'Aprovado' ELSE status END, updated_at = NOW() WHERE id = $1 RETURNING id, name, status, kyc_verified_at`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Empresa não encontrada." });
    await audit(req, "KYC verificado manualmente", "kyc", req.params.id, { notes: req.body.notes || null });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get("/disputes", authenticate, authorize("admin"), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT d.*, EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 3600 AS age_hours,
              CASE WHEN d.due_at IS NOT NULL AND NOW() > d.due_at THEN 'overdue'
                   WHEN d.due_at IS NOT NULL AND NOW() > d.due_at - INTERVAL '24 hours' THEN 'at_risk'
                   ELSE 'on_time' END AS sla_status
       FROM disputes d
       WHERE d.status NOT IN ('Resolvida', 'Encerrada')
       ORDER BY CASE WHEN d.due_at IS NOT NULL AND NOW() > d.due_at THEN 0 WHEN d.impact = 'Crítico' THEN 1 WHEN d.impact = 'Alto' THEN 2 ELSE 3 END, d.created_at ASC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

export default router;
