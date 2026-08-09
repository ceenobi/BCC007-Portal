import mongoose from "mongoose";
import logger from "../config/logger";
import { env } from "../config/keys";
import { testRedisConnection } from "../config/redis";
import type { HealthStatus } from "~/types";

const DB_STATE_LABELS: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

/**
 * Collects the current health snapshot of the server: MongoDB connection
 * state, a live Redis ping (bounded by a 3s timeout), and process memory.
 * Used by both the `/api/health` endpoint and the public health page.
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? "ok" : "down";

  let redisStatus: HealthStatus["checks"]["redis"]["status"] = "down";
  let redisPing: string | null = null;
  try {
    const pingResult = await Promise.race([
      testRedisConnection(),
      new Promise<false>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000),
      ),
    ]);
    if (pingResult) {
      redisStatus = "ok";
      redisPing = "PONG";
    }
  } catch (error) {
    logger.error(error, "Health check Redis ping failed");
  }

  const overall: HealthStatus["status"] =
    dbStatus === "ok" && redisStatus === "ok"
      ? "ok"
      : dbStatus === "down" && redisStatus === "down"
        ? "down"
        : "degraded";

  const mem = process.memoryUsage();

  return {
    status: overall,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: env.nodeEnv,
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    },
    checks: {
      database: {
        status: dbStatus,
        state: DB_STATE_LABELS[dbState] ?? "unknown",
      },
      redis: { status: redisStatus, ping: redisPing },
    },
  };
}
