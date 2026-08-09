import { Client } from "@upstash/workflow";
import { env } from "../config/keys.js";

if (!env.upstash.qstashToken) {
  throw new Error("Upstash QStash token is required for workflows");
}

export const workflowClient = new Client({
  baseUrl: env.upstash.qstashUrl,
  token: env.upstash.qstashToken,
});