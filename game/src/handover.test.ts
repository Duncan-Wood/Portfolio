import { describe, expect, it } from 'vitest';
import {
  FOUND_CAUGHT_HOLD_MS,
  FOUND_DROP_MS,
  FOUND_LAND_FADE_MS,
  HANDOVER_TIMELINE,
  PURSE_FLASH_MS,
  advanceHandover,
  stageLength,
  stageStart,
  stagesBegun,
  type HandoverStage,
} from './handover';

function playThrough(frameMs: number): HandoverStage[] {
  const begun: HandoverStage[] = [];
  let elapsed = 0;
  let before = -1;

  while (!begun.includes('return')) {
    begun.push(...stagesBegun(before, elapsed));
    before = elapsed;
    elapsed = advanceHandover(elapsed, frameMs, true);
  }

  return begun;
}

describe('the handover after a solved board', () => {
  it('runs from the settle through to the return, in order', () => {
    expect(HANDOVER_TIMELINE.map(({ stage }) => stage)).toEqual(
      ['settle', 'fade', 'bloom', 'flight', 'land', 'return'],
    );
  });

  it('begins every stage exactly once at a smooth frame rate', () => {
    expect(playThrough(16)).toEqual(['settle', 'fade', 'bloom', 'flight', 'land', 'return']);
  });

  it('keeps the return from starting until the memory has landed and faded', () => {
    expect(stageLength('land')).toBeGreaterThanOrEqual(
      FOUND_CAUGHT_HOLD_MS + FOUND_DROP_MS + FOUND_LAND_FADE_MS,
    );
  });

  it('keeps the return from starting until the purse flash that follows the landing is over', () => {
    expect(stageLength('land')).toBeGreaterThanOrEqual(
      FOUND_CAUGHT_HOLD_MS + FOUND_DROP_MS + PURSE_FLASH_MS,
    );
  });

  it('still begins every stage when one slow frame jumps past several', () => {
    const begun = stagesBegun(-1, stageStart('flight') + 1);

    expect(begun).toEqual(['settle', 'fade', 'bloom', 'flight']);
  });

  it('begins nothing on a frame that stays inside one stage', () => {
    const inside = stageStart('bloom') + 10;

    expect(stagesBegun(inside, inside + 5)).toEqual([]);
  });

  it('holds at the settle while the last clear is still resolving', () => {
    let elapsed = 0;
    for (let frame = 0; frame < 200; frame += 1) {
      elapsed = advanceHandover(elapsed, 16, false);
    }

    expect(elapsed).toBeLessThan(stageStart('fade'));
    expect(stagesBegun(0, elapsed)).toEqual([]);
  });

  it('moves on to the fade once the board has settled', () => {
    const held = advanceHandover(0, 5000, false);

    expect(advanceHandover(held, 16, true)).toBeGreaterThanOrEqual(stageStart('fade'));
  });
});

describe('how gently the board gives way to a memory', () => {
  it('dims the board slowly enough to read as fading, not as vanishing', () => {
    expect(stageLength('fade')).toBeGreaterThanOrEqual(500);
  });

  it('brings the next board back no faster than the last one left', () => {
    expect(stageLength('return')).toBeGreaterThanOrEqual(stageLength('fade'));
  });
});
