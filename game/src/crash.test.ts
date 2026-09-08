import { describe, expect, it } from 'vitest';
import { CrashLog, crashSignature, reportingEnabled } from './crash';

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
