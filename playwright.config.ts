import { defineConfig } from "@playwright/test";

/**
 * End-to-end smoke gate.
 *
 * - `webServer` runs `yarn dev:e2e` (`scripts/dev-e2e.ts`), which boots an
 *   in-memory MongoDB, writes a temporary `.env.e2e` (loaded by Vite via
 *   `--mode e2e`), then starts the dev server on port 5701. The env override
 *   is written before the dev server boots so CI (which has no `.env`) works.
 * - Tests exercise the real SSR app: landing page, health page, route-guard
 *   redirects, and client-side validation on the login/register forms.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5701",
    trace: "on-first-retry",
  },
  webServer: {
    command: "yarn dev:e2e",
    url: "http://localhost:5701/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
