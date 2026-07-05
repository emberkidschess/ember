import { getRedisClient, isRedisAvailable } from '../config/redis';
import logger from './logger';

const DEFAULT_TTL = 300; // 5 minutes in seconds

/**
 * Cache service wrapper for Redis
 */
export class CacheService {
  /**
   * Get a value from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      if (!isRedisAvailable()) {
        return null;
      }

      const client = getRedisClient();
      if (!client) return null;

      const value = await client.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   */
  static async set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
      if (!isRedisAvailable()) {
        return;
      }

      const client = getRedisClient();
      if (!client) return;

      await client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete a value from cache
   */
  static async delete(key: string): Promise<void> {
    try {
      if (!isRedisAvailable()) {
        return;
      }

      const client = getRedisClient();
      if (!client) return;

      await client.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  static async deletePattern(pattern: string): Promise<void> {
    try {
      if (!isRedisAvailable()) {
        return;
      }

      const client = getRedisClient();
      if (!client) return;

      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  static async flush(): Promise<void> {
    try {
      if (!isRedisAvailable()) {
        return;
      }

      const client = getRedisClient();
      if (!client) return;

      await client.flushDb();
      logger.info('Cache flushed');
    } catch (error) {
      logger.error('Cache flush error:', error);
    }
  }

  /**
   * Get or set pattern - fetch from cache if exists, otherwise compute and cache
   */
  static async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = DEFAULT_TTL
  ): Promise<T> {
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      const value = await factory();
      await this.set(key, value, ttl);
      return value;
    } catch (error) {
      logger.error(`Cache getOrSet error for key ${key}:`, error);
      // Fallback to factory if cache fails
      return factory();
    }
  }
}

/**
 * Generate cache key with namespace
 */
export function generateCacheKey(namespace: string, identifier: string): string {
  return `${namespace}:${identifier}`;
}

/**
 * Common cache namespaces
 */
export const CacheNamespaces = {
  DASHBOARD_STATS: 'dashboard_stats',
  STUDENT_LIST: 'student_list',
  LEAD_LIST: 'lead_list',
  BATCH_LIST: 'batch_list',
  CLASS_LIST: 'class_list',
  STAFF_LIST: 'staff_list',
  PACKAGE_LIST: 'package_list',
  STUDENT_DETAILS: 'student_details',
  BATCH_DETAILS: 'batch_details',
  CLASS_DETAILS: 'class_details',
} as const;
