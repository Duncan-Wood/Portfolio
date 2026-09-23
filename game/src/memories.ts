interface MemoryNode {
  title: string;
  body: string;
  photo?: string;
}

export interface Chapter {
  title: string;
  nodes: MemoryNode[];
}

export const CHAPTERS: Chapter[] = [
  {
    title: 'Now',
    nodes: [
      {
        title: 'The Notebook',
        photo: 'the-notebook',
        body:
          'A notebook, and a pen nice enough that I slow down for it.\n\n'
          + 'Everything else I own hands me more material than I can use. This gives me '
          + 'nothing. Only what I can get out of my own head.\n\n'
          + 'Most of what is in it is unfinished, and I have stopped minding. I keep '
          + 'opening it.'
      },
    ],
  },
  {
    title: 'Washington, DC',
    nodes: [
      {
        title: 'The Kickball',
        photo: 'the-kickball',
        body:
          'I moved to DC three years ago and knew nobody. Someone invited me to '
          + 'Sunday kickball. Stonewall.\n\n'
          + 'I was not good at it. Nobody was. That turned out to be the point.\n\n'
          + 'My original team asked me to captain two seasons running, and then a FRAY '
          + 'League team asked too. Three years ago I did not know a single person here.'
      },
      {
        title: 'The Laptop',
        photo: 'the-laptop',
        body:
          'My mom’s old MacBook. Slow enough to be annoying, good enough to get me '
          + 'through a bootcamp.\n\n'
          + 'It is where I learned to actually build software, one error message at '
          + 'a time.\n\n'
          + 'I still open it when I want to learn something from the ground up.'
      },
    ],
  },
  {
    title: 'Florida',
    nodes: [
      {
        title: 'No Johns',
        photo: 'no-johns',
        body:
          'I had Melee as a kid and nobody to play it with. I did not touch it again '
          + 'until I was eighteen, at a friend’s house.\n\n'
          + 'Melee has a word for the excuse you make after you lose. A john. You do '
          + 'not get to john.\n\n'
          + 'The community they handed me is still mine.'
      },
    ],
  },
  {
    title: 'Illinois',
    nodes: [
      {
        title: 'The Hat',
        photo: 'the-hat',
        body:
          'Bought in Corpus Christi on a family vacation, with a pair of steel-toed '
          + 'boots.\n\n'
          + 'I wore it to an audition for a sheriff I did not expect to be cast as, '
          + 'and was.\n\n'
          + 'I don’t have it anymore. I kept the part where I could speak as someone '
          + 'else.'
      },
      {
        title: 'The Build',
        photo: 'the-build',
        body:
          'My grandparents bought the parts one Christmas when I was fourteen. I put '
          + 'it together myself.\n\n'
          + 'Freshman year of high school scattered everyone I knew. I spent most of '
          + 'that year alone in front of it. Alone is the wrong word. Dota was on it, '
          + 'and so were people I have known for thirteen years.\n\n'
          + 'It still runs.'
      },
    ],
  },
];

export interface NodeLocation {
  chapterIndex: number;
  nodeIndex: number;
  node: MemoryNode;
}

export function nodeAt(found: number): NodeLocation | null {
  let remaining = found;

  for (let chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex += 1) {
    const { nodes } = CHAPTERS[chapterIndex];
    if (remaining < nodes.length) {
      return { chapterIndex, nodeIndex: remaining, node: nodes[remaining] };
    }
    remaining -= nodes.length;
  }

  return null;
}

export const FRAGMENT_COUNT = CHAPTERS.reduce(
  (total, chapter) => total + chapter.nodes.length,
  0,
);

export const MEMORY_SIGNATURE = [
  FRAGMENT_COUNT,
  ...CHAPTERS.flatMap((chapter) => chapter.nodes.map((node) => node.title)),
].join('|');
