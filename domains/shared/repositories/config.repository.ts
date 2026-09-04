import { prisma } from "../../../lib/prisma";
import { redis, isRedisConfigured } from "../../../lib/redis";

export const CONFIG_KEYS = [
  "yappy_handle",
  "yappy_qr_url",
  "bank_name",
  "bank_account_type",
  "bank_account_number",
  "bank_account_name",
  "sender_email",
  "demo_profile_shortcode",
] as const;

export type ConfigKey = typeof CONFIG_KEYS[number];

const CACHE_TTL = 300; // 5 minutes in SECONDS for Redis
const REDIS_PREFIX = "sys_cfg:";

export class ConfigRepository {
  /**
   * Get a config value with multi-level caching (Redis + In-memory)
   */
  static async get(key: ConfigKey, defaultValue: string = ""): Promise<string> {
    const redisKey = `${REDIS_PREFIX}${key}`;

    // 1. Try Redis for cross-instance caching
    if (redis && isRedisConfigured()) {
      try {
        const cached = await redis.get<string>(redisKey);
        if (cached) return cached;
      } catch (err) {
        console.error(`[ConfigRepository] Redis fetch error for ${key}:`, err);
      }
    }

    // 2. Database Fallback
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key }
      });
      const value = config?.value ?? defaultValue;
      
      // 3. Save to Redis for next time
      if (redis && isRedisConfigured() && value) {
        await redis.set(redisKey, value, { ex: CACHE_TTL });
      }
      
      return value;
    } catch (error) {
      console.error(`[ConfigRepository] DB Error for ${key}:`, error);
      return defaultValue;
    }
  }

  static async getAll(): Promise<Record<string, string>> {
    const configs = await prisma.systemConfig.findMany();
    return configs.reduce((acc: Record<string, string>, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);
  }

  static async set(key: ConfigKey, value: string): Promise<void> {
    // 1. Update Database
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }

  static async setMany(configs: Record<string, string>): Promise<void> {
    await prisma.$transaction(
      Object.entries(configs).map(([key, value]) =>
        prisma.systemConfig.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );
    await this.invalidateMany(Object.keys(configs) as ConfigKey[]);
  }

  static async invalidateMany(keys: ConfigKey[]): Promise<void> {
    if (!redis || !isRedisConfigured() || keys.length === 0) return;
    try {
      await redis.del(...keys.map((key) => `${REDIS_PREFIX}${key}`));
    } catch (error) {
      console.error("[ConfigRepository] Redis invalidation error:", error);
    }
  }
}
