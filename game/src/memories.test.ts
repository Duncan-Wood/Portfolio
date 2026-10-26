import { describe, expect, it } from 'vitest';
import {
  CHAPTERS,
  FRAGMENT_COUNT,
  MEMORY_SIGNATURE,
  collectableAt,
  collectionEntries,
  nodeAt,
  signatureOf,
  type Chapter,
} from './memories';
import { LOCKS } from './engine/locks';
import { MEMORY_PICTURES } from './memory-pictures';
import { READER_MAX_LINES, linesNeeded } from './reader-fit';

describe('the memories', () => {
  it('gives every chapter a place to name and nodes to connect', () => {
    for (const chapter of CHAPTERS) {
      expect(chapter.title).not.toBe('');
      expect(chapter.nodes.length).toBeGreaterThan(0);
    }
  });

  it('gives every chapter a difficulty of its own', () => {
    expect(LOCKS.length).toBeGreaterThanOrEqual(CHAPTERS.length);
  });

  it('keeps node titles short enough to sit on a node rather than read as prose', () => {
    for (const chapter of CHAPTERS) {
      for (const node of chapter.nodes) {
        expect(node.title.length).toBeLessThanOrEqual(24);
        expect(node.body).not.toBe('');
      }
    }
  });

  it('has a picture for every memory, since the found row drops one without', () => {
    for (const chapter of CHAPTERS) {
      for (const node of chapter.nodes) {
        expect(node.photo, node.title).toBeDefined();
        expect(MEMORY_PICTURES[node.photo!], node.photo).toBeDefined();
      }
    }
  });

  it('keeps every card to the same number of lines or fewer, so each takes the same room', () => {
    for (const chapter of CHAPTERS) {
      for (const node of chapter.nodes) {
        expect(linesNeeded(node.body), node.title).toBeLessThanOrEqual(READER_MAX_LINES);
      }
    }
  });
});

describe('nodeAt walks the chapters in order', () => {
  it('reaches every node once, chapter by chapter', () => {
    const walked = [];
    for (let found = 0; found < FRAGMENT_COUNT; found += 1) {
      walked.push(nodeAt(found)!);
    }

    expect(walked.map((at) => at.node.title)).toEqual(
      CHAPTERS.flatMap((chapter) => chapter.nodes.map((node) => node.title)),
    );
    expect(walked.map((at) => at.chapterIndex)).toEqual(
      CHAPTERS.flatMap((chapter, index) => chapter.nodes.map(() => index)),
    );
  });

  it('opens each chapter at node zero, which is when its title is announced', () => {
    let found = 0;
    for (const chapter of CHAPTERS) {
      expect(nodeAt(found)!.nodeIndex).toBe(0);
      found += chapter.nodes.length;
    }
  });

  it('runs out once every node is found', () => {
    expect(nodeAt(FRAGMENT_COUNT)).toBeNull();
    expect(nodeAt(FRAGMENT_COUNT + 99)).toBeNull();
  });
});

describe('the collection a player reads from the pause screen', () => {
  it('reaches every memory at the index its find was logged under', () => {
    for (let found = 0; found < FRAGMENT_COUNT; found += 1) {
      expect(collectableAt(found)).toBe(nodeAt(found)!.node);
    }
  });

  it('has nothing at an index no memory answers to', () => {
    expect(collectableAt(-1)).toBeNull();
    expect(collectableAt(FRAGMENT_COUNT)).toBeNull();
  });

  it('lists an entry for every index, so a row can be drawn from it', () => {
    expect(collectionEntries()).toHaveLength(FRAGMENT_COUNT);
  });
});

describe('the signature that tells saved progress it belongs to these memories', () => {
  const chapters = (...groups: { title: string; photo?: string }[][]): Chapter[] => groups.map((nodes, index) => ({
    title: `Chapter ${index}`,
    nodes: nodes.map((node) => ({ ...node, body: 'body' })),
  }));

  const door = { title: 'PDF Converter', photo: 'the-door' };
  const hat = { title: 'The Hat', photo: 'the-hat' };
  const build = { title: 'The Build', photo: 'the-build' };

  it('stays the same when a title or a body is reworded, so a typo fix erases nobody\'s run', () => {
    const before = chapters([door, hat], [build]);
    const after = chapters([{ ...door, title: 'PDF Convertor' }, { ...hat, title: 'The hat' }], [build]);

    expect(signatureOf(after)).toBe(signatureOf(before));
  });

  it('changes when two memories swap places, since progress is kept by position', () => {
    expect(signatureOf(chapters([hat, door], [build]))).not.toBe(signatureOf(chapters([door, hat], [build])));
  });

  it('changes when a memory is added or removed', () => {
    const base = signatureOf(chapters([door, hat]));

    expect(signatureOf(chapters([door, hat, build]))).not.toBe(base);
    expect(signatureOf(chapters([door]))).not.toBe(base);
  });

  it('changes when a memory moves from one chapter to another, since each chapter has its own lock', () => {
    expect(signatureOf(chapters([door], [hat, build]))).not.toBe(signatureOf(chapters([door, hat], [build])));
  });

  it('changes when a memory is swapped for a different one, even at the same position', () => {
    expect(signatureOf(chapters([door, hat]))).not.toBe(signatureOf(chapters([door, build])));
  });

  it('refuses a memory with no picture key, rather than tracking it as the word undefined', () => {
    expect(() => signatureOf(chapters([door, { title: 'No Picture' }]))).toThrow('No Picture');
  });

  it('is the one the game really uses, built from every real memory', () => {
    expect(MEMORY_SIGNATURE).toBe(signatureOf(CHAPTERS));
  });
});
