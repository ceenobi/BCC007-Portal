import { generalRatelimit, strictRatelimit } from "../config/upstash";
import logger from "../config/logger";

/**
 * Checks the rate limit for a given request.
 * If the limit is exceeded, it throws a Response with status 429.
 * This is designed to be called at the beginning of an action or loader.
 *
 * @param request The Web Standard Request object from the loader/action
 * @param type The type of limiter to use ('general' or 'strict')
 */
export async function checkRateLimit(
  request: Request,
  type: "general" | "strict" = "general",
) {
  const limiter = type === "strict" ? strictRatelimit : generalRatelimit;

  // Extract IP address from common proxy headers, fall back to loopback in dev
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1";

  const identifier = ip;

  try {
    const { success, limit, remaining, reset, pending } =
      await limiter.limit(identifier);

    // Await analytics sync
    await pending;

    if (!success) {
      logger.warn(
        `Rate limit exceeded for identifier: ${identifier} on ${request.url}`,
      );

      const retryAfter = Math.ceil((reset - Date.now()) / 1000);

      // We throw a Response so React Router handles the error and renders the ErrorBoundary
      throw new Response(
        JSON.stringify({
          success: false,
          message: "Too many requests. Please try again later.",
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": retryAfter.toString(),
          },
        },
      );
    }

    return { limit, remaining, reset };
  } catch (error) {
    if (error instanceof Response) throw error;

    logger.error(error, "Rate limiting error:");
    // Fail open: let the request through if the rate limit service fails
    return null;
  }
}
