import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Sends a bare `/game` to `/game/`. The game's Vite sets `base: '/game/'`, so
 * without the slash the browser resolves its assets against `/` and they 404.
 * A proxy rule cannot do this — it needs a redirect the browser follows.
 */
const redirectBareGamePath = {
  name: "redirect-bare-game-path",
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      if (request.url === "/game") {
        response.writeHead(302, { Location: "/game/" });
        response.end();
        return;
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), redirectBareGamePath],

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
    // Replaces src/setupProxy.js, which existed only because CRA hid its
    // webpack config. `ws` forwards the socket Vite's HMR client holds open.
    proxy: {
      "/game": {
        target: "http://localhost:5173",
        changeOrigin: true,
        ws: true,
      },
    },
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
