import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // Netlify publishes `build`. Vite's default is `dist`.
  build: {
    outDir: "build",
  },

  server: {
    // Vite's default is 5173, which is the game's dev server port. Strict, so a
    // port that is already taken fails loudly instead of silently serving on
    // 3001 and making every note that says :3000 wrong.
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
