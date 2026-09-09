const SAVED_PREFIX = 'connected.';
const BUILD_KEY = 'connected.build';
const PLAYED_KEY = 'connected.played';
// Read by the portfolio's contact form, which shares this origin but not this bundle.
const FRAGMENTS_KEY = 'connected.fragments';
const FRAGMENTS_TOTAL_KEY = 'connected.fragmentsTotal';
// Where an unfinished run left off, so leaving for the contact form and
// coming back does not start the whole thing again.
const RESUME_KEY = 'connected.resume';

export function playedBefore(): boolean {
  return localStorage.getItem(PLAYED_KEY) === 'true';
}

export function rememberPlayed(): void {
  localStorage.setItem(PLAYED_KEY, 'true');
}

export function furthestFragment(remembered: number, reached: number, total: number): number {
  return Math.max(Math.min(remembered, total), reached);
}

export function rememberFragmentsReached(reached: number, total: number): void {
  const remembered = Number(localStorage.getItem(FRAGMENTS_KEY)) || 0;

  localStorage.setItem(FRAGMENTS_KEY, String(furthestFragment(remembered, reached, total)));
  localStorage.setItem(FRAGMENTS_TOTAL_KEY, String(total));
}

export function resumePoint(saved: number, total: number): number {
  return saved > 0 && saved < total ? saved : 0;
}

export function resumeAt(total: number): number {
  return resumePoint(Number(localStorage.getItem(RESUME_KEY)), total);
}

export function rememberResume(nodesRevealed: number, total: number): void {
  if (resumePoint(nodesRevealed, total) === 0) {
    localStorage.removeItem(RESUME_KEY);
    return;
  }

  localStorage.setItem(RESUME_KEY, String(nodesRevealed));
}

export function forgetProgressFromAnOlderBuild(): void {
  if (!import.meta.env.DEV || localStorage.getItem(BUILD_KEY) === __BUILD_ID__) {
    return;
  }

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(SAVED_PREFIX)) {
      localStorage.removeItem(key);
    }
  }

  localStorage.setItem(BUILD_KEY, __BUILD_ID__);
}
