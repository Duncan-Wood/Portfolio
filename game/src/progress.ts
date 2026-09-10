import { clearStored, readStored, writeStored } from './storage';

const MEMORIES_KEY = 'connected.memories';
const BEST_CHAIN_KEY = 'connected.bestChain';
const CONTROLS_KEY = 'connected.controls';
// PLAYED_KEY, FRAGMENTS_TOTAL_KEY, LOG_KEY and BEST_CHAIN_KEY are also read by
// src/game-progress.js, a separate bundle; renaming one here silently empties the
// contact form's prefill.
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

export type ControlScheme = 'swipe' | 'buttons';

export const DEFAULT_CONTROLS: ControlScheme = 'swipe';

export function controlScheme(): ControlScheme {
  return readStored(CONTROLS_KEY) === 'buttons' ? 'buttons' : DEFAULT_CONTROLS;
}

export function rememberControlScheme(scheme: ControlScheme): void {
  writeStored(CONTROLS_KEY, scheme);
}

export function rememberBestChain(deepest: number): void {
  if (deepest < 2) {
    return;
  }

  const held = Number(readStored(BEST_CHAIN_KEY));
  if (Number.isFinite(held) && held >= deepest) {
    return;
  }

  writeStored(BEST_CHAIN_KEY, String(deepest));
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
