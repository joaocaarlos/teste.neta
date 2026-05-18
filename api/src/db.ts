import { Pool, PoolClient, QueryResultRow } from "pg";
import { logger } from "./lib/logger";

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "capacity",
  password: process.env.DB_PASS || "capacity123",
  database: process.env.DB_NAME || "capacity",
  max: Number(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  logger.error({ err }, "Pool error");
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
) {
  const start = Date.now();
  const result = await pool.query<T>(sql, params);
  if (process.env.NODE_ENV !== "production") {
    logger.debug({ ms: Date.now() - start, sql: sql.slice(0, 120) }, "db query");
  }
  return result;
}

export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
