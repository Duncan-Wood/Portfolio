import { describe, expect, it } from 'vitest';
import {
  CHARACTER_SHEET,
  RESTING,
  type CharacterAnimation,
  characterAfter,
  characterFrame,
  characterOn,
  thoughtFrame,
} from './character';

const playedThrough = (animation: CharacterAnimation): number => (
  CHARACTER_SHEET[animation].frames * CHARACTER_SHEET[animation].frameMs
);

const settled = (moment: 'welcome' | 'instructions' | 'pause') => (
  characterAfter(characterOn(RESTING, moment), 100000)
);

describe('the character at rest', () => {
  it('starts idle on its first frame', () => {
    expect(RESTING.animation).toBe('idle');
    expect(characterFrame(RESTING)).toBe(0);
  });

  it('loops the idle frames rather than stopping on the last one', () => {
    const { frames, frameMs } = CHARACTER_SHEET.idle;

    expect(characterFrame(characterAfter(RESTING, frameMs))).toBe(1);
    expect(characterFrame(characterAfter(RESTING, frameMs * frames))).toBe(0);
  });
});

describe('reacting to the board', () => {
  it('cheers at a good moment, then settles back to idle once the cheer has played', () => {
    const cheering = characterOn(RESTING, 'good');

    expect(cheering.animation).toBe('cheer');
    expect(characterAfter(cheering, playedThrough('cheer') - 1).animation).toBe('cheer');
    expect(characterAfter(cheering, playedThrough('cheer')).animation).toBe('idle');
  });

  it('looks worried when the shadow arrives, holding the last frame until it finishes', () => {
    const { frames } = CHARACTER_SHEET.worried;
    const worried = characterOn(RESTING, 'shadow');

    expect(worried.animation).toBe('worried');
    expect(characterFrame(characterAfter(worried, playedThrough('worried') - 1))).toBe(frames - 1);
  });

  it('lets a new moment cut off the reaction already playing', () => {
    const partway = characterAfter(characterOn(RESTING, 'good'), 1);

    expect(characterOn(partway, 'shadow')).toEqual({ animation: 'worried', elapsed: 0 });
  });
});

describe('when the run ends', () => {
  it('stays slumped after losing the board instead of drifting back to idle', () => {
    const muchLater = characterAfter(characterOn(RESTING, 'lost'), playedThrough('lost') * 10);

    expect(muchLater.animation).toBe('lost');
    expect(characterFrame(muchLater)).toBe(CHARACTER_SHEET.lost.frames - 1);
  });

  it('keeps celebrating a win instead of drifting back to idle', () => {
    const muchLater = characterAfter(characterOn(RESTING, 'won'), playedThrough('won') * 10);

    expect(muchLater.animation).toBe('won');
  });

  it('ignores ordinary moments once the run is over', () => {
    const lost = characterOn(RESTING, 'lost');

    expect(characterOn(lost, 'good')).toEqual(lost);
    expect(characterOn(lost, 'shadow')).toEqual(lost);
  });

  it('returns to idle when a new run starts', () => {
    expect(characterOn(characterOn(RESTING, 'won'), 'restart')).toEqual(RESTING);
  });
});

describe('the character on the screens around the board', () => {
  it('thinks while the welcome card is up', () => {
    expect(settled('welcome').animation).toBe('thinking');
  });

  it('reads while the how to play card is up', () => {
    expect(settled('instructions').animation).toBe('reading');
  });

  it('sits while the game is paused', () => {
    expect(settled('pause').animation).toBe('sitting');
  });

  it('keeps each of those going instead of settling back to idle', () => {
    for (const moment of ['welcome', 'instructions', 'pause'] as const) {
      const state = settled(moment);

      expect(characterAfter(state, 100000).animation, moment).toBe(state.animation);
    }
  });

  it('loops their frames rather than holding the last one', () => {
    for (const animation of ['thinking', 'reading', 'sitting'] as const) {
      const { frames, frameMs } = CHARACTER_SHEET[animation];
      const state = { animation, elapsed: 0 };

      expect(characterFrame(characterAfter(state, frameMs * frames)), animation).toBe(0);
      expect(characterFrame(characterAfter(state, frameMs * (frames + 1))), animation).toBe(1);
    }
  });

  it('leaves a reaction already playing alone when play resumes', () => {
    const cheering = characterOn(RESTING, 'good');

    expect(characterOn(cheering, 'resume')).toEqual(cheering);
  });

  it('does not stand a finished run back up on resume', () => {
    const lost = characterOn(RESTING, 'lost');

    expect(characterOn(lost, 'resume')).toEqual(lost);
    expect(characterOn(lost, 'pause')).toEqual(lost);
  });
});

