export const CRASHED = 'SOMETHING BROKE';

export const CRASH_LINE = 'That one was not you. I did say this would not hold together.';

export function reportingEnabled(dsn: string | undefined, production: boolean): dsn is string {
  return production && dsn !== undefined && dsn.trim() !== '';
}

export function looksLikeDsn(dsn: string): boolean {
  try {
    const parsed = new URL(dsn);
    return parsed.username !== '' && /^\/\d+$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function crashSignature(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

export class CrashLog {
  private seen = new Set<string>();

  firstSighting(error: unknown): boolean {
    const signature = crashSignature(error);
    if (this.seen.has(signature)) {
      return false;
    }

    this.seen.add(signature);
    return true;
  }
}
