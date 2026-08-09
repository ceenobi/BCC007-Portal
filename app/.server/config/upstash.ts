import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { env } from "./keys";

/**
 * Initialize Upstash Redis client
 */
export const redis = new Redis({
  url: env.upstash.redisUrl,
  token: env.upstash.redisToken,
});

/**
 * Factory to create a new ratelimiter instance
 * @param tokens Number of tokens allowed in the window
 * @param window Window duration (e.g., "60 s", "1 m")
 * @param prefix Redis key prefix
 */
export const createRatelimit = (
  tokens: number,
  window: string,
  prefix: string = "ratelimit"
) => {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window as any),
    analytics: true,
    prefix: `@bcc007/${prefix}`,
  });
};

// General API ratelimiter: 100 requests per 60 seconds
export const generalRatelimit = createRatelimit(100, "5 m", "general");

// Stricter ratelimiter for sensitive actions: 10 requests per 60 seconds
export const strictRatelimit = createRatelimit(10, "5 m", "strict");
