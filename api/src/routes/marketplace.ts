/**
 * #23 Marketplace with advanced industrial filters
 * GET /api/v1/marketplace/suppliers
 */
import { Router, Request, Response } from "express";
import { query as dbQuery } from "../db";
import { validate, v } from "../lib/validators";
import { ok } from "../lib/response";

const router = Router();

/**
 * @swagger
 * /marketplace/suppliers:
 *   get:
 *     summary: Busca fornecedores com filtros industriais avançados
 *     tags: [Marketplace]
 *     parameters:
 *       - in: query
 *         name: process
 *         schema: { type: string }
 *       - in: query
 *         name: material
 *         schema: { type: string }
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *       - in: query
 *         name: minRating
 *         schema: { type: number }
 *       - in: query
 *         name: certification
 *         schema: { type: string }
 *       - in: query
 *         name: minCapacity
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [relevance, rating, price] }
 */
router.get(
  "/suppliers",
  validate([
    v.optionalQuery("process"),
    v.optionalQuery("material"),
    v.optionalQuery("state"),
    v.optionalQuery("certification"),
  ]),
  async (req: Request, res: Response) => {
    const {
      process: process_filter,
      material,
      state,
      minRating,
      certification,
      minCapacity,
      page = "1",
      limit = "20",
      sort = "relevance",
    } = req.query as Record<string, string>;

    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const offset   = (pageNum - 1) * limitNum;
    const minRatingNum = minRating ? Number(minRating) : 0;
    const minCapacityNum = minCapacity ? Number(minCapacity) : 0;

    const conditions: string[] = ["c.role = 'fornecedor'", "c.verified = true"];
    const params: unknown[] = [];
    let idx = 1;

    if (process_filter) {
      conditions.push(`c.processes @> ARRAY[$${idx}]::text[]`);
      params.push(process_filter.toLowerCase());
      idx++;
    }
    if (material) {
      conditions.push(`c.materials @> ARRAY[$${idx}]::text[]`);
      params.push(material.toLowerCase());
      idx++;
    }
    if (state) {
      conditions.push(`c.state = $${idx}`);
      params.push(state.toUpperCase());
      idx++;
    }
    if (certification) {
      conditions.push(`c.certifications @> ARRAY[$${idx}]::text[]`);
      params.push(certification);
      idx++;
    }
    if (minRatingNum > 0) {
      conditions.push(`COALESCE(c.avg_rating, 0) >= $${idx}`);
      params.push(minRatingNum);
      idx++;
    }
    if (minCapacityNum > 0) {
      conditions.push(`COALESCE(c.monthly_capacity, 0) >= $${idx}`);
      params.push(minCapacityNum);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const orderClause =
      sort === "rating"    ? "c.avg_rating DESC NULLS LAST" :
      sort === "price"     ? "c.avg_order_value ASC NULLS LAST" :
                            "c.trust_score DESC NULLS LAST, c.avg_rating DESC NULLS LAST";

    const countSql = `
      SELECT COUNT(*) AS total
      FROM companies c
      ${where}
    `;

    const dataSql = `
      SELECT
        c.id,
        c.name,
        c.state,
        c.city,
        c.processes,
        c.materials,
        c.certifications,
        c.monthly_capacity,
        c.avg_rating,
        c.completed_orders,
        c.trust_score,
        c.trust_badge,
        c.available_from,
        c.avatar_url
      FROM companies c
      ${where}
      ORDER BY ${orderClause}
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const [countResult, dataResult] = await Promise.all([
      dbQuery<{ total: string }>(countSql, params),
      dbQuery(dataSql, [...params, limitNum, offset]),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);
    const pages = Math.ceil(total / limitNum);

    ok(res, {
      data: dataResult.rows,
      meta: { total, page: pageNum, pages, limit: limitNum },
    });
  }
);

export default router;
