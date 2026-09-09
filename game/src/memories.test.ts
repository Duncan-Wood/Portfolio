import { describe, expect, it } from 'vitest';
import { FRAGMENT_COUNT, MEMORIES } from './memories';

describe('the memories', () => {
  it('has at least one to pay out', () => {
    expect(MEMORIES.length).toBeGreaterThan(0);
  });

  it('gives every memory nodes to connect and a question to end on', () => {
    for (const memory of MEMORIES) {
      expect(memory.title).not.toBe('');
      expect(memory.nodes.length).toBeGreaterThan(1);
    }
  });

  it('keeps node titles short enough to sit on a node rather than read as prose', () => {
    for (const memory of MEMORIES) {
      for (const node of memory.nodes) {
        expect(node.title.length).toBeLessThanOrEqual(24);
        expect(node.body).not.toBe('');
      }
    }
  });

  it('has a fragment count the contact form can divide by', () => {
    expect(FRAGMENT_COUNT).toBeGreaterThan(0);
  });
});
