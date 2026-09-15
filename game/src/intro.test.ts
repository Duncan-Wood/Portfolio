import { describe, expect, it } from 'vitest';
import { type IntroControls, introCards } from './intro';
import { LOCKS } from './engine/locks';

describe('the cards that open a first run', () => {
  it('says what Connected is before it says how to play', () => {
    const cards = introCards('keyboard');

    expect(cards).toHaveLength(2);
    expect(cards[0].title).toBe('Connected');
    expect(cards[1].title).toBe('how to play');
  });

  it('names the goal with the word the board shows for it', () => {
    const goal = 'neuron';

    expect(LOCKS.every((lock) => lock.objective.includes(goal))).toBe(true);
    expect(introCards('keyboard')[1].body).toContain(goal);
  });
});

describe('the controls a player is told about', () => {
  const rules = (controls: IntroControls): string => introCards(controls)[1].body.split('\n\n')[0];

  it('gives a keyboard player the keys', () => {
    const body = introCards('keyboard')[1].body;

    expect(body).toContain('←');
    expect(body).toContain('space');
  });

  it('tells a swipe player what to do with a finger, not which keys to press', () => {
    const body = introCards('swipe')[1].body;

    expect(body).toContain('tap');
    expect(body).toContain('flick');
    expect(body).not.toContain('space');
  });

  it('shows a buttons player the buttons on their screen', () => {
    const body = introCards('buttons')[1].body;

    expect(body).toContain('◀');
    expect(body).not.toContain('flick');
  });

  it('changes only the controls between devices, never what the game is or its rules', () => {
    expect(introCards('swipe')[0]).toEqual(introCards('keyboard')[0]);
    expect(introCards('buttons')[0]).toEqual(introCards('keyboard')[0]);
    expect(rules('swipe')).toBe(rules('keyboard'));
    expect(rules('buttons')).toBe(rules('keyboard'));
  });
});
