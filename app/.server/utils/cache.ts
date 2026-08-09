import logger from "../config/logger";
import getRedisClient from "../config/redis";

/**
 * Wraps a data fetching function with Redis caching.
 * 
 * @param key Unique key for the cache entry
 * @param ttl Time to live in seconds (default: 300 = 5 minutes)
 * @param fetcher Async function that fetches the data if not in cache
 * @returns The cached or freshly fetched data
 */
export async function fetchWithCache<T>(
  key: string,
  ttl: number = 300,
  fetcher: () => Promise<T>
): Promise<T> {
  const redis = getRedisClient();

  if (!redis) {
    return await fetcher();
  }

  try {
    const cachedData = await redis.get(key);

    if (cachedData) {
      logger.debug(`✅ Cache HIT: ${key}`);
      return (typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData) as T;
    }

    logger.debug(`❌ Cache MISS: ${key}`);
    const freshData = await fetcher();

    // Store in Redis with expiration
    await redis.setex(key, ttl, JSON.stringify(freshData));
    logger.debug(`💾 Cached data for key: ${key} (TTL: ${ttl}s)`);

    return freshData;
  } catch (error) {
    logger.error(error, `Cache error for key ${key}:`);
    // Fail open: return fresh data if Redis fails
    return await fetcher();
  }
}

/**
 * Deletes keys matching a pattern (e.g., "products:*")
 */
export async function invalidateCache(pattern: string): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 0;

  try {
    if (!pattern.includes("*")) {
      await redis.del(pattern);
      return 1;
    }

    let cursor = "0";
    let deletedCount = 0;

    do {
      const [newCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
      if (keys.length > 0) {
        await redis.del(...keys);
        deletedCount += keys.length;
      }
      cursor = newCursor;
    } while (cursor !== "0");

    logger.info(`🗑️ Invalidated ${deletedCount} cache keys matching: ${pattern}`);
    return deletedCount;
  } catch (error) {
    logger.error(error, `Failed to invalidate cache pattern ${pattern}:`);
    return 0;
  }
}


