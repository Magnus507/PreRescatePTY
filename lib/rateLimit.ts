/**
 * In-memory rate limiter — works per server instance.
 * For multi-instance deployments, replace with Upstash Redis rate limiting.
 *
 * Usage:
 *   const result = rateLimit("scan", ip, { limit: 5, windowMs: 60_000 });
 *   if (!result.allowed) return 429;
 */

import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

interface Window {
  count: number;
  resetAt: number;
}
const store = new Map<string, Window>();

setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store) {
    if (win.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export async function rateLimit(
  namespace: string,
  identifier: string,
  options: { limit: number; windowMs: number }
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `${namespace}:${identifier}`;
  const now = Date.now();
  const { limit, windowMs } = options;

  if (redis) {
    try {
      const windowId = Math.floor(now / windowMs);
      const redisKey = `${key}:${windowId}`;
      const current = await redis.incr(redisKey);
      if (current === 1) {
        await redis.pexpire(redisKey, windowMs);
      }
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetAt: now + windowMs,
      };
    } catch (e) {
      console.error("Upstash Redis error:", e);
      // Fallback to memory if Redis fails
    }
  }

  // Memory fallback
  let win = store.get(key);
  if (!win || win.resetAt < now) {
    win = { count: 0, resetAt: now + windowMs };
    store.set(key, win);
  }
  win.count++;

  return {
    allowed: win.count <= limit,
    remaining: Math.max(0, limit - win.count),
    resetAt: win.resetAt,
  };
}
