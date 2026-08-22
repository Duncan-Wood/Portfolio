import { defineConfig } from 'vitest/config';

export default defineConfig({
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
