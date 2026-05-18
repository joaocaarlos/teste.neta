import fs from "fs";
import path from "path";
import { pool } from "../db";
import { logger } from "./logger";

const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function runMigrations(): Promise<void> {
  if (process.env.RUN_MIGRATIONS === "false") return;

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.warn({ dir: MIGRATIONS_DIR }, "[migrations] directory not found; skipping");
    return;
  }

  await ensureMigrationsTable();

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith(".sql")).sort();
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
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
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

/**
 * Roll back the last N applied migrations using the corresponding .down.sql files.
 * A rollback file for `001_init.sql` is expected at `migrations/001_init.down.sql`.
 */
export async function rollbackMigrations(steps = 1): Promise<void> {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.warn({ dir: MIGRATIONS_DIR }, "[migrations] directory not found; skipping rollback");
    return;
  }

  await ensureMigrationsTable();

  const { rows } = await pool.query<{ id: string }>(
    "SELECT id FROM schema_migrations ORDER BY applied_at DESC LIMIT $1",
    [steps]
  );

  for (const { id } of rows) {
    const downFile = path.join(MIGRATIONS_DIR, `${id}.down.sql`);
    if (!fs.existsSync(downFile)) {
      logger.warn({ id }, "[migrations] no .down.sql found; skipping rollback for this migration");
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const sql = fs.readFileSync(downFile, "utf8");
      await client.query(sql);
      await client.query("DELETE FROM schema_migrations WHERE id = $1", [id]);
      await client.query("COMMIT");
      logger.info({ id }, "[migrations] rolled back");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      logger.error({ err, id }, "[migrations] rollback failed");
      throw err;
    } finally {
      client.release();
    }
  }
}
