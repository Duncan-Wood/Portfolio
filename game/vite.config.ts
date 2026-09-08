import { defineConfig } from 'vitest/config';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// Uploading needs a token, an org and a project; without all three there is
// nothing to upload to, so the build stays a plain build.
const uploadingSourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

export default defineConfig({
  base: '/game/',
  define: { __BUILD_ID__: JSON.stringify(String(Date.now())) },
  // The root `vite.config.mjs` proxies `/game` to this port.
  server: { port: 5173, strictPort: true },
  build: {
    // `hidden` emits the maps without pointing the browser at them, so stack
    // traces stay readable in Sentry without publishing the source.
    sourcemap: uploadingSourceMaps ? 'hidden' : false,
  },
  plugins: uploadingSourceMaps
    ? [
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: { name: String(Date.now()) },
        sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
      }),
    ]
    : [],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
