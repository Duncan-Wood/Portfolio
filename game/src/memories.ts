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
          'A full tower, built from parts at fourteen, still running today. '
          + 'It opened a door outward and made it easier never to use one. '
          + 'The same machine a person hides behind is the one they build on.',
      },
      {
        title: 'No Johns',
        photo: 'no-johns',
        body:
          'A GameCube controller, worn smooth from years of playing alone. '
          + 'Melee has a name for the excuse you make after losing. The name is a john. '
          + 'Some rooms refuse to let anyone finish that sentence.',
      },
      {
        title: 'The Laptop',
        photo: 'the-laptop',
        body:
          'A handed-down MacBook, slow enough to be frustrating and good enough '
          + 'to finish a bootcamp on. Every tool that carries someone is one they '
          + 'can lean on until they stop walking. A tool becomes a crutch the moment '
          + 'it cannot be put down.',
      },
      {
        title: 'The Red Kickball',
        photo: 'the-kickball',
        body:
          'A rubber kickball, from three years of Sunday leagues in a city where '
          + 'he knew nobody. The friends came from showing up to a game no one was '
          + 'good at. Belonging is rarely the reward for being impressive.',
      },
      {
        title: 'The Notebook',
        photo: 'the-notebook',
        body:
          'A notebook, and a pen good enough to make writing feel deliberate. '
          + 'Everything else within reach offers unlimited material and quietly '
          + 'takes the choosing away. A blank page is a limit, and limits are where '
          + 'original work has always come from.',
      },
    ],
    question: 'What have you been putting off?',
  },
];

export const FRAGMENT_COUNT = MEMORIES.reduce(
  (total, memory) => total + memory.nodes.length,
  0,
);
