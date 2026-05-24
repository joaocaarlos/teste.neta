import { query } from "../db";
import { newOrderId } from "../lib/idgen";
import { cleanupExpiredTokens } from "../lib/tokens";
import { logger } from "../lib/logger";

interface CronJob {
  name: string;
  intervalMs: number;
  fn: () => Promise<void>;
  lastRun?: Date;
  lastError?: string;
}

const jobs: CronJob[] = [];

export function registerCron(name: string, intervalMs: number, fn: () => Promise<void>): void {
  jobs.push({ name, intervalMs, fn });
}

registerCron("expire-demands", 60 * 60 * 1000, async () => {
  const today = new Date();
  const { rows } = await query<{ id: string; deadline: string }>(
    `SELECT id, deadline FROM demands
     WHERE status IN ('Publicado','Em cotação')
       AND deadline IS NOT NULL`
  );
  let cancelled = 0;
  for (const d of rows) {
    const m = d.deadline?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) continue;
    const dl = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (dl < today) {
      await query("UPDATE demands SET status = 'Cancelado' WHERE id = $1", [d.id]);
      await query(
        `INSERT INTO audit_logs (evento,usuario,empresa,ip,data,tipo,ref)
         VALUES ('Demanda expirada (auto)','Sistema','-','-',$1,'demanda',$2)`,
        [new Date().toLocaleString("pt-BR"), d.id]
      );
      cancelled++;
    }
  }
  if (cancelled > 0) logger.info({ cancelled }, "[cron] expired demands");
});

registerCron("expire-ndas", 60 * 60 * 1000, async () => {
  const { rowCount } = await query(
    `UPDATE ndas SET status = 'Expirado'
     WHERE status = 'Ativo' AND expires_at IS NOT NULL AND expires_at < CURRENT_DATE`
  );
  if (rowCount && rowCount > 0) logger.info({ expired: rowCount }, "[cron] expired ndas");
});

registerCron("recurring-monthly-orders", 24 * 60 * 60 * 1000, async () => {
  const today = new Date();
  if (today.getDate() !== 1) return;
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const { rows } = await query<{
    id: string;
    demandante: string;
    processo: string;
    volume: string | null;
    valor: string | null;
  }>(
    `SELECT id, demandante, processo, volume, valor
     FROM recurring_contracts
     WHERE status = 'Ativo' AND tipo = 'Mensal fixo'`
  );

  let created = 0;
  for (const rc of rows) {
    const ref = `${rc.id}:${monthKey}`;
    const exists = await query("SELECT id FROM audit_logs WHERE tipo = 'contrato_recorrente' AND ref = $1 LIMIT 1", [ref]);
    if (exists.rowCount) continue;

    const orderId = await newOrderId();
    await query(
      `INSERT INTO orders (id, client, product, value, value_raw, status, pct, deadline)
       VALUES ($1,$2,$3,$4,$5,'Contratado',0,$6)`,
      [
        orderId,
        rc.demandante,
        `${rc.processo}${rc.volume ? ` - ${rc.volume}` : ""}`,
        rc.valor || null,
        parseMoney(rc.valor),
        lastDayOfCurrentMonth(today).toLocaleDateString("pt-BR"),
      ]
    );
    await query(
      `INSERT INTO audit_logs (evento,usuario,empresa,ip,data,tipo,ref)
       VALUES ('Pedido recorrente gerado','Sistema','-','-', $1,'contrato_recorrente',$2)`,
      [new Date().toLocaleString("pt-BR"), ref]
    );
    created++;
  }
  if (created > 0) logger.info({ created }, "[cron] recurring orders generated");
});

registerCron("audit-retention", 24 * 60 * 60 * 1000, async () => {
  const { rowCount } = await query(
    `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '180 days'`
  );
  if (rowCount && rowCount > 0) logger.info({ purged: rowCount }, "[cron] purged audit logs");
});

registerCron("notif-auto-read", 24 * 60 * 60 * 1000, async () => {
  const { rowCount } = await query(
    `UPDATE notifications SET lida = TRUE
     WHERE lida = FALSE AND created_at < NOW() - INTERVAL '30 days'`
  );
  if (rowCount && rowCount > 0) logger.info({ read: rowCount }, "[cron] auto-read notifications");
});

registerCron("auth-token-cleanup", 24 * 60 * 60 * 1000, async () => {
  const removed = await cleanupExpiredTokens();
  if (removed > 0) logger.info({ removed }, "[cron] cleaned auth tokens");
});

function parseMoney(value: string | null): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function lastDayOfCurrentMonth(today: Date): Date {
  return new Date(today.getFullYear(), today.getMonth() + 1, 0);
}

export function startCron(): void {
  for (const job of jobs) {
    const run = async () => {
      try {
        await job.fn();
        job.lastRun = new Date();
        job.lastError = undefined;
      } catch (err) {
        job.lastError = (err as Error).message;
        logger.error({ err, job: job.name }, "[cron] job failed");
      }
    };

    setTimeout(run, 30_000);
    setInterval(run, job.intervalMs);
  }
  logger.info({ jobs: jobs.length }, "[cron] jobs registered");
}
