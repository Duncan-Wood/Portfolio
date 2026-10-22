import { FRAGMENT_COUNT } from './memories';
import { completions, introSeen, playedBefore, rememberPlayed, runFinished } from './progress';

export type Opening = 'victory' | 'intro' | 'shadow' | 'nothing';

export function chooseOpening(): Opening {
  if (runFinished(FRAGMENT_COUNT)) {
    return 'victory';
  }

  let opening: Opening = 'nothing';
  if (!introSeen()) {
    opening = 'intro';
  } else if (playedBefore() && completions() === 0) {
    opening = 'shadow';
  }

  rememberPlayed();
  return opening;
}
