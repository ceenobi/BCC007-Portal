import mongoose from "mongoose";

/**
 * Connect mongoose to the shared in-memory MongoDB using a per-worker database
 * name (set in `vitest.setup.ts`) so parallel test files stay isolated.
 */
export async function connectTestDB(): Promise<void> {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL not set — is globalSetup running?");
  if (mongoose.connection.readyState === 1) return;

  await mongoose.connect(uri, {
    dbName: process.env.TEST_DB_NAME,
    serverSelectionTimeoutMS: 10_000,
  });

  // Build unique/sparse/partial indexes up front so idempotency (E11000)
  // replay paths behave exactly like production.
  await Promise.all(
    Object.values(mongoose.models).map((model) =>
      model.init().catch(() => undefined),
    ),
  );
}

export async function disconnectTestDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

/** Wipe all collections in the worker's test database between tests. */
export async function clearTestDB(): Promise<void> {
  if (mongoose.connection.readyState !== 1) return;
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((collection) =>
      collection.deleteMany({}),
    ),
  );
}
