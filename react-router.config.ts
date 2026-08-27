import type { Config } from "@react-router/dev/config";
import { sentryOnBuildEnd } from "@sentry/react-router";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // Only truly static, non-session assets are prerendered. The public
  // shell (`_layout` → `/`, `/contact`, `/privacy`, `/terms`) renders
  // `HomeNav` with per-request session data via `sessionMiddleware`, so it
  // must be SSR — otherwise Vercel serves a static `user: null` shell in prod.
  prerender: ["/robots.txt", "/sitemap.xml"],
  presets: [vercelPreset()],
  // Uploads source maps and creates a Sentry release after the build.
  buildEnd: sentryOnBuildEnd,
} satisfies Config;
