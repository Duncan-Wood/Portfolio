export type CharacterAnimation = 'idle' | 'cheer' | 'worried' | 'lost' | 'won' | 'thinking' | 'reading' | 'sitting';

export type CharacterMoment = 'good' | 'shadow' | 'lost' | 'won' | 'restart' | 'welcome' | 'instructions' | 'pause' | 'resume';

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
  thinking: { frames: 4, frameMs: 450 },
  reading: { frames: 4, frameMs: 400 },
  sitting: { frames: 4, frameMs: 500 },
};

export interface CharacterState {
  animation: CharacterAnimation;
  elapsed: number;
}

export const RESTING: CharacterState = { animation: 'idle', elapsed: 0 };

const SCREEN_ANIMATION: Partial<Record<CharacterMoment, CharacterAnimation>> = {
  welcome: 'thinking',
  instructions: 'reading',
  pause: 'sitting',
};

const isScreenPose = (animation: CharacterAnimation): boolean => (
  animation === 'thinking' || animation === 'reading' || animation === 'sitting'
);

const isLooping = (animation: CharacterAnimation): boolean => animation === 'idle' || isScreenPose(animation);

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

  if (moment === 'resume') {
    return isScreenPose(state.animation) ? RESTING : state;
  }

  const screenPose = SCREEN_ANIMATION[moment];
  if (screenPose !== undefined) {
    return { animation: screenPose, elapsed: 0 };
  }

  return { animation: moment === 'good' ? 'cheer' : 'worried', elapsed: 0 };
}

export function characterAfter(state: CharacterState, delta: number): CharacterState {
  const elapsed = state.elapsed + delta;

  if (isLooping(state.animation) || isEnding(state.animation)) {
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

  return isLooping(animation) ? frame % frames : Math.min(frame, frames - 1);
}

const THOUGHT_DOT_MS = 600;

export function thoughtFrame({ elapsed }: CharacterState, frames: number): number {
  return Math.floor(elapsed / THOUGHT_DOT_MS) % frames;
}
