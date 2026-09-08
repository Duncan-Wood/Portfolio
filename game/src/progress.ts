const SAVED_PREFIX = 'connected.';
const HAT_KEY = 'connected.hat';
const BUILD_KEY = 'connected.build';
const PLAYED_KEY = 'connected.played';
// Read by the portfolio's contact form, which shares this origin but not this bundle.
const FRAGMENTS_KEY = 'connected.fragments';
const FRAGMENTS_TOTAL_KEY = 'connected.fragmentsTotal';

export function hatEarned(): boolean {
  return localStorage.getItem(HAT_KEY) === 'true';
}

export function rememberHat(): void {
  localStorage.setItem(HAT_KEY, 'true');
}

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
