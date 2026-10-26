import { describe, expect, it } from 'vitest';
import { type IntroControls, introCards } from './intro';

describe('the cards that open a first run', () => {
  it('says what Connected is before it says how to play', () => {
    const cards = introCards('keyboard');

    expect(cards).toHaveLength(2);
    expect(cards[0].title).toBe('Connected');
    expect(cards[1].title).toBe('how to play');
  });
});

describe('telling a player the memories can be read', () => {
  it('says so on the first card, without naming a key', () => {
    const body = introCards('keyboard')[0].body;

    expect(body).toContain('read');
    expect(body).not.toMatch(/\b(esc|escape)\b/i);
  });
});

describe('the controls a player is told about', () => {
  const rules = (controls: IntroControls): string => introCards(controls)[1].body.split('\n\n')[0];

  it('gives a keyboard player the rules and no key list', () => {
    const body = introCards('keyboard')[1].body;

    expect(body).toContain('Match four');
    expect(body).not.toContain('←');
    expect(body).not.toContain('space');
  });

  it('tells a swipe player what to do with a finger, not which keys to press', () => {
    const body = introCards('swipe')[1].body;

    expect(body).toContain('tap');
    expect(body).toContain('flick');
    expect(body).not.toContain('space');
  });

  it('changes only the controls between devices, never what the game is or its rules', () => {
    expect(introCards('swipe')[0]).toEqual(introCards('keyboard')[0]);
    expect(rules('swipe')).toBe(rules('keyboard'));
  });
});
