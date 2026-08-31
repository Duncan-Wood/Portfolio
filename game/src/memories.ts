/*
 * What a memory is, and the ones the game knows.
 */

interface MemoryNode {
  /** Two or three words. */
  title: string;
  body: string;
  /**
   * A photograph of this in `public/memories/`, without its extension. Optional:
   * a fragment without one shows its words alone.
   */
  photo?: string;
}

export interface Memory {
  title: string;
  nodes: MemoryNode[];
  /**
   * Never scored, never validated, never branched on. The effect depends on the
   * game wanting nothing back.
   */
  question: string;
}

export const MEMORIES: Memory[] = [
  {
    title: 'High School',
    nodes: [
      {
        title: 'The Build',
        photo: 'the-build',
        body:
          'When I was 14 I was fortunate enough to have the opportunity to build a gaming PC.',
      },
      {
        title: 'Bell Work',
        photo: 'bell-work',
        body:
          'I got frustrated in a tech class because I couldn\'t figure out '
          + 'the Sudoku bell work fast enough.',
      },
      {
        title: 'The Hat',
        photo: 'the-hat',
        body: 'I auditioned to be a sheriff in a play and wore a cowboy hat.',
      },
      {
        title: 'My Voice',
        photo: 'my-voice',
        body:
          'I found my voice in performing in Theatre and Speech competitions and '
          + 'discovered how important meaningful connections are. '
          + 'I didn\'t know what I was missing.',
      },
    ],
    question: 'What have you been putting off?',
  },
];
