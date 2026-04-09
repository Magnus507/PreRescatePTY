/**
 * In-memory rate limiter — works per server instance.
 * For multi-instance deployments, replace with Upstash Redis rate limiting.
 *
 * Usage:
 *   const result = rateLimit("scan", ip, { limit: 5, windowMs: 60_000 });
 *   if (!result.allowed) return 429;
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Clean up stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store) {
    if (win.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export function rateLimit(
  namespace: string,
  identifier: string,
  options: { limit: number; windowMs: number }
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = `${namespace}:${identifier}`;
  const now = Date.now();
  const { limit, windowMs } = options;

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
