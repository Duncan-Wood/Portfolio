export type IntroControls = 'keyboard' | 'swipe';

export interface IntroCard {
  title: string;
  body: string;
}

const CONTROLS: Record<IntroControls, string> = {
  keyboard: '',
  swipe: '\n\ndrag sideways to move\ntap to rotate\nflick down to drop',
};

export function introCards(controls: IntroControls): readonly IntroCard[] {
  return [
    {
      title: 'Connected',
      body: 'Light the neurons to unlock the memories behind it.\n\nPause any time to read them.',
    },
    {
      title: 'how to play',
      body: `Match four of a color to clear them. Clear beside a dark neuron to light it.${CONTROLS[controls]}`,
    },
  ];
}
