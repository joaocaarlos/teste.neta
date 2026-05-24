// Entry point: re-exports app for tests, delegates startup to server.ts
export { app as default, app, readinessChecks } from "./app";

import "dotenv/config";
import { app } from "./app";
import { startCron } from "./cron";
import { logger } from "./lib/logger";
import { initEmailQueue } from "./lib/email-queue";
import { runMigrations } from "./lib/migrations";
import { assertProductionConfig } from "./lib/config";

const PORT = Number(process.env.PORT) || 3001;

async function start(): Promise<void> {
  assertProductionConfig();
  await runMigrations();
  initEmailQueue();

  app.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || "development" }, "CapaCity API started");
    startCron();
  });
}

if (process.env.NODE_ENV !== "test") {
  void start().catch((err) => {
    logger.fatal({ err }, "CapaCity API failed to start");
    process.exit(1);
  });
}