describe('moving between poses', () => {
  const ENTRIES = [
    ['welcome', 'musing', 'thinking'],
    ['instructions', 'drawing', 'reading'],
    ['pause', 'settling', 'sitting'],
  ] as const;

  const EXITS = [
    ['thinking', 'lowering'],
    ['reading', 'stowing'],
    ['sitting', 'rising'],
  ] as const;

  it.each(ENTRIES)('goes through a transition on its way into the %s pose', (moment, transition, pose) => {
    const entering = characterOn(RESTING, moment);

    expect(entering).toEqual({ animation: transition, elapsed: 0 });
    expect(characterAfter(entering, playedThrough(transition) - 1).animation).toBe(transition);
    expect(characterAfter(entering, playedThrough(transition)).animation).toBe(pose);
  });

  it.each(EXITS)('goes through a transition on its way out of the %s pose', (pose, transition) => {
    const leaving = characterOn({ animation: pose, elapsed: 0 }, 'resume');

    expect(leaving).toEqual({ animation: transition, elapsed: 0 });
    expect(characterAfter(leaving, playedThrough(transition)).animation).toBe('idle');
  });

  it('carries the time left over from a transition into the pose after it', () => {
    const entering = characterOn(RESTING, 'pause');
    const afterwards = characterAfter(entering, playedThrough('settling') + 70);

    expect(afterwards).toEqual({ animation: 'sitting', elapsed: 70 });
  });

  it('plays every transition once through, never looping or holding its last frame', () => {
    for (const transition of ['musing', 'lowering', 'drawing', 'stowing', 'settling', 'rising'] as const) {
      const { frames, frameMs } = CHARACTER_SHEET[transition];
      const state = { animation: transition, elapsed: 0 };

      expect(characterFrame(characterAfter(state, frameMs)), transition).toBe(frames > 1 ? 1 : 0);
    }
  });

  it('stands back up from a pose that is still being entered', () => {
    const settling = characterOn(RESTING, 'pause');

    expect(characterOn(settling, 'resume')).toEqual({ animation: 'rising', elapsed: 0 });
  });

  it('does not restart a pose it is already in or entering', () => {
    const settling = characterOn(RESTING, 'pause');
    const sitting = settled('pause');

    expect(characterOn(settling, 'pause')).toEqual(settling);
    expect(characterOn(sitting, 'pause')).toEqual(sitting);
  });

  it('lets a reaction cut a transition short', () => {
    expect(characterOn(characterOn(RESTING, 'pause'), 'good')).toEqual({ animation: 'cheer', elapsed: 0 });
  });

  it('reaches for the card when it goes from the welcome to the how to play screen', () => {
    expect(characterOn(settled('welcome'), 'instructions')).toEqual({ animation: 'drawing', elapsed: 0 });
  });

  it('is not a screen pose again once it has started rising', () => {
    const rising = characterOn(settled('pause'), 'resume');

    expect(characterOn(rising, 'resume')).toEqual(rising);
  });
});

describe('the thought bubble', () => {
  const thinking = { animation: 'thinking', elapsed: 0 } as const;

  it('starts with one dot and fills up, one more at a time', () => {
    expect(thoughtFrame(thinking, 3)).toBe(0);
    expect(thoughtFrame(characterAfter(thinking, 600), 3)).toBe(1);
    expect(thoughtFrame(characterAfter(thinking, 1200), 3)).toBe(2);
  });

  it('starts over once every dot has shown', () => {
    expect(thoughtFrame(characterAfter(thinking, 1800), 3)).toBe(0);
  });
});
