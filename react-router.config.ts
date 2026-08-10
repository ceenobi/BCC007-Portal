import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // Static, public pages with no session-dependent data are prerendered to
  // static HTML at build time. Everything else (auth, dashboard, health, API
  // routes) is dynamically server-rendered per request.
  prerender: ["/", "/contact", "/privacy", "/terms"],
  presets: [vercelPreset()],
} satisfies Config;
