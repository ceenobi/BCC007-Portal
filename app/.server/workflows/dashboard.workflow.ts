import { WorkflowContext } from "@upstash/workflow";
import logger from "../config/logger.js";
import getRedisClient from "../config/redis.js";
import { invalidateCache } from "../utils/cache.js";

const LAST_REFRESH_KEY = "dashboard:last-refreshed";
const LAST_REFRESH_TTL = 60 * 60 * 24 * 7;

/**
 * Org-wide cache keys that feed the dashboard. Per-user keys (payments:user:*,
 * transfers:user:*, audit-logs:<userId>:*, etc.) are intentionally left alone —
 * they refresh naturally on that member's own load. Balance is already on a 60s
 * TTL so it is skipped here.
 */
const DASHBOARD_CACHE_PATTERNS = [
  "events:upcoming",
  "payments:group:reports:*",
  "transfers:group:reports:*",
  "audit-logs:all:*",
  "tickets:*",
] as const;

type DashboardRefreshResult = {
  patternsInvalidated: Array<{ pattern: string; deleted: number }>;
  totalDeleted: number;
  lastRefreshed: string;
};

/**
 * Scheduled sweep that keeps the dashboard data fresh by evicting the shared
 * cache entries that power it (group payment/transfer reports, upcoming events,
 * org tickets and org-wide audit logs). Because those entries are re-populated
 * on the next load with their long (1h) TTL, a recurring run on a shorter
 * cadence stops the dashboard from showing stale numbers between runs.
 */
export const runDashboardRefreshWorkflow = async (
  context: WorkflowContext,
): Promise<DashboardRefreshResult> => {
  const result = await context.run("refresh-dashboard-cache", async () => {
    const patternsInvalidated: Array<{
      pattern: string;
      deleted: number;
    }> = [];

    for (const pattern of DASHBOARD_CACHE_PATTERNS) {
      const deleted = await invalidateCache(pattern);
      patternsInvalidated.push({ pattern, deleted });
    }

    const now = new Date();
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.setex(
          LAST_REFRESH_KEY,
          LAST_REFRESH_TTL,
          now.toISOString(),
        );
      } catch (error) {
        logger.error(
          error,
          "Dashboard refresh: failed to record last-refreshed marker",
        );
      }
    }

    const summary: DashboardRefreshResult = {
      patternsInvalidated,
      totalDeleted: patternsInvalidated.reduce(
        (sum, entry) => sum + entry.deleted,
        0,
      ),
      lastRefreshed: now.toISOString(),
    };
    logger.info({ ...summary, message: "Dashboard cache refresh complete" });
    return summary;
  });

  return result;
};
