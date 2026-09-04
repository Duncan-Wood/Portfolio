import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/game/',
  // The root `vite.config.mjs` proxies `/game` to this port.
  server: { port: 5173, strictPort: true },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
