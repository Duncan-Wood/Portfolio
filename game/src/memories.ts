export interface MemoryNode {
  title: string;
  body: string;
  photo?: string;
}

export interface Chapter {
  title: string;
  nodes: MemoryNode[];
  butterfly?: MemoryNode;
}

export const CHAPTERS: Chapter[] = [
  {
    title: 'Now',
    nodes: [
      {
        title: 'Mighty Crow',
        photo: 'the-crow',
        body:
          'A contract I took while I still had the day job. They needed documents '
          + 'converted, and the data was medical.\n\n'
          + 'I wrote the service, costed it against the commercial options, and '
          + 'shipped it with the tests to prove it was safe.\n\n'
          + 'It runs for a few dollars a month. Nobody else to hand it to, which '
          + 'turned out to be the appeal.'
      },
      {
        title: 'Seventy Customers',
        photo: 'the-map',
        body:
          'The team that built EcoMap’s first platform left within about six months. '
          + 'Seventy companies were using it. I was what was left.\n\n'
          + 'I ran it for two years, then moved every one of them onto what replaced '
          + 'it and turned it off.\n\n'
          + 'You learn a system best by being the only one holding it.'
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
    butterfly: {
      title: 'Mise En Place',
      body:
        'I graduated into a pandemic. No ceremony, nobody around. So I started a '
        + 'group and named it after the cooking term: everything in its place before '
        + 'you begin.\n\n'
        + 'We met to show each other what we were making. Mine was a script about '
        + 'Melee that I worked on for two years and never finished.\n\n'
        + 'The group kept going anyway. That turned out to be the thing I made.'
    },
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
    butterfly: {
      title: 'The Speech',
      body:
        'Oratorical Declamation. The same speech about white privilege, competition '
        + 'after competition.\n\n'
        + 'I lost most of them. I learned what redlining was, and white flight, and '
        + 'how little I had known.\n\n'
        + 'Saying a thing out loud enough times is how I found out I meant it.'
    },
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
          + 'I still play games with friends on it.'
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

export function butterflyIndex(chapterIndex: number): number {
  return FRAGMENT_COUNT + chapterIndex;
}

export function collectableAt(index: number): MemoryNode | null {
  if (index < 0) {
    return null;
  }

  if (index < FRAGMENT_COUNT) {
    return nodeAt(index)!.node;
  }

  return CHAPTERS[index - FRAGMENT_COUNT]?.butterfly ?? null;
}

export function collectionEntries(): MemoryNode[] {
  const empty = { title: '', body: '' };

  return [
    ...CHAPTERS.flatMap((chapter) => chapter.nodes),
    ...CHAPTERS.map((chapter) => chapter.butterfly ?? empty),
  ];
}

export const MEMORY_SIGNATURE = [
  FRAGMENT_COUNT,
  ...CHAPTERS.flatMap((chapter) => chapter.nodes.map((node) => node.title)),
].join('|');
