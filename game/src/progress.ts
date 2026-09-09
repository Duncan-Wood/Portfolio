import { clearStored, readStored, writeStored } from './storage';

const MEMORIES_KEY = 'connected.memories';
// PLAYED_KEY, FRAGMENTS_TOTAL_KEY and LOG_KEY are also read by src/game-progress.js,
// a separate bundle; renaming one here silently empties the contact form's prefill.
const PLAYED_KEY = 'connected.played';
const FRAGMENTS_TOTAL_KEY = 'connected.fragmentsTotal';
const LOG_KEY = 'connected.log';
const RESUME_KEY = 'connected.resume';

export function playedBefore(): boolean {
  return readStored(PLAYED_KEY) === 'true';
}

export function rememberPlayed(): void {
  writeStored(PLAYED_KEY, 'true');
}

export interface SurfacedFragment {
  title: string;
  tries: number;
}

export function loggedWith(
  log: readonly SurfacedFragment[],
  index: number,
  entry: SurfacedFragment,
): SurfacedFragment[] {
  const next = [...log];
  next[index] = entry;
  return [...next].map((held) => held ?? { title: '', tries: 0 });
}

export function rememberFragment(
  index: number,
  entry: SurfacedFragment,
  total: number,
): void {
  let log: SurfacedFragment[] = [];
  try {
    const held: unknown = JSON.parse(readStored(LOG_KEY) ?? '[]');
    if (Array.isArray(held)) {
      log = held as SurfacedFragment[];
    }
  } catch {
    log = [];
  }

  writeStored(LOG_KEY, JSON.stringify(loggedWith(log, index, entry)));
  writeStored(FRAGMENTS_TOTAL_KEY, String(total));
}

export function resumePoint(saved: number, total: number): number {
  return saved > 0 && saved < total ? saved : 0;
}

export function resumeAt(total: number): number {
  return resumePoint(Number(readStored(RESUME_KEY)), total);
}

export function rememberResume(nodesRevealed: number, total: number): void {
  if (resumePoint(nodesRevealed, total) === 0) {
    clearStored(RESUME_KEY);
    return;
  }

  writeStored(RESUME_KEY, String(nodesRevealed));
}

export function forgetProgressFromOlderMemories(signature: string): void {
  if (readStored(MEMORIES_KEY) === signature) {
    return;
  }

  for (const key of [LOG_KEY, FRAGMENTS_TOTAL_KEY, RESUME_KEY]) {
    clearStored(key);
  }

  writeStored(MEMORIES_KEY, signature);
}
