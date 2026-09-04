import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

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
