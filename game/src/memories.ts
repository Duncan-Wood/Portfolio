interface MemoryNode {
  title: string;
  body: string;
  photo?: string;
}

export interface Memory {
  title: string;
  nodes: MemoryNode[];
}

export const MEMORIES: Memory[] = [
  {
    title: 'Things I Kept',
    nodes: [
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
      {
        title: 'The Laptop',
        photo: 'the-laptop',
        body:
          'My mom’s old MacBook. Slow enough to be annoying, good enough to get me '
          + 'through a bootcamp. It is where I learned to actually build software.\n\n'
          + 'Tools have always carried me further than I can go alone. Claude writes '
          + 'code faster than I ever will.\n\n'
          + 'Some of what is committed here I could not explain yet. There is more I '
          + 'want to build than I have time for, so I keep using it.'
      },
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
];

export const FRAGMENT_COUNT = MEMORIES.reduce(
  (total, memory) => total + memory.nodes.length,
  0,
);

export const MEMORY_SIGNATURE = [
  FRAGMENT_COUNT,
  ...MEMORIES.flatMap((memory) => memory.nodes.map((node) => node.title)),
].join('|');
