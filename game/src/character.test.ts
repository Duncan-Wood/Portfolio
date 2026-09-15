import { describe, expect, it } from 'vitest';
import {
  CHARACTER_SHEET,
  RESTING,
  type CharacterAnimation,
  characterAfter,
  characterFrame,
  characterOn,
} from './character';

const playedThrough = (animation: CharacterAnimation): number => (
  CHARACTER_SHEET[animation].frames * CHARACTER_SHEET[animation].frameMs
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
