import { defineConfig } from 'vitest/config';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// Sentry matches a stack trace to its uploaded source maps by release, so the
// name here and `__BUILD_ID__` in the browser must be the one same string.
const release = String(Date.now());

const uploadingSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default defineConfig({
  base: '/game/',
  define: { __BUILD_ID__: JSON.stringify(release) },
  // The root `vite.config.mjs` proxies `/game` to this port.
  server: { port: 5173, strictPort: true },
  build: {
    sourcemap: uploadingSourceMaps ? 'hidden' : false,
  },
  plugins: uploadingSourceMaps
    ? [
      sentryVitePlugin({
        org: 'duncanwoodpro',
        project: 'connected',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: { name: release },
        sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
      }),
    ]
    : [],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
