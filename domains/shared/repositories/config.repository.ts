import { prisma } from "../../../lib/prisma";
import { redis, isRedisConfigured } from "../../../lib/redis";

export type ConfigKey = 
  | "yappy_handle" 
  | "yappy_qr_url" 
  | "bank_name" 
  | "bank_account_type" 
  | "bank_account_number" 
  | "bank_account_name"
  | "sender_email"
  | "demo_profile_shortcode";

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
      const config = await (prisma as any).systemConfig.findUnique({
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
    const configs = await (prisma as any).systemConfig.findMany();
    return configs.reduce((acc: Record<string, string>, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);
  }

  static async set(key: ConfigKey, value: string): Promise<void> {
    // 1. Update Database
    await (prisma as any).systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }

  static async setMany(configs: Record<string, string>): Promise<void> {
    await Promise.all(
      Object.entries(configs).map(([key, value]) => 
        this.set(key as ConfigKey, value)
      )
    );
  }
}
