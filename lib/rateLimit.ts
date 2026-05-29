import { Redis } from "@upstash/redis";

const isProduction = process.env.NODE_ENV === "production";
const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const PRODUCTION_FALLBACK_WARNING =
  "Rate limit backend unavailable. Falling back to in-memory store (single-instance only).";

let redis: Redis | null = null;
if (hasUpstashConfig) {
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

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

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
): Promise<RateLimitResult> {
  const key = `${namespace}:${identifier}`;
  const now = Date.now();
  const { limit, windowMs } = options;

  if (isProduction && !redis) {
    console.warn(PRODUCTION_FALLBACK_WARNING);
  }

  if (isProduction && !redis) {
    // Fall through to in-memory store
  }

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
      console.warn(PRODUCTION_FALLBACK_WARNING);
      // Fall through to in-memory store for resilience.
    }
  }

  // Fallback in-memory store (single-instance semantics).
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
