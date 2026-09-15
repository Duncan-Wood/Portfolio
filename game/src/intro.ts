export type IntroControls = 'keyboard' | 'swipe';

export interface IntroCard {
  title: string;
  body: string;
}

const CONTROLS: Record<IntroControls, string> = {
  keyboard: '←  →  move\n↑  rotate\n↓  faster\nspace  drop',
  swipe: 'drag sideways to move\ntap to rotate\nflick down to drop',
};

export function introCards(controls: IntroControls): readonly IntroCard[] {
  return [
    {
      title: 'Connected',
      body: 'A brain connected by neurons.\n\nLight the dark ones to unlock memories and connections.',
    },
    {
      title: 'how to play',
      body: 'Blocks drop in twos.\nCombine four that match to pop them.\n'
        + `Pop one next to a dark neuron to light it.\n\n${CONTROLS[controls]}`,
    },
  ];
}
