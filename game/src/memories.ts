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
          'Weekend contract work. Every file had to open as a PDF, and the data '
          + 'was medical.\n\n'
          + 'I built one door for all of it. It reads the first few bytes to tell '
          + 'what it is and gives back a PDF, with tests to prove it is safe.\n\n'
          + 'I told my boss you could build a whole business on it. It still runs for '
          + 'about two dollars a month.'
      },
      {
        title: 'Update Detector',
        photo: 'the-review',
        body:
          'Anything an AI proposes has to pass a person before anyone should trust '
          + 'it. I built the screen where that happens, at my first software '
          + 'engineering job, in a framework I had never used.\n\n'
          + 'Almost everything about it was new, and the responsibility was big. '
          + 'I got it live in ten weeks, and the data team started using it.'
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
          'When I moved to DC I knew nobody. Someone invited me to Sunday '
          + 'kickball. Stonewall.\n\n'
          + 'I was not good at it. Nobody was. That turned out to be the point.'
      },
      {
        title: 'The Laptop',
        photo: 'the-laptop',
        body:
          'My mom’s old MacBook. Slow enough to be annoying, good enough to get me '
          + 'through a bootcamp.\n\n'
          + 'It is where I learned to actually build software, one error message at '
          + 'a time.\n\n'
          + 'I don’t open it much anymore. I still learn things from the ground up, '
          + 'just not on it.'
      },
    ],
  },
  {
    title: 'Florida',
    nodes: [
      {
        title: 'The Writing Center',
        photo: 'the-transcript',
        body:
          'I tutored at my university’s writing center, from ENC 1101 freshmen to PhD '
          + 'candidates. It did not matter how little I knew about the subject if we '
          + 'could find common ground.\n\n'
          + 'Often the first thing a writer said was “I’m bad at writing.” I left '
          + 'believing the job is helping someone find their own voice, not handing '
          + 'them mine.'
      },
      {
        title: 'The Notebook',
        photo: 'the-notebook',
        body:
          'A notebook, and a pen nice enough that I slow down for it.\n\n'
          + 'Everything else I own hands me more material than I can use. This gives me '
          + 'nothing. Only what I can get out of my own head.\n\n'
          + 'Mostly I journal in it. Most of it is not perfect, and I have stopped '
          + 'minding. I keep opening it.'
      },
    ],
  },
  {
    title: 'Illinois',
    nodes: [
      {
        title: 'No Johns',
        photo: 'no-johns',
        body:
          'I had Melee as a kid and nobody to play it with. I did not touch it again '
          + 'until I was eighteen, at a friend’s house.\n\n'
          + 'Melee has a word for the excuse you make after you lose. A john. You do '
          + 'not get to john.'
      },
      {
        title: 'The Hat',
        photo: 'the-hat',
        body:
          'Bought in Corpus Christi on a family vacation.\n\n'
          + 'I wore it to an audition for the sheriff in The Laramie Project, a lead I '
          + 'did not expect to get, and got.\n\n'
          + 'I don’t have it anymore. Later, as Lurch in The Addams Family, I '
          + 'improvised a swig from a wine bottle and a full theatre laughed. I had '
          + 'never felt anything like it.'
      },
      {
        title: 'The Build',
        photo: 'the-build',
        body:
          'My old laptop overheated and lagged on every game, so at fourteen I '
          + 'decided to build a PC.\n\n'
          + 'I spent months watching Linus Tech Tips and working out what to ask for. '
          + 'I said it was all I wanted that year, and they came through.\n\n'
          + 'Building it was on me. I have swapped its parts out several times since, '
          + 'and it is still the computer I built.'
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

export function signatureOf(chapters: readonly Chapter[]): string {
  return chapters
    .map((chapter) => chapter.nodes.map((node) => {
      if (node.photo === undefined) {
        throw new Error(`The memory "${node.title}" has no picture key, so saved progress cannot be matched to it`);
      }
      return node.photo;
    }).join(','))
    .join('|');
}

export const MEMORY_SIGNATURE = signatureOf(CHAPTERS);
