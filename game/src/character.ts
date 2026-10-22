export type CharacterAnimation = 'idle' | 'cheer' | 'worried' | 'lost' | 'won' | 'thinking' | 'reading' | 'sitting'
  | 'reaching' | 'catching' | 'musing' | 'lowering' | 'drawing' | 'stowing' | 'settling' | 'rising';

export type CharacterMoment = 'good' | 'shadow' | 'lost' | 'won' | 'restart' | 'welcome' | 'instructions' | 'pause' | 'resume' | 'reach' | 'catch';

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
  reaching: { frames: 2, frameMs: 170 },
  catching: { frames: 3, frameMs: 200 },
  musing: { frames: 2, frameMs: 130 },
  lowering: { frames: 2, frameMs: 130 },
  drawing: { frames: 2, frameMs: 140 },
  stowing: { frames: 2, frameMs: 140 },
  settling: { frames: 2, frameMs: 160 },
  rising: { frames: 2, frameMs: 160 },
};

export interface CharacterState {
  animation: CharacterAnimation;
  elapsed: number;
}

export const RESTING: CharacterState = { animation: 'idle', elapsed: 0 };

const SCREEN_ANIMATION: Partial<Record<CharacterMoment, ScreenPose>> = {
  welcome: 'thinking',
  instructions: 'reading',
  pause: 'sitting',
};

type ScreenPose = 'thinking' | 'reading' | 'sitting';

const ENTRY_TRANSITION: Record<ScreenPose, CharacterAnimation> = {
  thinking: 'musing',
  reading: 'drawing',
  sitting: 'settling',
};

const EXIT_TRANSITION: Record<ScreenPose, CharacterAnimation> = {
  thinking: 'lowering',
  reading: 'stowing',
  sitting: 'rising',
};

const TRANSITION_TARGET: Partial<Record<CharacterAnimation, CharacterAnimation>> = {
  musing: 'thinking',
  drawing: 'reading',
  settling: 'sitting',
  lowering: 'idle',
  stowing: 'idle',
  rising: 'idle',
};

const isScreenPose = (animation: CharacterAnimation): animation is ScreenPose => (
  animation === 'thinking' || animation === 'reading' || animation === 'sitting'
);

function screenPoseOf(animation: CharacterAnimation): ScreenPose | null {
  const target = TRANSITION_TARGET[animation] ?? animation;
  return isScreenPose(target) ? target : null;
}

const isLooping = (animation: CharacterAnimation): boolean => (
  animation === 'idle' || animation === 'reaching' || isScreenPose(animation)
);

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

  const current = screenPoseOf(state.animation);

  if (moment === 'reach' || moment === 'catch') {
    return current === null ? { animation: moment === 'reach' ? 'reaching' : 'catching', elapsed: 0 } : state;
  }

  if (moment === 'resume') {
    return current === null ? state : { animation: EXIT_TRANSITION[current], elapsed: 0 };
  }

  const screenPose = SCREEN_ANIMATION[moment];
  if (screenPose !== undefined) {
    return screenPose === current ? state : { animation: ENTRY_TRANSITION[screenPose], elapsed: 0 };
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
    ? { animation: TRANSITION_TARGET[state.animation] ?? 'idle', elapsed: elapsed - finished }
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
