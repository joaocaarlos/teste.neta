import Redis from "ioredis";
import { logger } from "./logger";

export const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASS || undefined,
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
});

redis.on("error", (err) => {
  logger.warn({ err }, "[redis] connection error");
});

export async function pingRedis(): Promise<string> {
  if (redis.status === "wait" || redis.status === "end") {
    await redis.connect();
  }
  return redis.ping();
}
