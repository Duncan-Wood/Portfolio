export const CRASHED = 'SOMETHING BROKE';

// PLACEHOLDER: the meta line belongs to the game's voice, not to me.
export const CRASH_LINE = 'That one was a bug, not you.';

export function reportingEnabled(dsn: string | undefined, production: boolean): boolean {
  return production && dsn !== undefined && dsn.trim() !== '';
}

export function crashSignature(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

// A broken frame repeats every frame; the dashboard only wants to hear it once.
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
