import { describe, expect, it } from 'vitest';
import {
  BASE_POP_FREQUENCY,
  MAX_POP_FREQUENCY,
  answerVoice,
  chainVoices,
  connectionLostVoice,
  hardDropVoice,
  landVoice,
  nodeVoice,
  popVoice,
  shadowArrivalVoice,
  shadowRecedeVoice,
  shadowStruckVoice,
  topOutVoice,
} from './voices';

const everyVoice = [
  popVoice(0),
  popVoice(4),
  landVoice(),
  hardDropVoice(0),
  hardDropVoice(11),
  topOutVoice(),
  shadowArrivalVoice(),
  shadowRecedeVoice(1),
  shadowRecedeVoice(6),
  answerVoice(0),
  answerVoice(30),
  connectionLostVoice(0),
  connectionLostVoice(30),
  ...chainVoices(3),
];

describe('every voice', () => {
  it('lasts a positive amount of time', () => {
    for (const voice of everyVoice) {
      expect(voice.duration).toBeGreaterThan(0);
    }
  });

  it('stays audible and inside the hearing range', () => {
    for (const voice of everyVoice) {
      expect(voice.gain).toBeGreaterThan(0);
      expect(voice.startFrequency).toBeGreaterThan(20);
      expect(voice.endFrequency).toBeGreaterThan(20);
      expect(voice.startFrequency).toBeLessThan(20000);
      expect(voice.endFrequency).toBeLessThan(20000);
    }
  });
});

describe('the pop, which carries the chain escalation', () => {
  it('starts at the base pitch on the first link', () => {
    expect(popVoice(0).startFrequency).toBe(BASE_POP_FREQUENCY);
  });

  it('rises with every further link', () => {
    const pitches = [0, 1, 2, 3, 4].map((link) => popVoice(link).startFrequency);

    for (let index = 1; index < pitches.length; index += 1) {
      expect(pitches[index]).toBeGreaterThan(pitches[index - 1]);
    }
  });

  it('stops climbing before it leaves the hearing range', () => {
    expect(popVoice(200).startFrequency).toBe(MAX_POP_FREQUENCY);
  });
});

describe('the hard drop, which reports its own impact', () => {
  it('hits harder the further the pair fell', () => {
    expect(hardDropVoice(11).gain).toBeGreaterThan(hardDropVoice(1).gain);
  });

  it('still makes a sound when the pair had nowhere to fall', () => {
    expect(hardDropVoice(0).gain).toBeGreaterThan(0);
  });

  it('drops in pitch, the way an impact does', () => {
    const voice = hardDropVoice(6);
    expect(voice.endFrequency).toBeLessThan(voice.startFrequency);
  });
});

describe('the chain flourish', () => {
  it('stays silent for a single link, which is not a chain', () => {
    expect(chainVoices(1)).toEqual([]);
  });

  it('plays an ascending arpeggio once a real chain lands', () => {
    const pitches = chainVoices(2).map((voice) => voice.startFrequency);

    expect(pitches.length).toBeGreaterThan(1);
    for (let index = 1; index < pitches.length; index += 1) {
      expect(pitches[index]).toBeGreaterThan(pitches[index - 1]);
    }
  });

  it('reaches higher for a longer chain', () => {
    const short = chainVoices(2);
    const long = chainVoices(6);
    expect(long[long.length - 1].startFrequency).toBeGreaterThan(
      short[short.length - 1].startFrequency,
    );
  });
});

describe('the top-out', () => {
  it('falls in pitch, so it reads as a loss', () => {
    const voice = topOutVoice();
    expect(voice.endFrequency).toBeLessThan(voice.startFrequency);
  });
});

