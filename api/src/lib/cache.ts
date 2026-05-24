import { redis } from "./redis";
import { logger } from "./logger";

export interface CacheOptions {
  ttlSeconds?: number;
  namespace?: string;
}

const DEFAULT_TTL = 300;
const DEFAULT_NAMESPACE = "cache";

function getCacheKey(key: string, namespace: string = DEFAULT_NAMESPACE): string {
  return `${namespace}:${key}`;
}

export async function getCache<T>(
  key: string,
  options?: CacheOptions
): Promise<T | null> {
  try {
    const cacheKey = getCacheKey(key, options?.namespace);
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug({ key: cacheKey }, "[cache] hit");
      return JSON.parse(cached) as T;
    }
    logger.debug({ key: cacheKey }, "[cache] miss");
    return null;
  } catch (err) {
    logger.warn({ err, key }, "[cache] get error");
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  options?: CacheOptions
): Promise<void> {
  try {
    const cacheKey = getCacheKey(key, options?.namespace);
    const ttl = options?.ttlSeconds || DEFAULT_TTL;
    await redis.setex(cacheKey, ttl, JSON.stringify(value));
    logger.debug({ key: cacheKey, ttl }, "[cache] set");
  } catch (err) {
    logger.warn({ err, key }, "[cache] set error");
  }
}

export async function deleteCache(
  key: string,
  options?: CacheOptions
): Promise<void> {
  try {
    const cacheKey = getCacheKey(key, options?.namespace);
    await redis.del(cacheKey);
    logger.debug({ key: cacheKey }, "[cache] delete");
  } catch (err) {
    logger.warn({ err, key }, "[cache] delete error");
  }
}

export async function invalidateCachePattern(
  pattern: string,
  options?: CacheOptions
): Promise<number> {
  try {
    const fullPattern = getCacheKey(pattern, options?.namespace);
    const keys = await redis.keys(fullPattern);
    if (keys.length === 0) return 0;
    await redis.del(...keys);
    logger.debug({ pattern: fullPattern, count: keys.length }, "[cache] invalidate pattern");
    return keys.length;
  } catch (err) {
    logger.warn({ err, pattern }, "[cache] invalidate pattern error");
    return 0;
  }
}

export async function getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  const cached = await getCache<T>(key, options);
  if (cached !== null) return cached;
  const fresh = await fetcher();
  await setCache(key, fresh, options);
  return fresh;
}

export const cacheNamespaces = {
  COMPANY: "company",
  USER: "user",
  DEMAND: "demand",
  PROPOSAL: "proposal",
  ORDER: "order",
  TRANSACTION: "transaction",
} as const;

export const entityCache = {
  company: {
    getKey: (id: string) => `${id}`,
    getTTL: () => 600,
    get: (id: string) => getCache(`${id}`, { namespace: cacheNamespaces.COMPANY, ttlSeconds: 600 }),
    set: (id: string, data: any) => setCache(`${id}`, data, { namespace: cacheNamespaces.COMPANY, ttlSeconds: 600 }),
    invalidate: (id: string) => deleteCache(`${id}`, { namespace: cacheNamespaces.COMPANY }),
    invalidateAll: () => invalidateCachePattern("*", { namespace: cacheNamespaces.COMPANY }),
  },
  demand: {
    getKey: (id: string) => `${id}`,
    getTTL: () => 300,
    get: (id: string) => getCache(`${id}`, { namespace: cacheNamespaces.DEMAND, ttlSeconds: 300 }),
    set: (id: string, data: any) => setCache(`${id}`, data, { namespace: cacheNamespaces.DEMAND, ttlSeconds: 300 }),
    invalidate: (id: string) => deleteCache(`${id}`, { namespace: cacheNamespaces.DEMAND }),
  },
  proposal: {
    getKey: (id: string) => `${id}`,
    getTTL: () => 300,
    get: (id: string) => getCache(`${id}`, { namespace: cacheNamespaces.PROPOSAL, ttlSeconds: 300 }),
    set: (id: string, data: any) => setCache(`${id}`, data, { namespace: cacheNamespaces.PROPOSAL, ttlSeconds: 300 }),
    invalidate: (id: string) => deleteCache(`${id}`, { namespace: cacheNamespaces.PROPOSAL }),
  },
};
