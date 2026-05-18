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

/**
 * #21 — Admin resolves a dispute
 * POST /admin/disputes/:id/resolve
 */
router.post(
  "/disputes/:id/resolve",
  authenticate,
  authorize("admin"),
  validate([
    body("decision").isIn(["supplier", "buyer", "partial", "rework"]).withMessage("Decisão inválida."),
    body("refundPercent").optional().isFloat({ min: 0, max: 100 }),
    body("reason").isString().isLength({ min: 10, max: 2000 }),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { decision, refundPercent, reason } = req.body as {
        decision: "supplier" | "buyer" | "partial" | "rework";
        refundPercent?: number;
        reason: string;
      };

      const statusMap: Record<string, string> = {
        supplier: "resolved_supplier",
        buyer:    "resolved_buyer",
        partial:  "resolved_partial",
        rework:   "rework_requested",
      };

      const { rows } = await query(
        `UPDATE disputes
         SET status = $1, resolved_at = NOW(), admin_decision = $2, admin_reason = $3,
             refund_percent = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [statusMap[decision], decision, reason, refundPercent ?? null, id]
      );
      if (!rows[0]) return res.status(404).json({ error: "Disputa não encontrada." });

      await audit(req, "Disputa resolvida pelo admin", "dispute", id, { decision, reason, refundPercent });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

/**
 * #19 — Admin manually releases escrow payment
 * POST /admin/orders/:id/release
 */
router.post(
  "/orders/:id/release",
  authenticate,
  authorize("admin"),
  validate([body("reason").optional().isString().isLength({ max: 500 })]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { rows } = await query(
        `UPDATE orders
         SET payment_status = 'released', released_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND payment_status = 'captured'
         RETURNING id, payment_status, released_at`,
        [id]
      );
      if (!rows[0]) return res.status(404).json({ error: "Pedido não encontrado ou pagamento não capturado." });

      await audit(req, "Pagamento liberado manualmente pelo admin", "order", id, { reason: req.body.reason });
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

/**
 * #22 — Executive KPI dashboard
 * GET /admin/dashboard/kpis?period=7d|30d|90d
 */
router.get(
  "/dashboard/kpis",
  authenticate,
  authorize("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const periodStr  = ((req.query.period as string) || "30d").replace(/[^0-9d]/g, "");
      const days       = Math.min(365, Math.max(1, Number(periodStr.replace("d", "")) || 30));
      const prevDays   = days * 2;

      const interval    = `'${days} days'::INTERVAL`;
      const prevInterval = `'${prevDays} days'::INTERVAL`;

      const [
        gmvRow, prevGmvRow,
        revenueRow, prevRevenueRow,
        demandsRow, prevDemandsRow,
        proposalsRow, prevProposalsRow,
        ordersRow, prevOrdersRow,
        completedRow, prevCompletedRow,
        disputeRow,
        activeSupplierRow,
        demandNoProposalRow,
        avgResponseRow,
        avgTicketRow,
        npsRow,
        lateRow,
      ] = await Promise.all([
        query<{ gmv: string }>(`SELECT COALESCE(SUM(value_raw),0)::TEXT AS gmv FROM orders WHERE created_at > NOW() - ${interval}`),
        query<{ gmv: string }>(`SELECT COALESCE(SUM(value_raw),0)::TEXT AS gmv FROM orders WHERE created_at BETWEEN NOW() - ${prevInterval} AND NOW() - ${interval}`),
        query<{ rev: string }>(`SELECT COALESCE(SUM(platform_fee_amount),0)::TEXT AS rev FROM orders WHERE payment_status = 'released' AND released_at > NOW() - ${interval}`),
        query<{ rev: string }>(`SELECT COALESCE(SUM(platform_fee_amount),0)::TEXT AS rev FROM orders WHERE payment_status = 'released' AND released_at BETWEEN NOW() - ${prevInterval} AND NOW() - ${interval}`),
        query<{ cnt: string }>(`SELECT COUNT(*)::TEXT AS cnt FROM demands WHERE created_at > NOW() - ${interval}`),
        query<{ cnt: string }>(`SELECT COUNT(*)::TEXT AS cnt FROM demands WHERE created_at BETWEEN NOW() - ${prevInterval} AND NOW() - ${interval}`),
        query<{ cnt: string }>(`SELECT COUNT(*)::TEXT AS cnt FROM proposals WHERE created_at > NOW() - ${interval}`),
        query<{ cnt: string }>(`SELECT COUNT(*)::TEXT AS cnt FROM proposals WHERE created_at BETWEEN NOW() - ${prevInterval} AND NOW() - ${interval}`),
        query<{ cnt: string }>(`SELECT COUNT(*)::TEXT AS cnt FROM orders WHERE created_at > NOW() - ${interval}`),
        query<{ cnt: string }>(`SELECT COUNT(*)::TEXT AS cnt FROM orders WHERE created_at BETWEEN NOW() - ${prevInterval} AND NOW() - ${interval}`),
        query<{ cnt: string }>(`SELECT COUNT(*)::TEXT AS cnt FROM orders WHERE status = 'Finalizado' AND updated_at > NOW() - ${interval}`),
        query<{ cnt: string }>(`SELECT COUNT(*)::TEXT AS cnt FROM orders WHERE status = 'Finalizado' AND updated_at BETWEEN NOW() - ${prevInterval} AND NOW() - ${interval}`),
        query<{ cnt: string }>(`SELECT COUNT(*)::TEXT AS cnt FROM disputes WHERE status NOT IN ('Resolvida','Encerrada')`),
        query<{ cnt: string }>(`SELECT COUNT(DISTINCT supplier_company_id)::TEXT AS cnt FROM orders WHERE created_at > NOW() - ${interval}`),
        query<{ cnt: string }>(`SELECT COUNT(*)::TEXT AS cnt FROM demands d WHERE NOT EXISTS (SELECT 1 FROM proposals p WHERE p.demand_id = d.id) AND d.status IN ('Em cotação','Em negociação') AND d.created_at > NOW() - ${interval}`),
        query<{ avg_h: string }>(`SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (p.created_at - d.published_at)) / 3600), 0)::TEXT AS avg_h FROM proposals p JOIN demands d ON d.id = p.demand_id WHERE d.published_at > NOW() - ${interval} AND p.id = (SELECT id FROM proposals WHERE demand_id = d.id ORDER BY created_at LIMIT 1)`),
        query<{ avg_ticket: string }>(`SELECT COALESCE(AVG(value_raw), 0)::TEXT AS avg_ticket FROM orders WHERE status = 'Finalizado' AND updated_at > NOW() - ${interval}`),
        query<{ avg_nps: string }>(`SELECT COALESCE(AVG(rating), 0)::TEXT AS avg_nps FROM reviews WHERE created_at > NOW() - ${interval}`),
        query<{ late: string; total: string }>(`SELECT COUNT(*) FILTER (WHERE deadline_at < NOW() AND status NOT IN ('Finalizado','Cancelado'))::TEXT AS late, COUNT(*)::TEXT AS total FROM orders WHERE status NOT IN ('Finalizado','Cancelado')`),
      ]);

      const pct = (curr: number, prev: number) =>
        prev === 0 ? null : Number((((curr - prev) / prev) * 100).toFixed(1));

      const gmv     = Number(gmvRow.rows[0]?.gmv ?? 0);
      const prevGmv = Number(prevGmvRow.rows[0]?.gmv ?? 0);
      const rev     = Number(revenueRow.rows[0]?.rev ?? 0);
      const prevRev = Number(prevRevenueRow.rows[0]?.rev ?? 0);
      const demands = Number(demandsRow.rows[0]?.cnt ?? 0);
      const prevDemands = Number(prevDemandsRow.rows[0]?.cnt ?? 0);
      const proposals = Number(proposalsRow.rows[0]?.cnt ?? 0);
      const prevProposals = Number(prevProposalsRow.rows[0]?.cnt ?? 0);
      const orders  = Number(ordersRow.rows[0]?.cnt ?? 0);
      const prevOrders = Number(prevOrdersRow.rows[0]?.cnt ?? 0);
      const completed = Number(completedRow.rows[0]?.cnt ?? 0);
      const prevCompleted = Number(prevCompletedRow.rows[0]?.cnt ?? 0);
      const late    = Number(lateRow.rows[0]?.late ?? 0);
      const lateTotal = Number(lateRow.rows[0]?.total ?? 1);

      res.json({
        period: `${days}d`,
        kpis: {
          gmv:              { value: gmv,       change: pct(gmv, prevGmv) },
          revenue:          { value: rev,       change: pct(rev, prevRev) },
          demands:          { value: demands,   change: pct(demands, prevDemands) },
          proposals:        { value: proposals, change: pct(proposals, prevProposals) },
          orders:           { value: orders,    change: pct(orders, prevOrders) },
          completed:        { value: completed, change: pct(completed, prevCompleted) },
          disputesOpen:     { value: Number(disputeRow.rows[0]?.cnt ?? 0) },
          activeSuppliers:  { value: Number(activeSupplierRow.rows[0]?.cnt ?? 0) },
          demandsNoProposal:{ value: Number(demandNoProposalRow.rows[0]?.cnt ?? 0) },
          avgFirstResponseH:{ value: Number(Number(avgResponseRow.rows[0]?.avg_h ?? 0).toFixed(1)) },
          avgTicket:        { value: Number(Number(avgTicketRow.rows[0]?.avg_ticket ?? 0).toFixed(2)) },
          nps:              { value: Number(Number(npsRow.rows[0]?.avg_nps ?? 0).toFixed(2)) },
          lateOrdersRate:   { value: lateTotal > 0 ? Number((late / lateTotal).toFixed(3)) : 0 },
        },
        conversionFunnel: {
          demands,
          proposals,
          orders,
          completed,
        },
        generatedAt: new Date().toISOString(),
      });
    } catch (err) { next(err); }
  }
);

export default router;
