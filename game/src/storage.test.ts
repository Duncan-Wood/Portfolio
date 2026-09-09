import { afterEach, describe, expect, it } from 'vitest';
import { clearStored, readStored, writeStored } from './storage';

function install(value: unknown): void {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      if (value === 'refuses') {
        throw new Error('The operation is insecure.');
      }
      return value;
    },
  });
}

function allowing(): void {
  const held = new Map<string, string>();

  install({
    getItem: (key: string) => held.get(key) ?? null,
    setItem: (key: string, value: string) => held.set(key, value),
    removeItem: (key: string) => held.delete(key),
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage');
});

describe('storage a browser may refuse', () => {
  it('reads back what it wrote when the browser allows it', () => {
    allowing();

    writeStored('connected.played', 'true');
    expect(readStored('connected.played')).toBe('true');

    clearStored('connected.played');
    expect(readStored('connected.played')).toBeNull();
  });

  it('reads as absent rather than throwing when the browser blocks site data', () => {
    install('refuses');
    expect(readStored('connected.played')).toBeNull();
  });

  it('drops a write rather than throwing when the browser blocks site data', () => {
    install('refuses');
    expect(() => writeStored('connected.played', 'true')).not.toThrow();
  });

  it('drops a removal rather than throwing when the browser blocks site data', () => {
    install('refuses');
    expect(() => clearStored('connected.resume')).not.toThrow();
  });
});
