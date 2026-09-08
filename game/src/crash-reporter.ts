import { captureException, init } from '@sentry/browser';
import { CrashLog, reportingEnabled } from './crash';

const log = new CrashLog();

let reporting = false;

export function startCrashReporting(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!reportingEnabled(dsn, import.meta.env.PROD)) {
    return;
  }

  init({
    dsn,
    release: __BUILD_ID__,
    // No breadcrumbs from the console and no user identifiers: a stranger
    // playing this has not agreed to be measured.
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });

  reporting = true;
}

export function reportCrash(error: unknown): void {
  if (!log.firstSighting(error)) {
    return;
  }

  console.error(error);

  if (reporting) {
    captureException(error);
  }
}
