/*
 * What a memory is, and the ones the game knows.
 *
 * Plain data with no imports, like `tuning.ts`, so the words are separable from
 * everything that draws them and a rewrite touches nothing else.
 *
 * A memory is a CONSTELLATION, not a page. The storyboard drew it that way from
 * the start — `memory-1-high-school` is a set of vignettes wired together — and
 * it arrives one node at a time, earned, over a board that is held rather than
 * left behind. The first version handed all of it over at once in a scene of
 * its own; that made a memory something the player was shown instead of
 * something that happened to the run they were in.
 *
 * On the words: they are MINE, verbatim, and that is the point rather than a
 * shortcut. The pass before this one was a compression of the same events into
 * a clipped literary register — "it was a place to not be", "everything after
 * it is downstream" — and it read as out of place because it was: those were
 * somebody else's sentences about my life. This ships publicly under my own
 * name, so a paraphrase of my hardest year going into the history as my own
 * words is worse than shipping something obviously unfinished.
 *
 * What that costs is compression. These lines are plainer and longer than the
 * ones they replaced, and one of them is about being stuck on a Sudoku. That is
 * the trade, and it is the right way round: a real voice with the volume down
 * beats an invented one with the volume up.
 *
 * Only spelling has been touched. Nothing has been tightened, and nothing
 * should be without him.
 *
 * A fifth line closed this off — "I began to see another way of living that
 * allowed me to shine through the darkness." It is a good sentence and it is
 * cut on purpose: arriving as the last thing you earn, it tied the memory in a
 * bow the player had done nothing to deserve. "My Voice" ends it now, on
 * something discovered rather than something concluded.
 */

export interface MemoryNode {
  /** Two or three words. It is a label on a node, not a heading. */
  title: string;
  body: string;
}

export interface Memory {
  title: string;
  nodes: MemoryNode[];
  /**
   * Earned by surfacing the memory's last fragment, and the only place the game
   * speaks to the person holding the keyboard rather than to a visitor in
   * someone's head.
   *
   * Never scored, never validated, never branched on. It is asked and then it
   * sits there — the whole effect depends on the game wanting nothing back.
   */
  question: string;
}

/**
 * Where a node sits in the constellation, as a fraction of the box drawing it.
 *
 * Staggered rather than strung out in a line, so the run between two nodes has
 * to turn a corner and the shape reads as a circuit rather than a list.
 *
 * A fraction rather than pixels because the panel that draws it is narrow and
 * the box it lives in is a layout decision, not a property of the memory.
 */
export function nodeLayout(index: number, count: number): { x: number; y: number } {
  return {
    x: index % 2 === 0 ? 0.15 : 0.65,
    y: (index + 0.5) / count,
  };
}

export const MEMORIES: Memory[] = [
  {
    title: 'High School',
    nodes: [
      {
        title: 'The Build',
        body:
          'When I was 14 I was fortunate enough to have the opportunity to build a gaming PC.',
      },
      {
        title: 'Bell Work',
        body:
          'I got frustrated in a tech class because I couldn\'t figure out '
          + 'the Sudoku bell work fast enough.',
      },
      {
        title: 'The Hat',
        body: 'I auditioned to be a sheriff in a play and wore a cowboy hat.',
      },
      {
        title: 'My Voice',
        body:
          'I found my voice in performing in Theatre and Speech competitions and '
          + 'discovered how important meaningful connections are. '
          + 'I didn\'t know what I was missing.',
      },
    ],
    question: 'What have you been putting off?',
  },
];
