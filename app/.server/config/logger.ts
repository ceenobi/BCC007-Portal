import pino from "pino";
import { env } from "./keys";

const logger = pino({
  level: env.nodeEnv === "development" ? "debug" : "info",
  transport:
    env.nodeEnv === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

export default logger;