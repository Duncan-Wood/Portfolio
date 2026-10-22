import { describe, expect, it } from 'vitest';
import { webglSupported } from './webgl-support';

const canvasOffering = (kinds: string[]) => ({
  getContext: (kind: string) => (kinds.includes(kind) ? {} : null),
}) as unknown as HTMLCanvasElement;

describe('whether this browser can run the game', () => {
  it('can when it offers WebGL 2', () => {
    expect(webglSupported(() => canvasOffering(['webgl2']))).toBe(true);
  });

  it('can when it offers only the older WebGL', () => {
    expect(webglSupported(() => canvasOffering(['webgl']))).toBe(true);
  });

  it('cannot when it offers neither, as with WebGL switched off or no graphics support', () => {
    expect(webglSupported(() => canvasOffering([]))).toBe(false);
  });

  it('cannot when asking for a context throws, as some locked-down browsers do', () => {
    const throwing = {
      getContext: () => {
        throw new Error('blocked');
      },
    } as unknown as HTMLCanvasElement;

    expect(webglSupported(() => throwing)).toBe(false);
  });
});
