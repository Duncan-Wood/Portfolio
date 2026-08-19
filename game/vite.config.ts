import { defineConfig } from 'vitest/config';

export default defineConfig({
  /**
   * `base` and `port` are one half of the dev-server seam; the other half is
   * `src/setupProxy.js` in the portfolio package, which forwards `/game` here.
   * Changing either value without changing that file breaks the game in
   * development — assets 404 (base) or the proxy 502s (port).
   *
   * `strictPort` makes a taken port fail loudly instead of silently drifting to
   * 5174, where the proxy would no longer find it.
   */
  base: '/game/',
  server: { port: 5173, strictPort: true },
  test: {
    // Widened past src/engine so src/input and src/fixed-timestep are covered.
    include: ['src/**/*.test.ts'],
  },
});