describe('the progress-track voice', () => {
  it('climbs exactly one octave across the whole loop', () => {
    const first = nodeVoice(0, 20);
    const last = nodeVoice(20, 20);

    expect(last.startFrequency).toBeCloseTo(first.startFrequency * 2);
  });

  it('rises with every pad, so pitch alone reports progress', () => {
    const pitches = Array.from({ length: 8 }, (_unused, index) =>
      nodeVoice(index, 8).startFrequency);

    const rising = pitches.every((pitch, index) => index === 0 || pitch > pitches[index - 1]);
    expect(rising).toBe(true);
  });
});

describe('the shadow', () => {
  it('arrives below everything else the game plays', () => {
    const arrival = shadowArrivalVoice();
    const others = [popVoice(0), landVoice(), nodeVoice(0, 20), ...chainVoices(3)];

    for (const voice of others) {
      expect(arrival.endFrequency).toBeLessThan(voice.startFrequency);
    }
  });

  it('falls as it arrives and rises as it is pushed back', () => {
    const arrival = shadowArrivalVoice();
    const recede = shadowRecedeVoice(1);

    expect(arrival.endFrequency).toBeLessThan(arrival.startFrequency);
    expect(recede.endFrequency).toBeGreaterThan(recede.startFrequency);
  });

  it('never drowns out the pop that pushed it back', () => {
    expect(shadowRecedeVoice(6).gain).toBeLessThan(popVoice(0).gain);
  });

  it('answers a bigger push with more of an answer', () => {
    expect(shadowRecedeVoice(3).gain).toBeGreaterThan(shadowRecedeVoice(1).gain);
  });
});

describe('answering the question', () => {
  it('climbs with every cell it drives off', () => {
    expect(answerVoice(4).startFrequency).toBeGreaterThan(answerVoice(0).startFrequency);
  });

  it('stops climbing before it walks out of the hearing range', () => {
    // A board can hold 72 shadows. Uncapped, the last of them would be inaudible.
    expect(answerVoice(72).startFrequency).toBe(answerVoice(24).startFrequency);
  });

  it('walks up rather than landing as one chord', () => {
    expect(answerVoice(3).delay).toBeGreaterThan(answerVoice(0).delay);
    expect(answerVoice(0).delay).toBe(0);
  });

  it('is louder than an ordinary clear, because it happens twice a session', () => {
    expect(answerVoice(0).gain).toBeGreaterThan(popVoice(0).gain);
  });
});

describe('losing the board', () => {
  it('falls where answering climbs — the same beat run backwards', () => {
    expect(connectionLostVoice(4).startFrequency).toBeLessThan(connectionLostVoice(0).startFrequency);
    expect(answerVoice(4).startFrequency).toBeGreaterThan(answerVoice(0).startFrequency);
  });

  it('starts where answering starts, so the two are heard as one pair', () => {
    expect(connectionLostVoice(0).startFrequency).toBe(answerVoice(0).startFrequency);
  });

  it('stops falling before it drops out of hearing', () => {
    expect(connectionLostVoice(72).startFrequency).toBe(connectionLostVoice(24).startFrequency);
    expect(connectionLostVoice(72).endFrequency).toBeGreaterThan(20);
  });
});

describe('a shadow struck but not shifted', () => {
  it('falls, where the recede voice rises', () => {
    const struck = shadowStruckVoice(1);
    const receded = shadowRecedeVoice(1);

    expect(struck.endFrequency).toBeLessThan(struck.startFrequency);
    expect(receded.endFrequency).toBeGreaterThan(receded.startFrequency);
  });

  it('sits below the recede voice rather than beside it', () => {
    expect(shadowStruckVoice(1).startFrequency).toBeLessThan(
      shadowRecedeVoice(1).startFrequency,
    );
  });

  it('stays quieter than the clear that caused it', () => {
    expect(shadowStruckVoice(4).gain).toBeLessThan(popVoice(0).gain);
  });

  it('leans on the hit a little harder when it struck several', () => {
    expect(shadowStruckVoice(4).gain).toBeGreaterThan(shadowStruckVoice(1).gain);
  });

  it('plays immediately, since it belongs to the clear that landed it', () => {
    expect(shadowStruckVoice(2).delay).toBe(0);
  });
});
