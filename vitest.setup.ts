import { inject } from "vitest";

declare module "vitest" {
  interface ProvidedContext {
    mongoUri: string;
  }
}

/**
 * Global test setup — runs before each test file (once per worker).
 * 1. Provide a safe environment before any app module is imported so that
 *    `config/keys`, `workflows/client`, `config/upstash` and friends don't
 *    throw or warn at module scope.
 * 2. Point DATABASE_URL at the in-memory MongoDB shared by globalSetup.
 */
process.env.NODE_ENV = "test";

// Required by `app/.server/config/keys` (warns otherwise) and any module that
// touches Upstash/QStash/Cloudinary/Better-Auth at import time.
process.env.BETTER_AUTH_SECRET = "test-better-auth-secret";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.CLIENT_URL = "http://localhost:3000";
process.env.QSTASH_TOKEN = "test-qstash-token";
process.env.QSTASH_URL = "https://qstash.test";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
process.env.CLOUDINARY_CLOUD_NAME = "test";
process.env.CLOUDINARY_API_KEY = "test";
process.env.CLOUDINARY_SECRET_KEY = "test";
process.env.CLOUDINARY_UPLOAD_PRESET = "test";
process.env.PAYSTACK_SECRET_KEY = "sk_test_dummy";
process.env.OPENCODE_ZEN_API_KEY = "test-zen-key";
process.env.EMAIL_HOST = "localhost";
process.env.EMAIL_PORT = "2525";
process.env.EMAIL_USER = "test";
process.env.EMAIL_PASSWORD = "test";
process.env.BREVO_API_KEY = "test-brevo";

// Unique per-worker database name keeps parallel test files isolated even
// though they share the same mongod process. DATABASE_NAME is mirrored so
// `connectToDB` (which passes dbName: env.databaseName) lands in the same DB.
const workerId = process.env.VITEST_WORKER_ID ?? String(process.pid);
process.env.TEST_DB_NAME = `bc007_test_${workerId}_${Math.random()
  .toString(36)
  .slice(2, 8)}`;
process.env.DATABASE_NAME = process.env.TEST_DB_NAME;

const mongoUri = inject("mongoUri");
if (mongoUri) {
  process.env.DATABASE_URL = mongoUri;
}
