import IORedis from "ioredis";
import { Job, Queue, Worker } from "bullmq";
import { deliverEmail, SendOpts } from "./email";
import { logger } from "./logger";

let queue: Queue<SendOpts> | null = null;
let worker: Worker<SendOpts> | null = null;

function makeConnection(): IORedis {
  return new IORedis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASS || undefined,
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  });
}

function getQueue(): Queue<SendOpts> {
  if (queue) return queue;
  queue = new Queue<SendOpts>("capacity-email", {
    connection: makeConnection(),
    defaultJobOptions: {
      attempts: Number(process.env.EMAIL_QUEUE_ATTEMPTS) || 3,
      backoff: { type: "exponential", delay: Number(process.env.EMAIL_QUEUE_BACKOFF_MS) || 3000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });
  return queue;
}

export async function enqueueEmail(opts: SendOpts): Promise<void> {
  await getQueue().add("send", opts, {
    jobId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });
}

export function initEmailQueue(): void {
  if (process.env.EMAIL_QUEUE_ENABLED === "false" || worker) return;

  getQueue();
  worker = new Worker<SendOpts>(
    "capacity-email",
    async (job: Job<SendOpts>) => {
      await deliverEmail(job.data);
    },
    {
      connection: makeConnection(),
      concurrency: Number(process.env.EMAIL_QUEUE_CONCURRENCY) || 3,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, to: job.data.to }, "[email-queue] sent");
  });
  worker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id, to: job?.data.to }, "[email-queue] failed");
  });
  worker.on("error", (err) => {
    logger.warn({ err }, "[email-queue] worker error");
  });

  logger.info("[email-queue] worker started");
}
