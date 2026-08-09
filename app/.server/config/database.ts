// Ensure environment variables are loaded
import mongoose, { type ConnectOptions } from "mongoose";
import { env } from "./keys";
import logger from "./logger";

if (!env.databaseUrl) {
  const message = "DATABASE_URL environment variable is not defined";
  const isBuild = process.env.npm_lifecycle_event === "build" || process.env.PRERENDER === "true";
  
  if (process.env.NODE_ENV === "production" && !isBuild) {
    throw new Error(message);
  } else {
    console.warn(`⚠️  ${message}`);
  }
}

interface DBConnection {
  isConnected: boolean;
  retryCount: number;
  maxRetries: number;
}

const dbConnection: DBConnection = {
  isConnected: false,
  retryCount: 0,
  maxRetries: 5,
};

export const connectToDB = async (): Promise<void> => {
  const isBuild =
    process.env.npm_lifecycle_event === "build" ||
    process.env.PRERENDER === "true";
  if (isBuild) return;

  if (dbConnection.isConnected && mongoose.connection.readyState === 1) {
    logger.info("✅ Using existing MongoDB connection");
    return;
  }

  if (dbConnection.retryCount >= dbConnection.maxRetries) {
    logger.error("❌ Max MongoDB connection retries reached");
    process.exit(1);
  }

  const connectionOptions: ConnectOptions = {
    dbName: env.databaseName,
    serverSelectionTimeoutMS: 45000,
    socketTimeoutMS: 15000,
    retryWrites: true,
    retryReads: true,
    maxPoolSize: 50,
    minPoolSize: 1,
    autoIndex: env.nodeEnv !== "production",
    monitorCommands: env.nodeEnv === "development",
  };
  try {
    const conn = await mongoose.connect(env.databaseUrl!, connectionOptions);
    dbConnection.isConnected = conn.connections[0].readyState === 1;
    dbConnection.retryCount = 0;

    if (dbConnection.isConnected) {
      logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);

      // Only attach listeners once
      if (mongoose.connection.listenerCount("error") === 0) {
        mongoose.connection.on("error", (err) => {
          logger.error(err, "❌ MongoDB connection error:");
          dbConnection.isConnected = false;
        });
      }

      if (mongoose.connection.listenerCount("disconnected") === 0) {
        mongoose.connection.on("disconnected", () => {
          logger.info("ℹ️  MongoDB disconnected");
          dbConnection.isConnected = false;
          // Attempt to reconnect
          if (dbConnection.retryCount < dbConnection.maxRetries) {
            dbConnection.retryCount++;
            logger.info(
              `ℹ️  Attempting to reconnect (${dbConnection.retryCount}/${dbConnection.maxRetries})...`,
            );
            setTimeout(connectToDB, 5000);
          }
        });
      }
    }
  } catch (error: unknown) {
    dbConnection.retryCount++;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(
      { error: errorMessage },
      `❌ MongoDB connection failed (attempt ${dbConnection.retryCount}/${dbConnection.maxRetries}):`,
    );

    if (dbConnection.retryCount < dbConnection.maxRetries) {
      logger.info(`ℹ️  Retrying in 5 seconds...`);
      setTimeout(connectToDB, 5000);
    } else {
      console.error("❌ Max retries reached. Exiting...");
      process.exit(1);
    }
  }
};

// Handle graceful shutdown
export const gracefulShutdown = async (): Promise<void> => {
  try {
    logger.info("\n🛑 Received shutdown signal. Closing server...");
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed");
    }

    logger.info("✅ Server shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error(error, "❌ Error during shutdown:");
    process.exit(1);
  }
};

// Handle uncaught exceptions and unhandled rejections
if (process.listenerCount("uncaughtException") === 0) {
  process.on("uncaughtException", (error: Error) => {
    logger.error("\n❌ UNCAUGHT EXCEPTION! Shutting down...");
    logger.error({ stack: error.stack }, `${error.name}: ${error.message}`);

    if (env.nodeEnv === "development") {
      console.error(error);
    }

    // Attempt to close server gracefully
    gracefulShutdown().finally(() => process.exit(1));
  });
}

if (process.listenerCount("unhandledRejection") === 0) {
  process.on("unhandledRejection", (reason: any) => {
    logger.error("\n❌ UNHANDLED REJECTION! Shutting down...");
    logger.error({ reason }, "Unhandled Promise Rejection");

    // Attempt to close server gracefully
    gracefulShutdown().finally(() => process.exit(1));
  });
}

// Handle termination signals
if (process.listenerCount("SIGINT") === 0) {
  process.on("SIGINT", () => gracefulShutdown());
}

if (process.listenerCount("SIGTERM") === 0) {
  process.on("SIGTERM", () => gracefulShutdown());
}

