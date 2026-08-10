import { reactRouter } from "@react-router/dev/vite";
import { sentryReactRouter } from "@sentry/react-router";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";
import { defineConfig } from "vite";

const sentryRelease =
  process.env.SENTRY_RELEASE ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();

const sentryConfig = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: {
    name: sentryRelease,
  },
  telemetry: false,
};

export default defineConfig((config) => ({
  plugins: [tailwindcss(), reactRouter(), sentryReactRouter(sentryConfig, config)],
  sentryConfig,
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: "localhost",
    port: 5700,
    open: true,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "::1",
      "salmon-daring-partially.ngrok-free.app",
    ],
  },
}));
