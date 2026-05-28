import { Redis } from "@upstash/redis";

const isProduction = process.env.NODE_ENV === "production";
const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const PRODUCTION_FAIL_CLOSED_MESSAGE =
  "Rate limit backend unavailable in production (Upstash missing or unreachable). Request blocked by policy.";

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

const AUTH_RATE_LIMIT_NAMESPACES = [
  "login",
  "register",
  "forgot-password",
  "reset-password",
] as const;

function isAuthRateLimitNamespace(namespace: string): boolean {
  return AUTH_RATE_LIMIT_NAMESPACES.some((base) => namespace === base || namespace.startsWith(`${base}:`));
}

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  errorCode?: "RATE_LIMIT_BACKEND_UNAVAILABLE";
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

  // Production hardening: never rely on per-instance memory limiter.
  // If Upstash is missing, fail closed and block the request.
  if (isProduction && !redis) {
    console.error(PRODUCTION_FAIL_CLOSED_MESSAGE);
    const authNamespace = isAuthRateLimitNamespace(namespace);
    return {
      allowed: false,
      remaining: 0,
      resetAt: now + windowMs,
      ...(authNamespace ? { errorCode: "RATE_LIMIT_BACKEND_UNAVAILABLE" as const } : {}),
    };
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
      if (isProduction) {
        console.error(PRODUCTION_FAIL_CLOSED_MESSAGE);
        const authNamespace = isAuthRateLimitNamespace(namespace);
        return {
          allowed: false,
          remaining: 0,
          resetAt: now + windowMs,
          ...(authNamespace ? { errorCode: "RATE_LIMIT_BACKEND_UNAVAILABLE" as const } : {}),
        };
      }
      // In non-production, fall through to in-memory store for local/dev resilience.
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
