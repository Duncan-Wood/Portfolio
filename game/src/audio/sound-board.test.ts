import { describe, expect, it } from 'vitest';
import { SoundBoard } from './sound-board';
import { type Voice } from './voices';

class FakeNode {
  readonly outputs: FakeNode[] = [];
  readonly gain = fakeParam();
  readonly pan = fakeParam();
  readonly frequency = fakeParam();
  readonly threshold = fakeParam();
  readonly knee = fakeParam();
  readonly ratio = fakeParam();
  readonly attack = fakeParam();
  readonly release = fakeParam();
  type = 'sine';

  constructor(readonly kind: string) {}

  connect(target: FakeNode): FakeNode {
    this.outputs.push(target);
    return target;
  }

  start(): void {}
  stop(): void {}
}

function fakeParam() {
  return {
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  };
}

class FakeContext {
  state: AudioContextState = 'running';
  currentTime = 0;
  readonly destination = new FakeNode('destination');
  readonly nodes: FakeNode[] = [];

  private make(kind: string): FakeNode {
    const node = new FakeNode(kind);
    this.nodes.push(node);
    return node;
  }

  createOscillator() { return this.make('oscillator'); }
  createGain() { return this.make('gain'); }
  createStereoPanner() { return this.make('panner'); }
  createDynamicsCompressor() { return this.make('compressor'); }
  resume(): Promise<void> {
    this.state = 'running';
    return Promise.resolve();
  }
}

const plain: Voice = {
  waveform: 'sine', startFrequency: 440, endFrequency: 440, duration: 100, gain: 0.1, delay: 0,
};

function unlockedBoard() {
  const context = new FakeContext();
  const board = new SoundBoard(() => context as unknown as AudioContext);
  board.unlock();
  return { board, context };
}

function reachable(from: FakeNode): FakeNode[] {
  return [from, ...from.outputs.flatMap(reachable)];
}

describe('the sound board routing', () => {
  it('sends every voice through one compressor before the speakers', () => {
    const { board, context } = unlockedBoard();

    board.play(plain);
    board.play({ ...plain, pan: -0.5 });

    const oscillators = context.nodes.filter((node) => node.kind === 'oscillator');
    expect(oscillators).toHaveLength(2);
    for (const oscillator of oscillators) {
      const path = reachable(oscillator).map((node) => node.kind);
      expect(path.at(-1)).toBe('destination');
      expect(path.filter((kind) => kind === 'compressor')).toHaveLength(1);
    }

    const compressors = context.nodes.filter((node) => node.kind === 'compressor');
    expect(compressors).toHaveLength(1);
  });

  it('never connects a voice straight to the speakers', () => {
    const { board, context } = unlockedBoard();

    board.play(plain);
    board.play({ ...plain, pan: 0.5 });

    const feedsSpeakers = context.nodes
      .filter((node) => node.outputs.includes(context.destination))
      .map((node) => node.kind);
    expect(feedsSpeakers).toEqual(['compressor']);
  });

  it('builds the chain once however many voices play', () => {
    const { board, context } = unlockedBoard();

    for (let voice = 0; voice < 20; voice++) {
      board.play(plain);
    }

    expect(context.nodes.filter((node) => node.kind === 'compressor')).toHaveLength(1);
  });

  it('plays nothing until the context is running', () => {
    const context = new FakeContext();
    context.state = 'suspended';
    const board = new SoundBoard(() => context as unknown as AudioContext);
    board.unlock();

    board.play(plain);

    expect(context.nodes.filter((node) => node.kind === 'oscillator')).toHaveLength(0);
  });
});
