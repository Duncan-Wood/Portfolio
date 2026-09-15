export type CharacterAnimation = 'idle' | 'cheer' | 'worried' | 'lost' | 'won';

export type CharacterMoment = 'good' | 'shadow' | 'lost' | 'won' | 'restart';

export interface AnimationTiming {
  frames: number;
  frameMs: number;
}

export const CHARACTER_SHEET: Record<CharacterAnimation, AnimationTiming> = {
  idle: { frames: 4, frameMs: 350 },
  cheer: { frames: 3, frameMs: 140 },
  worried: { frames: 3, frameMs: 220 },
  lost: { frames: 3, frameMs: 180 },
  won: { frames: 3, frameMs: 180 },
};

export interface CharacterState {
  animation: CharacterAnimation;
  elapsed: number;
}

export const RESTING: CharacterState = { animation: 'idle', elapsed: 0 };

const isEnding = (animation: CharacterAnimation): boolean => animation === 'lost' || animation === 'won';

const playTime = ({ frames, frameMs }: AnimationTiming): number => frames * frameMs;

export function characterOn(state: CharacterState, moment: CharacterMoment): CharacterState {
  if (moment === 'restart') {
    return RESTING;
  }

  if (moment === 'lost' || moment === 'won') {
    return { animation: moment, elapsed: 0 };
  }

  if (isEnding(state.animation)) {
    return state;
  }

  return { animation: moment === 'good' ? 'cheer' : 'worried', elapsed: 0 };
}

export function characterAfter(state: CharacterState, delta: number): CharacterState {
  const elapsed = state.elapsed + delta;

  if (state.animation === 'idle' || isEnding(state.animation)) {
    return { animation: state.animation, elapsed };
  }

  const finished = playTime(CHARACTER_SHEET[state.animation]);
  return elapsed >= finished
    ? { animation: 'idle', elapsed: elapsed - finished }
    : { animation: state.animation, elapsed };
}

export function characterFrame({ animation, elapsed }: CharacterState): number {
  const { frames, frameMs } = CHARACTER_SHEET[animation];
  const frame = Math.floor(elapsed / frameMs);

  return animation === 'idle' ? frame % frames : Math.min(frame, frames - 1);
}
