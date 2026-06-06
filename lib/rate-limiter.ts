import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const isBuild = process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE === 'phase-production-build';

// Share a single Redis connection in development hot-reloads
const globalForRedisLimiter = global as unknown as { redisLimiter: Redis };

export const redisLimiter =
  globalForRedisLimiter.redisLimiter ||
  (isBuild ? ({} as any) : new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
  }));

if (process.env.NODE_ENV !== 'production' && !isBuild) {
  globalForRedisLimiter.redisLimiter = redisLimiter;
}

interface RateLimiterOptions {
  key: string;
  limit: number;      // Maximum requests allowed in the window
  windowMs: number;   // Window duration in milliseconds
}

/**
 * Redis Sorted Set (ZSET) based Sliding Window Rate Limiter.
 * Tracks requests with high resolution and automatically evicts expired entries.
 */
export async function rateLimitSlidingWindow({ key, limit, windowMs }: RateLimiterOptions): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}> {
  const now = Date.now();
  const clearBefore = now - windowMs;
  const lockKey = `ratelimit:${key}`;

  const transaction = redisLimiter.multi();

  // 1. Remove elements outside the current sliding window
  transaction.zremrangebyscore(lockKey, 0, clearBefore);
  
  // 2. Count remaining requests within this sliding window
  transaction.zcard(lockKey);
  
  // 3. Add the current timestamp (using random suffix to avoid unique member collision)
  transaction.zadd(lockKey, now, `${now}-${Math.random()}`);
  
  // 4. Set expiration on key to clean up memory automatically
  transaction.pexpire(lockKey, windowMs);

  const results = await transaction.exec();
  
  if (!results) {
    throw new Error('Redis transaction execution returned null');
  }

  // ZCARD is the second command executed (index 1), structure is [err, result]
  const currentRequestsCount = results[1][1] as number;

  const success = currentRequestsCount < limit;
  const remaining = Math.max(0, limit - currentRequestsCount);
  const resetMs = now + windowMs;

  return {
    success,
    limit,
    remaining,
    resetMs,
  };
}
