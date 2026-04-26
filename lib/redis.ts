import { Redis } from "@upstash/redis";

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  // If not configured, we will log a warning but only once
  if (process.env.NODE_ENV === "production") {
    console.warn("[Redis] Redis environment variables missing. Caching will be disabled.");
  }
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

/**
 * Utility to safe-check if Redis is available and configured
 */
export const isRedisConfigured = () => 
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
