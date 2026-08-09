import OpenAI from "openai";
import { env } from "../config/keys";
import logger from "../config/logger";

const DEFAULT_MODEL = "deepseek-v4-flash-free";
const DEFAULT_BASE_URL = "https://opencode.ai/zen/v1";

let cachedClient: OpenAI | null = null;

/**
 * OpenAI-compatible client pointed at the configured Zen gateway. Falls back
 * to the existing OPENCODE_ZEN_API_KEY when no dedicated AI_API_KEY is set.
 */
export function getLlmClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const apiKey = env.aiApiKey || env.openCodeZenApiKey;
  if (!apiKey) {
    throw new Error(
      "Missing AI API key: set AI_API_KEY (or OPENCODE_ZEN_API_KEY) in .env",
    );
  }

  cachedClient = new OpenAI({
    apiKey,
    baseURL: env.aiBaseUrl || DEFAULT_BASE_URL,
    maxRetries: 2,
    timeout: 60_000,
  });
  return cachedClient;
}

export function getModelName(): string {
  return env.aiModel || DEFAULT_MODEL;
}

/** Guards against shipping a misleading model name if the base URL is swapped. */
export function getLlmConfig() {
  return {
    baseUrl: env.aiBaseUrl || DEFAULT_BASE_URL,
    model: getModelName(),
  };
}

export function logLlmStart(model: string, messageCount: number, toolCount: number) {
  logger.info({ model, messageCount, toolCount }, "AI assistant request started");
}
