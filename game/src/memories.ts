interface MemoryNode {
  title: string;
  body: string;
  photo?: string;
}

export interface Memory {
  title: string;
  nodes: MemoryNode[];
  question: string;
}

export const MEMORIES: Memory[] = [
  {
    title: 'Things I Kept',
    nodes: [
      {
        title: 'The Build',
        photo: 'the-build',
        body:
          'My grandparents bought the parts one Christmas. I was fourteen. '
          + 'I put it together myself and it still runs.\n\n'
          + 'It was the first thing I made that worked. It was also where I went '
          + 'to stop talking to anyone.',
      },
      {
        title: 'No Johns',
        photo: 'no-johns',
        body:
          'I played alone for years. Then a friend pulled me into the Melee '
          + 'community and I started to grind.\n\n'
          + 'Melee has a word for the excuse you make after you lose. A john. '
          + 'You do not get to john.\n\n'
          + 'We still meet up every year.',
      },
      {
        title: 'The Laptop',
        photo: 'the-laptop',
        body:
          'My mom’s old MacBook. Slow enough to be annoying, good enough to get '
          + 'me through a bootcamp. It is where I learned to actually build software.\n\n'
          + 'I still lean on tools that carry me further than I could go alone. '
          + 'I keep this one because I could start over on it if I had to.',
      },
      {
        title: 'The Red Kickball',
        photo: 'the-kickball',
        body:
          'I moved to DC three years ago and knew nobody. Someone invited me to '
          + 'Sunday kickball.\n\n'
          + 'I was not good at it. Nobody was.\n\n'
          + 'Three of those teams have asked me to captain.',
      },
      {
        title: 'The Notebook',
        photo: 'the-notebook',
        body:
          'A notebook, and a pen nice enough that I slow down for it.\n\n'
          + 'Everything else I own hands me more material than I can use. This '
          + 'gives me nothing. Only what I can get out of my own head, which is '
          + 'less than I want it to be.\n\n'
          + 'Most of what is in it is unfinished.',
      },
    ],
    question: 'What have you been putting off?',
  },
];

export const FRAGMENT_COUNT = MEMORIES.reduce(
  (total, memory) => total + memory.nodes.length,
  0,
);
