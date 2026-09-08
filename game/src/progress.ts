const SAVED_PREFIX = 'connected.';
const HAT_KEY = 'connected.hat';
const BUILD_KEY = 'connected.build';
const PLAYED_KEY = 'connected.played';

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
