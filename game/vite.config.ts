import { defineConfig } from 'vitest/config';

/**
 * The other half of the way back to the portfolio.
 *
 * `index.html`'s footer link points at `/`, which is right in production: the
 * game is a real directory at `/game` and the portfolio is the site root. On
 * THIS server it was a trap. `base: '/game/'` makes Vite answer `/` with a 302
 * straight back to `/game/`, so the one link promising a visitor they are never
 * more than a click from the CV put them back in the game instead.
 *
 * Added before Vite's own middleware rather than after, so it answers first.
 * The port is the root `vite.config.mjs`'s, which is the same seam `base` and
 * `server.port` below are already on: those three values only make sense
 * together, and this comment is here so the third is not read as arbitrary.
 */
const escapeToPortfolio = {
  name: 'escape-to-portfolio',
  configureServer(server: { middlewares: { use: (fn: unknown) => void } }) {
    server.middlewares.use(
      (
        request: { url?: string },
        response: { writeHead: (code: number, headers: object) => void; end: () => void },
        next: () => void,
      ) => {
        if (request.url === '/' || request.url === '/index.html') {
          response.writeHead(302, { Location: 'http://localhost:3000/' });
          response.end();
          return;
        }
        next();
      },
    );
  },
};

export default defineConfig({
  plugins: [escapeToPortfolio],
  /**
   * Half of the dev-server seam. The other half is the root `vite.config.mjs`,
   * which proxies `/game` here — changing either value without changing that
   * file breaks the game in development: assets 404 (base) or the proxy has
   * nothing to reach (port).
   *
   * `strictPort` so a taken port fails loudly rather than drifting to 5174,
   * where the proxy would no longer find it.
   */
  base: '/game/',
  server: { port: 5173, strictPort: true },
  test: {
    // Widened past src/engine so src/input and src/fixed-timestep are covered.
    include: ['src/**/*.test.ts'],
  },
});
