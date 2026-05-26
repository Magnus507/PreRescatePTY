import { Redis } from "@upstash/redis";

const isProduction = process.env.NODE_ENV === "production";
const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

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
  if (isProduction && !redis) {
    throw new Error(
      "Rate limit misconfigured: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production."
    );
  }

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
      if (isProduction) {
        throw new Error("Rate limit unavailable: Upstash Redis request failed.");
      }
    }
  }

  // Development/test only fallback. In production, per-instance memory limits
  // are unsafe because serverless instances do not share state.
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
