interface EnvSpec {
  key: string;
  required?: boolean;
}
const ENV_VARS: EnvSpec[] = [
  { key: "NODE_ENV" },
  { key: "EMAIL_HOST" },
  { key: "EMAIL_PORT" },
  { key: "EMAIL_USER" },
  { key: "EMAIL_PASSWORD" },
  { key: "BETTER_AUTH_URL" },
  { key: "BETTER_AUTH_SECRET" },
  { key: "DATABASE_URL" },
  { key: "DATABASE_NAME" },
  { key: "CLIENT_URL" },
  { key: "CLOUDINARY_CLOUD_NAME" },
  { key: "CLOUDINARY_API_KEY" },
  { key: "CLOUDINARY_SECRET_KEY" },
  { key: "CLOUDINARY_UPLOAD_PRESET" },
  { key: "UPSTASH_REDIS_REST_URL" },
  { key: "UPSTASH_REDIS_REST_TOKEN" },
  { key: "QSTASH_TOKEN" },
  { key: "QSTASH_URL" },
  { key: "BREVO_API_KEY", required: false },
  { key: "GOOGLE_SERVICE_ACCOUNT_KEY", required: false },
  { key: "OPENCODE_ZEN_API_KEY" },
  { key: "AI_API_KEY", required: false },
  { key: "AI_BASE_URL", required: false },
  { key: "AI_MODEL", required: false },
  { key: "SENTRY_DSN", required: false },
  { key: "SENTRY_AUTH_TOKEN", required: false },
  { key: "SENTRY_ORG", required: false },
  { key: "SENTRY_PROJECT", required: false },
  { key: "PAYSTACK_SECRET_KEY", required: true },
];

function getEnvVar(): Record<string, string> {
  const missing: string[] = [];
  const result: Record<string, string> = {};

  ENV_VARS.forEach(({ key, required = true }) => {
    let value = process.env[key];
    const isBuild =
      process.env.npm_lifecycle_event === "build" ||
      process.env.PRERENDER === "true";

    if (!value && isBuild && required) {
      // Provide dummy values during build to prevent initialization failures
      if (key === "BETTER_AUTH_SECRET") value = "dummy-secret-for-build-only";
      if (key === "BETTER_AUTH_URL") value = "http://localhost:3000";
      if (key === "DATABASE_URL") value = "mongodb://localhost:27017/dummy";
      if (key === "CLIENT_URL") value = "http://localhost:3000";

      if (value) {
        process.env[key] = value;
      }
    }

    if (!value) {
      if (required) missing.push(key);
    } else {
      result[key] = value;
    }
  });

  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(", ")}`;
    const isBuild =
      process.env.npm_lifecycle_event === "build" ||
      process.env.PRERENDER === "true";

    if (process.env.NODE_ENV === "production" && !isBuild) {
      throw new Error(message);
    } else {
      console.warn(`⚠️  ${message}`);
    }
  }

  return result;
}

interface Env {
  readonly nodeEnv: string;
  readonly emailHost: string;
  readonly emailPort: string;
  readonly emailUser: string;
  readonly emailPassword: string;
  readonly betterAuthUrl: string;
  readonly betterAuthSecret: string;
  readonly databaseUrl: string;
  readonly databaseName: string;
  readonly clientUrl: string;
  readonly cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    uploadPreset: string;
  };
  readonly upstash: {
    redisUrl: string;
    redisToken: string;
    qstashUrl: string;
    qstashToken: string;
  };
  readonly brevoApiKey: string;
  readonly openCodeZenApiKey: string;
  readonly aiApiKey: string;
  readonly aiBaseUrl: string;
  readonly aiModel: string;
  readonly sentryDsn: string;
  readonly sentryAuthToken: string;
  readonly sentryOrg: string;
  readonly sentryProject: string;
  readonly paystackSecretKey: string;
}

export const env: Env = {
  nodeEnv: getEnvVar()["NODE_ENV"] || "development",
  emailHost: getEnvVar()["EMAIL_HOST"],
  emailPort: getEnvVar()["EMAIL_PORT"],
  emailUser: getEnvVar()["EMAIL_USER"],
  emailPassword: getEnvVar()["EMAIL_PASSWORD"],
  betterAuthUrl: getEnvVar()["BETTER_AUTH_URL"],
  betterAuthSecret: getEnvVar()["BETTER_AUTH_SECRET"],
  databaseUrl: getEnvVar()["DATABASE_URL"],
  databaseName: getEnvVar()["DATABASE_NAME"],
  clientUrl: getEnvVar()["CLIENT_URL"],
  cloudinary: {
    apiSecret: getEnvVar()["CLOUDINARY_SECRET_KEY"],
    cloudName: getEnvVar()["CLOUDINARY_CLOUD_NAME"],
    apiKey: getEnvVar()["CLOUDINARY_API_KEY"],
    uploadPreset: getEnvVar()["CLOUDINARY_UPLOAD_PRESET"],
  },
  upstash: {
    redisUrl: getEnvVar()["UPSTASH_REDIS_REST_URL"],
    redisToken: getEnvVar()["UPSTASH_REDIS_REST_TOKEN"],
    qstashToken: getEnvVar()["QSTASH_TOKEN"],
    qstashUrl: getEnvVar()["QSTASH_URL"],
  },
  brevoApiKey: getEnvVar()["BREVO_API_KEY"],
  openCodeZenApiKey: getEnvVar()["OPENCODE_ZEN_API_KEY"],
  aiApiKey: getEnvVar()["AI_API_KEY"] || getEnvVar()["OPENCODE_ZEN_API_KEY"],
  aiBaseUrl: getEnvVar()["AI_BASE_URL"] || "https://opencode.ai/zen/v1",
  aiModel: getEnvVar()["AI_MODEL"] || "deepseek-v4-flash-free",
  sentryDsn: getEnvVar()["SENTRY_DSN"],
  sentryAuthToken: getEnvVar()["SENTRY_AUTH_TOKEN"],
  sentryOrg: getEnvVar()["SENTRY_ORG"],
  sentryProject: getEnvVar()["SENTRY_PROJECT"],
  paystackSecretKey: getEnvVar()["PAYSTACK_SECRET_KEY"],
};
