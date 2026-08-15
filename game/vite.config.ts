import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/game/',
  server: { port: 5173, strictPort: true },
  test: {
    include: ['src/engine/**/*.test.ts'],
  },
});
