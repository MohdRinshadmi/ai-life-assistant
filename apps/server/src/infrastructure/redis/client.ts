import Redis from 'ioredis';
import { config, logger } from '@config';

/**
 * Redis Client
 *
 * Used for:
 * - Session/token caching (faster than DB lookups)
 * - Rate limiting (atomic counters with TTL)
 * - Pub/Sub for WebSocket scaling (multiple server instances)
 * - Temporary data (OTP codes, password reset tokens)
 *
 * Why ioredis over node-redis?
 * - Better TypeScript support
 * - Built-in cluster support
 * - Automatic reconnection with backoff
 * - Lua scripting support
 * - Pipeline/transaction support
 */
const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    // Exponential backoff with max 30s delay
    const delay = Math.min(times * 500, 30_000);
    logger.warn({ msg: `Redis reconnecting... attempt ${times}`, delay });
    return delay;
  },
  // Don't throw on connection errors (return null instead)
  enableOfflineQueue: true,
});

redis.on('connect', () => {
  logger.info({ msg: 'Redis connected' });
});

redis.on('error', (err) => {
  logger.error({ msg: 'Redis error', error: err.message });
});

redis.on('close', () => {
  logger.warn({ msg: 'Redis connection closed' });
});

/**
 * Health check for Redis
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error({ msg: 'Redis health check failed', error });
    return false;
  }
}

/**
 * Graceful shutdown
 */
export async function closeRedis(): Promise<void> {
  logger.info({ msg: 'Closing Redis connection...' });
  await redis.quit();
  logger.info({ msg: 'Redis connection closed' });
}

export { redis };
