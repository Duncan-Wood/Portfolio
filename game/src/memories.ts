export interface MemoryNode {
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
        title: 'PDF Converter',
        photo: 'the-door',
        body:
          'Weekend contract work. Every file they held had to open as a PDF, and '
          + 'the data was medical.\n\n'
          + 'I built one door for all of it. It reads the first few bytes to tell '
          + 'what it was handed, and gives back a PDF, with the tests to prove it '
          + 'was safe.\n\n'
          + 'I told my boss you could build a whole business on it. A year on, it '
          + 'still runs for about two dollars a month.'
      },
      {
        title: 'Update Detector',
        photo: 'the-table',
        body:
          'A crawler proposed changes to our asset records, and nobody could check '
          + 'them before they went in. About a month into the job, I was asked to '
          + 'build the checking tool.\n\n'
          + 'I started from an empty repo. A table of proposed changes: open a row, '
          + 'see the old value next to the machine’s guess, then accept, reject or '
          + 'edit. I kept the guess next to every correction.\n\n'
          + 'I was the lead developer. The data team used it daily, and I kept '
          + 'improving it for more than a year.'
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
      {
        title: 'Theta',
        photo: 'the-theta',
        body:
          'I adopted a jumping spider from a former colleague. His name is Theta.\n\n'
          + 'I built him an enclosure, and he gets fat mealworms, fresh spritzes of '
          + 'water and as much to climb as I can give him.\n\n'
          + 'Spiders grow by shedding their skin. I bought a macro lens to photograph '
          + 'him.'
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
          + 'Now I captain a FRAY League team on Thursday nights. I was nervous about '
          + 'it. We are undefeated so far, and we shut out the former champions. I made '
          + 'the team a lineup app that draws each inning’s field.'
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
          + 'I have swapped its parts out several times since, and liked it every '
          + 'time. It taught me that if I start with a plan and follow it to the end, '
          + 'I can finish what I set out to do. Engineering started there for me.'
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

export function collectableAt(index: number): MemoryNode | null {
  return nodeAt(index)?.node ?? null;
}

export function collectionEntries(): MemoryNode[] {
  return CHAPTERS.flatMap((chapter) => chapter.nodes);
}

export const MEMORY_SIGNATURE = [
  FRAGMENT_COUNT,
  ...CHAPTERS.flatMap((chapter) => chapter.nodes.map((node) => node.title)),
].join('|');
