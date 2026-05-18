import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { query } from "../db";
import { authenticate, authorize } from "../middleware/auth";
import { audit } from "../lib/audit";
import { validate, v } from "../lib/validators";
import { makeUploader, persistUpload } from "../lib/upload";
import { stripe } from "../lib/stripe";

const router = Router();
const logoUpload = makeUploader("logo");
const earthRadiusKm = 6371;

function isValidCNPJ(cnpj: string): boolean {
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (slice: string, weights: number[]) => {
    const sum = slice.split("").reduce((acc, d, i) => acc + Number(d) * weights[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calc(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(c.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(c[12]) && d2 === Number(c[13]);
}

function haversineSql(latParam: number, lngParam: number): string {
  return `(${earthRadiusKm} * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(latitude - ${latParam}) / 2), 2) +
    COS(RADIANS(${latParam})) * COS(RADIANS(latitude)) *
    POWER(SIN(RADIANS(longitude - ${lngParam}) / 2), 2)
  )))`;
}

router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, status, search } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (type)   { conditions.push(`type = $${p}`);   params.push(type);   p++; }
    if (status) { conditions.push(`status = $${p}`); params.push(status); p++; }
    if (search) {
      conditions.push(`(name ILIKE $${p} OR cnpj ILIKE $${p})`);
      params.push(`%${search}%`); p++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT * FROM companies ${where} ORDER BY created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/near", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Math.min(Number(req.query.radiusKm || 100), 1000);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "lat e lng sao obrigatorios." });
    }
    const distanceExpr = haversineSql(lat, lng);
    const { rows } = await query(
      `SELECT id, name, type, city, logo_url, description, latitude, longitude,
              orders_count, ${distanceExpr} AS distance_km
       FROM companies
       WHERE status = 'Aprovado'
         AND latitude IS NOT NULL
         AND longitude IS NOT NULL
         AND ${distanceExpr} <= $1
       ORDER BY distance_km ASC
       LIMIT 100`,
      [radiusKm]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/public/by-slug/:slug", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM companies WHERE slug = $1 AND public_profile_enabled = TRUE AND status = 'Aprovado'`,
      [req.params.slug]
    );
    if (!rows[0]) return res.status(404).json({ error: "Perfil publico nao encontrado." });
    return res.redirect(308, `/api/companies/${rows[0].id}/public`);
  } catch (err) { next(err); }
});

router.get("/:id/public", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.slug, c.name, c.type, c.status, c.city, c.address, c.site, c.logo_url,
              c.description, c.orders_count, c.latitude, c.longitude,
              c.stripe_payouts_enabled, c.created_at,
              c.certifications, c.specialties, c.gallery_ids,
              c.kyc_verified_at, c.public_profile_enabled,
              COALESCE((SELECT COUNT(*) FROM machines m WHERE m.company_id = c.id),0) AS machines_count,
              COALESCE((SELECT AVG(r.rating)::numeric(3,1)
                        FROM reviews r
                        JOIN orders o ON o.id = r.order_id
                        WHERE o.supplier_id = c.id AND r.moderated = TRUE),0) AS avg_rating,
              COALESCE((SELECT COUNT(*)
                        FROM reviews r
                        JOIN orders o ON o.id = r.order_id
                        WHERE o.supplier_id = c.id AND r.moderated = TRUE),0) AS reviews_count,
              COALESCE((SELECT COUNT(*) FROM orders o WHERE o.supplier_id = c.id AND o.status IN ('Entregue','Finalizado')),0) AS delivered_orders,
              COALESCE((SELECT COUNT(*) FROM verification_documents vd WHERE vd.company_id = c.id AND vd.status = 'Aprovado'),0) AS approved_docs
       FROM companies c
       WHERE c.id = $1
         AND c.status = 'Aprovado'
         AND (c.public_profile_enabled = TRUE OR c.public_profile_enabled IS NULL)`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Perfil publico nao encontrado." });

    const gallery_ids = (rows[0] as { gallery_ids: string[] | null }).gallery_ids || [];
    let gallery: Array<{ id: string; url: string }> = [];
    if (gallery_ids.length) {
      const { rows: imgs } = await query<{ id: string }>(
        `SELECT id FROM uploaded_files WHERE id = ANY($1)`,
        [gallery_ids]
      );
      gallery = imgs.map((i) => ({ id: i.id, url: `/api/uploads/${i.id}` }));
    }

    res.json({ ...rows[0], gallery });
  } catch (err) { next(err); }
});

router.post("/:id/gallery", authenticate, logoUpload.array("files", 10), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== "admin" && req.user!.companyId !== req.params.id) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) return res.status(400).json({ error: "Nenhum arquivo enviado." });

    const saved = [];
    const newIds: string[] = [];
    for (const file of files) {
      const s = await persistUpload(req, file, "company_logo", req.params.id, true);
      saved.push(s);
      newIds.push(s.id);
    }

    const { rows } = await query<{ gallery_ids: string[] | null }>(
      `UPDATE companies
       SET gallery_ids = COALESCE(gallery_ids, '{}'::uuid[]) || $1::uuid[]
       WHERE id = $2
       RETURNING gallery_ids`,
      [newIds, req.params.id]
    );

    await audit(req, `${saved.length} imagens adicionadas à galeria`, "empresa", req.params.id);
    res.status(201).json({ added: saved, gallery_ids: rows[0]?.gallery_ids || [] });
  } catch (err) { next(err); }
});

router.delete("/:id/gallery/:fileId", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== "admin" && req.user!.companyId !== req.params.id) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    const { rows } = await query<{ gallery_ids: string[] | null }>(
      `UPDATE companies
       SET gallery_ids = array_remove(COALESCE(gallery_ids, '{}'::uuid[]), $1::uuid)
       WHERE id = $2
       RETURNING gallery_ids`,
      [req.params.fileId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Empresa não encontrada." });
    await query(`DELETE FROM uploaded_files WHERE id = $1`, [req.params.fileId]).catch(() => undefined);
    await audit(req, "Imagem removida da galeria", "empresa", req.params.id);
    res.json({ gallery_ids: rows[0].gallery_ids || [] });
  } catch (err) { next(err); }
});

router.get("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query("SELECT * FROM companies WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Empresa não encontrada." });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.patch("/:id/logo", authenticate, logoUpload.single("file"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== "admin" && req.user!.companyId !== req.params.id) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    if (!req.file) return res.status(400).json({ error: "Arquivo de logo e obrigatorio." });

    const saved = await persistUpload(req, req.file, "company_logo", req.params.id, true);
    const { rows } = await query(
      "UPDATE companies SET logo_url = $1 WHERE id = $2 RETURNING *",
      [saved.url, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Empresa nao encontrada." });
    await audit(req, "Logo da empresa atualizado", "empresa", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.patch(
  "/:id/location",
  authenticate,
  validate([
    body("latitude").isFloat({ min: -90, max: 90 }).toFloat(),
    body("longitude").isFloat({ min: -180, max: 180 }).toFloat(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.role !== "admin" && req.user!.companyId !== req.params.id) {
        return res.status(403).json({ error: "Permissao insuficiente." });
      }
      const { rows } = await query(
        `UPDATE companies
         SET latitude = $1, longitude = $2, geocoded_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [req.body.latitude, req.body.longitude, req.params.id]
      );
      if (!rows[0]) return res.status(404).json({ error: "Empresa nao encontrada." });
      await audit(req, "Geolocalizacao da empresa atualizada", "empresa", req.params.id);
      res.json(rows[0]);
    } catch (err) { next(err); }
  }
);

