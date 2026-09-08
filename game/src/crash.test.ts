import { describe, expect, it } from 'vitest';
import { CrashLog, crashSignature, looksLikeDsn, reportingEnabled } from './crash';

describe('whether a crash is reported at all', () => {
  it('reports when a production build has somewhere to send it', () => {
    expect(reportingEnabled('https://key@sentry.io/1', true)).toBe(true);
  });

  it('stays quiet in development, so local crashes never reach the dashboard', () => {
    expect(reportingEnabled('https://key@sentry.io/1', false)).toBe(false);
  });

  it('stays quiet when nobody configured a destination', () => {
    expect(reportingEnabled(undefined, true)).toBe(false);
    expect(reportingEnabled('', true)).toBe(false);
    expect(reportingEnabled('   ', true)).toBe(false);
  });
});

describe('naming a crash', () => {
  it('names an error by its type and message', () => {
    expect(crashSignature(new RangeError('cell 3,7 is taken'))).toBe('RangeError: cell 3,7 is taken');
  });

  it('copes with something thrown that was never an error', () => {
    expect(crashSignature('just a string')).toBe('just a string');
    expect(crashSignature(null)).toBe('null');
  });
});

describe('the crash log', () => {
  it('treats the first sighting of a fault as new', () => {
    expect(new CrashLog().firstSighting(new Error('boom'))).toBe(true);
  });

  it('does not report the same fault twice, however often a frame repeats it', () => {
    const log = new CrashLog();
    log.firstSighting(new Error('boom'));

    expect(log.firstSighting(new Error('boom'))).toBe(false);
    expect(log.firstSighting(new Error('boom'))).toBe(false);
  });

  it('still reports a different fault after one it has already seen', () => {
    const log = new CrashLog();
    log.firstSighting(new Error('boom'));

    expect(log.firstSighting(new Error('a different boom'))).toBe(true);
  });

  it('separates faults that share a message but not a type', () => {
    const log = new CrashLog();
    log.firstSighting(new RangeError('taken'));

    expect(log.firstSighting(new TypeError('taken'))).toBe(true);
  });
});

describe('recognising a Sentry DSN', () => {
  const REAL = 'https://b822c40c02f0075b1cc91d67d2f48ea4@o4511803623211008.ingest.us.sentry.io/4512052958527488';

  it('accepts the shape Sentry actually hands out', () => {
    expect(looksLikeDsn(REAL)).toBe(true);
  });

  it('rejects the security token, which is the easiest thing to copy by mistake', () => {
    expect(looksLikeDsn('ba4829e2abcf11f1a389b27684b0e8d2')).toBe(false);
  });

  it('rejects a URL with no public key in front of the host', () => {
    expect(looksLikeDsn('https://o4511803623211008.ingest.us.sentry.io/4512052958527488')).toBe(false);
  });

  it('rejects a URL with no project id after the host', () => {
    expect(looksLikeDsn('https://b822c40c@o4511803623211008.ingest.us.sentry.io/')).toBe(false);
  });

  it('rejects something that is not a URL at all', () => {
    expect(looksLikeDsn('paste your dsn here')).toBe(false);
    expect(looksLikeDsn('')).toBe(false);
  });
});
