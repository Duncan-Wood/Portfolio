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
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    // The game is a separate project with its own config, Node version and
    // suite. Without this the root runner walks into it once the branches meet.
    exclude: ["game/**", "node_modules/**", "build/**"],
  },
});
