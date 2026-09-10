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
          'I was lucky. My grandparents bought the parts one Christmas when I was '
          + 'fourteen. I put it together myself and it still runs.\n\n'
          + 'Freshman year had scattered everyone I knew into new groups, and I spent '
          + 'most of that year alone in front of this thing.\n\n'
          + 'It is also where I found Dota. I am still in that community today.'
      },
      {
        title: 'No Johns',
        photo: 'no-johns',
        body:
          'I had Melee as a kid and nobody to play it with. I did not touch it again '
          + 'until I was eighteen, at Charlie’s house, five hours in one sitting.\n\n'
          + 'I had judged him on the way in — the cigarettes, the beer, the routine of '
          + 'it. I was wrong. Over the next three years he quit.\n\n'
          + 'Melee has a word for the excuse you make after you lose. A john. You do '
          + 'not get to john. I learned that properly from someone who stopped making '
          + 'them.\n\n'
          + 'I do not see Charlie much now. I am still in that community.'
      },
      {
        title: 'The Laptop',
        photo: 'the-laptop',
        body:
          'My mom’s old MacBook. Slow enough to be annoying, good enough to get me '
          + 'through a bootcamp. It is where I learned to actually build software.\n\n'
          + 'Tools have always been able to carry me further than I can go alone, and '
          + 'for a while I let them. Claude writes code faster than I ever will.\n\n'
          + 'So now I write the test first and read every line before it ships. This is '
          + 'still the machine I could start over on.'
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
          + 'Most of what is in it is unfinished, and I have stopped minding. The point '
          + 'was never the pages. It is that I keep opening it.'
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
