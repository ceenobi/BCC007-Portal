import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
  test: {
    // Default node env; component tests opt into a DOM via a
    // `@vitest-environment happy-dom` pragma comment.
    environment: "node",
    include: ["app/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/build/**",
      "**/.react-router/**",
      "**/.vite/**",
    ],
    // Start a single in-memory MongoDB for the whole run and share its URI.
    globalSetup: ["./vitest.global-setup.ts"],
    setupFiles: ["./vitest.setup.ts", "./vitest.dom-setup.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: [
        "app/.server/actions/**",
        "app/.server/ai/**",
        "app/.server/models/**",
        "app/.server/services/**",
        "app/.server/utils/**",
        "app/.server/workflows/**",
        "app/lib/**",
      ],
      exclude: [
        "**/*.d.ts",
        "app/.server/services/better-auth.ts",
        "app/.server/utils/email-templates.ts",
        "app/.server/workflows/**/index.ts",
        "app/lib/constants.ts",
        "app/lib/getQueryClient.ts",
        "app/lib/cloudinary.ts",
      ],
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      thresholds: {
        // Baseline floors for the current suite — raised as coverage grows.
        lines: 15,
        branches: 14,
        functions: 20,
        statements: 15,
      },
    },
  },
});
