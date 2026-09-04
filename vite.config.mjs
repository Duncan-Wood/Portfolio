import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // Netlify publishes `build`. Vite's default is `dist`.
  build: {
    outDir: "build",
  },

  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      // The game's Vite serves only under `base: '/game/'`; a bare `/game` 404s.
      "/game": {
        target: "http://localhost:5173",
        ws: true,
        rewrite: (path) => (path === "/game" ? "/game/" : path),
      },
    },
  },

  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
  },
});
