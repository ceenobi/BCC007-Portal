import { Redis } from "@upstash/redis";
import { env } from "./keys";
import logger from "./logger";

/**
 * Upstash Redis client instance
 * Uses REST API for serverless-friendly connections
 */
let redis: Redis | null = null;

/**
 * Initialize and return the Redis client
 * Singleton pattern to ensure only one instance exists
 */
export const getRedisClient = (): Redis | null => {
  // Return existing instance if already initialized
  if (redis) {
    return redis;
  }

  // Check if Redis credentials are configured
  if (!env.upstash.redisUrl || !env.upstash.redisToken) {
    logger.warn(
      "⚠️  Upstash Redis credentials not configured. Caching will be disabled.",
    );
    logger.warn(
      "   Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your .env file",
    );
    return null;
  }

  try {
    // Initialize Redis client with Upstash credentials
    redis = new Redis({
      url: env.upstash.redisUrl,
      token: env.upstash.redisToken,
    });

    logger.info("✅ Upstash Redis client initialized successfully");
    return redis;
  } catch (error) {
    logger.error(error, "❌ Failed to initialize Upstash Redis client:");
    return null;
  }
};

/**
 * Test Redis connection
 * Returns true if connection is successful, false otherwise
 */
export const testRedisConnection = async (): Promise<boolean> => {
  const client = getRedisClient();

  if (!client) {
    return false;
  }

  try {
    // Test connection with a simple ping
    const result = await client.ping();
    if (result === "PONG") {
      logger.info("✅ Redis connection test successful");
      return true;
    }
    return false;
  } catch (error) {
    logger.error(error, "❌ Redis connection test failed:");
    return false;
  }
};

// Export the Redis client getter as default
export default getRedisClient;
