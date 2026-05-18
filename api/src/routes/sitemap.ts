import { Router, Request, Response, NextFunction } from "express";
import { query } from "../db";

const router = Router();
const SITE_URL = process.env.APP_URL || "https://capacity.com.br";

router.get("/sitemap.xml", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const staticPaths = [
      { loc: "/",              priority: "1.0", changefreq: "daily"   },
      { loc: "/como-funciona", priority: "0.9", changefreq: "monthly" },
      { loc: "/precos",        priority: "0.9", changefreq: "monthly" },
      { loc: "/sobre",         priority: "0.7", changefreq: "monthly" },
      { loc: "/privacidade",   priority: "0.5", changefreq: "yearly"  },
      { loc: "/termos",        priority: "0.5", changefreq: "yearly"  },
      { loc: "/contato",       priority: "0.6", changefreq: "yearly"  },
    ];
    const { rows: companies } = await query<{ slug: string; updated_at: Date }>(
      `SELECT slug, updated_at FROM companies WHERE public_profile_enabled = TRUE AND slug IS NOT NULL AND status = 'Aprovado'`
    );
    const today = new Date().toISOString().split("T")[0];
    const entries: string[] = [];
    for (const p of staticPaths) {
      entries.push(`  <url>\n    <loc>${SITE_URL}${p.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`);
    }
    for (const c of companies) {
      const lastmod = c.updated_at ? new Date(c.updated_at).toISOString().split("T")[0] : today;
      entries.push(`  <url>\n    <loc>${SITE_URL}/empresas/${encodeURIComponent(c.slug)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.send(xml);
  } catch (err) { next(err); }
});

export default router;
