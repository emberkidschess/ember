import { createClient, RedisClientType } from 'redis';
import logger from '../utils/logger';

let redisClient: RedisClientType | null = null;

/**
 * Initialize Redis client
 */
export async function initializeRedis(): Promise<void> {
  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL not set. Caching is disabled.');
    return;
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.error('Redis reconnection failed after 3 retries. Continuing without caching.');
            return false; // Stop reconnection attempts
          }
          return Math.min(retries * 100, 1000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    redisClient.on('disconnect', () => {
      logger.warn('Redis Client Disconnected');
    });

    await redisClient.connect();
    logger.info('Redis initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    redisClient = null;
    // Don't throw error - allow app to run without Redis in development
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    logger.warn('Continuing without Redis caching. Performance may be affected.');
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): RedisClientType | null {
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redisClient !== null && redisClient.isOpen;
}
