import { describe, expect, it } from 'vitest';
import {
  CHAPTERS,
  FRAGMENT_COUNT,
  collectableAt,
  collectionEntries,
  nodeAt,
} from './memories';
import { LOCKS } from './engine/locks';
import { MEMORY_PICTURES, TRANSCRIPT_PICTURE } from './memory-pictures';
import { fitsReader, linesNeeded, pictureDisplayHeight } from './reader-fit';

describe('the memories', () => {
  it('has at least one to pay out', () => {
    expect(CHAPTERS.length).toBeGreaterThan(0);
  });

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

  it('has a fragment count the contact form can divide by', () => {
    expect(FRAGMENT_COUNT).toBeGreaterThan(0);
  });

  it('has a picture for every memory, since the found row drops one without', () => {
    for (const chapter of CHAPTERS) {
      for (const node of chapter.nodes) {
        expect(node.photo, node.title).toBeDefined();
        expect(MEMORY_PICTURES[node.photo!], node.photo).toBeDefined();
      }
    }
  });

  it('keeps every card on screen, between the top and the found row', () => {
    for (const chapter of CHAPTERS) {
      for (const node of chapter.nodes) {
        const art = MEMORY_PICTURES[node.photo!];
        const picture = pictureDisplayHeight(art?.columns, art?.rows.length);

        expect(fitsReader(picture, linesNeeded(node.body)), node.title).toBe(true);
      }
    }
  });
});

describe('where the memories come from', () => {
  const titlesIn = (place: string) => (
    CHAPTERS.find((chapter) => chapter.title === place)!.nodes.map((node) => node.title)
  );

  it('keeps No Johns in Illinois, where the friend’s house was', () => {
    expect(titlesIn('Illinois')).toContain('No Johns');
    expect(titlesIn('Florida')).not.toContain('No Johns');
  });

  it('gives Florida the Writing Center', () => {
    expect(titlesIn('Florida')).toEqual(['The Writing Center']);
  });

  it('draws the Writing Center as the coded transcript', () => {
    const card = CHAPTERS.flatMap((chapter) => chapter.nodes).find((node) => node.title === 'The Writing Center')!;

    expect(card.photo).toBe(TRANSCRIPT_PICTURE);
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
