import { describe, expect, it } from 'vitest';
import { codeFromQuery, gateOpens, gateRequired } from './gate';

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

describe('a code carried in the link', () => {
  it('reads the code a shared link brings', () => {
    expect(codeFromQuery('?code=a-code')).toBe('a-code');
  });

  it('ignores whatever else rides along', () => {
    expect(codeFromQuery('?utm_source=mail&code=a-code')).toBe('a-code');
  });

  it('decodes what the browser encoded', () => {
    expect(codeFromQuery('?code=two%20words')).toBe('two words');
  });

  it('finds nothing in a plain link', () => {
    expect(codeFromQuery('')).toBeNull();
    expect(codeFromQuery('?something=else')).toBeNull();
  });

  it('treats an empty code as nothing, so the form still shows', () => {
    expect(codeFromQuery('?code=')).toBeNull();
    expect(codeFromQuery('?code=%20%20')).toBeNull();
  });

  it('opens the gate only when the carried code is the right one', () => {
    const carried = codeFromQuery('?code=a-code');

    expect(carried !== null && gateOpens(carried, 'a-code')).toBe(true);
    expect(carried !== null && gateOpens(carried, 'another-code')).toBe(false);
  });
});
