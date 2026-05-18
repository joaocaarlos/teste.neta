import fs from "fs";
import path from "path";
import { pool } from "../db";
import { logger } from "./logger";

export async function runMigrations(): Promise<void> {
  if (process.env.RUN_MIGRATIONS === "false") return;

  const dir = path.join(process.cwd(), "migrations");
  if (!fs.existsSync(dir)) {
    logger.warn({ dir }, "[migrations] directory not found; skipping");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();
  for (const file of files) {
    const id = file.replace(/\.sql$/i, "");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query("SELECT 1 FROM schema_migrations WHERE id = $1", [id]);
      if ((existing.rowCount || 0) > 0) {
        await client.query("ROLLBACK");
        continue;
      }
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [id]);
      await client.query("COMMIT");
      logger.info({ id }, "[migrations] applied");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      logger.error({ err, id }, "[migrations] failed");
      throw err;
    } finally {
      client.release();
    }
  }
}