router.get("/:id/team", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== "admin" && req.user!.companyId !== req.params.id) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    const { rows } = await query(
      `SELECT id, name, email, role, avatar, avatar_url, last_login_at, created_at
       FROM users
       WHERE company_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/:id/bank-accounts", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== "admin" && req.user!.companyId !== req.params.id) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    const { rows } = await query(
      `SELECT id, company_id, bank_name, bank_code, agency,
              repeat('*', GREATEST(length(account)-4, 0)) || right(account, 4) AS account_mask,
              account_type, pix_key, is_default, created_at
       FROM bank_accounts
       WHERE company_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post(
  "/:id/bank-accounts",
  authenticate,
  validate([
    v.notEmptyString("bank_name", 100),
    v.notEmptyString("agency", 20),
    v.notEmptyString("account", 30),
    v.optionalString("bank_code", 10),
    v.optionalString("account_type", 20),
    v.optionalString("pix_key", 150),
    body("is_default").optional().isBoolean().toBoolean(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.role !== "admin" && req.user!.companyId !== req.params.id) {
        return res.status(403).json({ error: "Permissao insuficiente." });
      }
      if (req.body.is_default) {
        await query("UPDATE bank_accounts SET is_default = FALSE WHERE company_id = $1", [req.params.id]);
      }
      const { rows } = await query(
        `INSERT INTO bank_accounts
           (company_id, bank_name, bank_code, agency, account, account_type, pix_key, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id, company_id, bank_name, bank_code, agency,
                   repeat('*', GREATEST(length(account)-4, 0)) || right(account, 4) AS account_mask,
                   account_type, pix_key, is_default, created_at`,
        [
          req.params.id,
          req.body.bank_name,
          req.body.bank_code || null,
          req.body.agency,
          req.body.account,
          req.body.account_type || "corrente",
          req.body.pix_key || null,
          req.body.is_default || false,
        ]
      );
      await audit(req, "Conta bancaria cadastrada", "financeiro", req.params.id);
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  }
);

router.post("/:id/stripe/onboarding", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== "admin" && req.user!.companyId !== req.params.id) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    const companyRes = await query<{ id: string; name: string; cnpj: string; stripe_account_id: string | null; email: string | null }>(
      `SELECT c.id, c.name, c.cnpj, c.stripe_account_id,
              (SELECT email FROM users WHERE company_id = c.id AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1) AS email
       FROM companies c
       WHERE c.id = $1`,
      [req.params.id]
    );
    const company = companyRes.rows[0];
    if (!company) return res.status(404).json({ error: "Empresa nao encontrada." });

    let accountId = company.stripe_account_id;
    if (!accountId) {
      const account = await stripe().accounts.create({
        country: "BR",
        email: company.email || undefined,
        business_type: "company",
        company: { name: company.name },
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
        controller: {
          fees: { payer: "application" },
          losses: { payments: "application" },
          requirement_collection: "stripe",
          stripe_dashboard: { type: "express" },
        },
        metadata: { companyId: company.id, cnpj: company.cnpj },
      } as any);
      accountId = account.id;
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const link = await stripe().accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${appUrl}/verificacao?stripe=refresh`,
      return_url: `${appUrl}/verificacao?stripe=return`,
    });
    const account = await stripe().accounts.retrieve(accountId);
    const { rows } = await query(
      `UPDATE companies
       SET stripe_account_id = $1,
           stripe_onboarding_url = $2,
           stripe_charges_enabled = $3,
           stripe_payouts_enabled = $4,
           stripe_details_submitted = $5
       WHERE id = $6
       RETURNING *`,
      [
        accountId,
        link.url,
        Boolean((account as any).charges_enabled),
        Boolean((account as any).payouts_enabled),
        Boolean((account as any).details_submitted),
        req.params.id,
      ]
    );
    await audit(req, "Onboarding Stripe Connect criado", "financeiro", req.params.id);
    res.status(201).json({ onboardingUrl: link.url, accountId, company: rows[0] });
  } catch (err) { next(err); }
});

router.post("/:id/stripe/sync", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== "admin" && req.user!.companyId !== req.params.id) {
      return res.status(403).json({ error: "Permissao insuficiente." });
    }
    const cur = await query<{ stripe_account_id: string | null }>("SELECT stripe_account_id FROM companies WHERE id = $1", [req.params.id]);
    const accountId = cur.rows[0]?.stripe_account_id;
    if (!accountId) return res.status(409).json({ error: "Empresa ainda nao iniciou onboarding Stripe." });
    const account = await stripe().accounts.retrieve(accountId);
    const { rows } = await query(
      `UPDATE companies
       SET stripe_charges_enabled = $1,
           stripe_payouts_enabled = $2,
           stripe_details_submitted = $3,
           stripe_onboarded_at = CASE WHEN $2 = TRUE THEN COALESCE(stripe_onboarded_at, NOW()) ELSE stripe_onboarded_at END
       WHERE id = $4
       RETURNING *`,
      [
        Boolean((account as any).charges_enabled),
        Boolean((account as any).payouts_enabled),
        Boolean((account as any).details_submitted),
        req.params.id,
      ]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.patch("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== "admin" && req.user!.companyId !== req.params.id) {
      return res.status(403).json({ error: "Permissão insuficiente." });
    }

    if (req.body.cnpj && !isValidCNPJ(req.body.cnpj)) {
      return res.status(400).json({ error: "CNPJ inválido (dígitos verificadores incorretos)." });
    }

    const allowed = ["name","cnpj","city","address","site","description"];
    if (req.user!.role === "admin") allowed.push("status", "type");

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${i}`);
        values.push(req.body[key]);
        i++;
      }
    }
    if (!fields.length) return res.status(400).json({ error: "Nenhum campo para atualizar." });

    values.push(req.params.id);
    const { rows } = await query(
      `UPDATE companies SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: "Empresa não encontrada." });
    await audit(req, "Empresa atualizada", "empresa", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post("/:id/approve", authenticate, authorize("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      "UPDATE companies SET status = 'Aprovado' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Empresa não encontrada." });
    await audit(req, "Empresa aprovada", "empresa", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post("/:id/reject", authenticate, authorize("admin"), validate([v.optionalString("reason", 500)]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body as { reason?: string };
    const { rows } = await query(
      "UPDATE companies SET status = 'Reprovado' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Empresa não encontrada." });
    await audit(req, `Empresa reprovada${reason ? `: ${reason}` : ""}`, "empresa", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post("/:id/suspend", authenticate, authorize("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      "UPDATE companies SET status = 'Suspenso' WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Empresa não encontrada." });
    await audit(req, "Empresa suspensa", "empresa", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post("/:id/reactivate", authenticate, authorize("admin"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query(
      "UPDATE companies SET status = 'Aprovado' WHERE id = $1 AND status IN ('Suspenso','Reprovado') RETURNING *",
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Empresa não está suspensa/reprovada." });
    await audit(req, "Empresa reativada", "empresa", req.params.id);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
