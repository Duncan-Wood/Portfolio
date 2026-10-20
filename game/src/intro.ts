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
      body: 'Nothing I’ve built happened without other people.\n\nLight the neurons to unlock the memories behind it.',
    },
    {
      title: 'how to play',
      body: `Match four of a color to clear them. Clear beside a dark neuron to light it.\n\n${CONTROLS[controls]}`,
    },
  ];
}
