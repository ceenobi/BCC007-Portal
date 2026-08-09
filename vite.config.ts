import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
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
});
