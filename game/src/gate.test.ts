import { describe, expect, it } from 'vitest';
import { gateOpens, gateRequired } from './gate';

describe('gateRequired', () => {
  it('is off when the build has no code', () => {
    expect(gateRequired(undefined)).toBe(false);
  });

  it('is off when the code is blank', () => {
    expect(gateRequired('')).toBe(false);
    expect(gateRequired('   ')).toBe(false);
  });

  it('is on once a code is set', () => {
    expect(gateRequired('a-code')).toBe(true);
  });
});

describe('gateOpens', () => {
  it('accepts the code', () => {
    expect(gateOpens('a-code', 'a-code')).toBe(true);
  });

  it('forgives case and surrounding space', () => {
    expect(gateOpens('  A-Code ', 'a-code')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(gateOpens('another-code', 'a-code')).toBe(false);
    expect(gateOpens('', 'a-code')).toBe(false);
  });

  it('never opens on a blank expected code', () => {
    expect(gateOpens('', '')).toBe(false);
    expect(gateOpens('   ', '  ')).toBe(false);
  });
});
