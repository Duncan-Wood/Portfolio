import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const GAME_ROOT = fileURLToPath(new URL("./game", import.meta.url));
const GAME_PATH = /^\/game(?:[/?]|$)/;

function serveTheGame() {
  return {
    name: "serve-the-game",
    apply: (_config, { command }) => command === "serve" && !process.env.VITEST,
    async configureServer(server) {
      const game = await createServer({
        root: GAME_ROOT,
        configFile: `${GAME_ROOT}/vite.config.ts`,
        clearScreen: false,
        server: { middlewareMode: true, hmr: { server: server.httpServer } },
      });
      server.httpServer.on("close", () => game.close());

      server.middlewares.use((req, res, next) => {
        if (!GAME_PATH.test(req.url)) {
          next();
          return;
        }

        // The game's Vite serves only under `base: '/game/'`; a bare `/game` 404s.
        req.url = req.url.replace(/^\/game(?=\?|$)/, "/game/");
        game.middlewares(req, res, () => {
          res.statusCode = 404;
          res.end();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveTheGame()],

  build: {
    outDir: "build",
  },

  server: {
    port: 3000,
  },

  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}", "netlify/**/*.test.mjs"],
  },
});
