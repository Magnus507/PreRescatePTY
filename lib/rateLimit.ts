import { Redis } from "@upstash/redis";

const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const PRODUCTION_BACKEND_WARNING = "Distributed rate limit backend unavailable.";

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
  backend: "redis" | "memory" | "unavailable";
};

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  productionFailureMode?: "deny" | "memory";
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
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const key = `${namespace}:${identifier}`;
  const now = Date.now();
  const { limit, windowMs } = options;
  const isProduction = process.env.VERCEL_ENV
    ? process.env.VERCEL_ENV === "production"
    : process.env.NODE_ENV === "production";
  const productionFailureMode = options.productionFailureMode ?? "deny";

  if (isProduction && !redis) {
    console.error(PRODUCTION_BACKEND_WARNING);
    if (productionFailureMode === "deny") {
      return { allowed: false, remaining: 0, resetAt: now + windowMs, backend: "unavailable" };
    }
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
        backend: "redis",
      };
    } catch {
      console.error(PRODUCTION_BACKEND_WARNING);
      if (isProduction && productionFailureMode === "deny") {
        return { allowed: false, remaining: 0, resetAt: now + windowMs, backend: "unavailable" };
      }
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
    backend: "memory",
  };
}
