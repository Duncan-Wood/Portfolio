import { clearStored, readStored, writeStored } from './storage';

const MEMORIES_KEY = 'connected.memories';
// PLAYED_KEY, FRAGMENTS_TOTAL_KEY and LOG_KEY are also read by
// src/game-progress.js, a separate bundle; renaming one here silently empties the
// contact form's prefill.
const PLAYED_KEY = 'connected.played';
const FRAGMENTS_TOTAL_KEY = 'connected.fragmentsTotal';
const LOG_KEY = 'connected.log';
const RESUME_KEY = 'connected.resume';
const INTRO_SEEN_KEY = 'connected.introSeen';
const COMPLETIONS_KEY = 'connected.completions';

export function playedBefore(): boolean {
  return readStored(PLAYED_KEY) === 'true';
}

export function rememberPlayed(): void {
  writeStored(PLAYED_KEY, 'true');
}

export function introSeen(): boolean {
  return readStored(INTRO_SEEN_KEY) === 'true';
}

export function rememberIntroSeen(): void {
  writeStored(INTRO_SEEN_KEY, 'true');
}

export interface SurfacedFragment {
  title: string;
}

export function loggedWith(
  log: readonly SurfacedFragment[],
  index: number,
  entry: SurfacedFragment,
): SurfacedFragment[] {
  const next = [...log];
  next[index] = entry;
  return [...next].map((held) => held ?? { title: '' });
}

function readLog(): SurfacedFragment[] {
  try {
    const held: unknown = JSON.parse(readStored(LOG_KEY) ?? '[]');
    return Array.isArray(held) ? held as SurfacedFragment[] : [];
  } catch {
    return [];
  }
}

export function foundIndices(log: readonly SurfacedFragment[]): number[] {
  return log.flatMap((entry, index) => (entry?.title ? [index] : []));
}

export function foundFragments(): number[] {
  return foundIndices(readLog());
}

export function rememberFragment(
  index: number,
  entry: SurfacedFragment,
  total: number,
): void {
  writeStored(LOG_KEY, JSON.stringify(loggedWith(readLog(), index, entry)));
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

export function runFinished(total: number): boolean {
  return foundFragments().length >= total;
}

export function completions(): number {
  const held = Number(readStored(COMPLETIONS_KEY));
  return Number.isInteger(held) && held > 0 ? held : 0;
}

export function rememberCompletion(): void {
  writeStored(COMPLETIONS_KEY, String(completions() + 1));
}

export function forgetRun(): void {
  for (const key of [LOG_KEY, FRAGMENTS_TOTAL_KEY, RESUME_KEY]) {
    clearStored(key);
  }
}

export function forgetAllProgress(): void {
  forgetRun();
  for (const key of [
    PLAYED_KEY, INTRO_SEEN_KEY, COMPLETIONS_KEY,
  ]) {
    clearStored(key);
  }
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
