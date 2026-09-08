export const SHADOW_LINES: readonly (readonly string[])[] = [
  [
    'You were doing well.',
    'There it is.',
    'I know this part.',
    'You are getting distracted.',
    'This is not going anywhere.',
    'What is the point of this?',
  ],
  [
    'You will stop before this is finished.',
    'You always do.',
    'This is usually where you find something else to do.',
    'This is kind of pretentious.',
    'Are you not bored?',
    'You will never feel finished.',
  ],
  [
    'It was never the game that was hard.',
    'This is the part you do not tell anyone about.',
    'I am not the thing stopping you.',
    'This is not substantial.',
    'You are not talented enough for this.',
    'This is not working.',
    'No one will remember this.',
    'You are coming off as fake.',
  ],
];

export const CONNECTION_LOST = 'CONNECTION LOST';

export const SHADOW_CLOSING_LINE = 'That is usually where it stops.';

export const SHADOW_OPENING_LINE = 'You stopped here before.';

export const STILL_CONNECTED = 'STILL CONNECTED';

export const RECOVERED_LINE = 'You\'ve found ways to start connecting outside yourself.';

export const REACH_OUT_LINE = 'reach out to me';

export interface UnfinishedBusiness {
  reaching: string | null;
  connectionsShort: number;
}

export function closingLine({ reaching, connectionsShort }: UnfinishedBusiness): string {
  if (reaching === null) {
    return SHADOW_CLOSING_LINE;
  }

  const distance = connectionsShort <= 1
    ? 'One connection'
    : `${connectionsShort} connections`;

  return `${distance} short of ${reaching}. That is usually where it stops.`;
}

const TIER_THRESHOLDS = [0, 5, 12];

export const ARRIVALS_BETWEEN_LINES = 3;

export function shadowLine(
  cellsHeld: number,
  arrivalsSinceSpoken: number,
  spoken: readonly string[],
): string | null {
  if (arrivalsSinceSpoken < ARRIVALS_BETWEEN_LINES) {
    return null;
  }

  let tier = 0;
  for (let index = 0; index < TIER_THRESHOLDS.length; index += 1) {
    if (cellsHeld >= TIER_THRESHOLDS[index]) {
      tier = index;
    }
  }

  for (let index = tier; index >= 0; index -= 1) {
    const unsaid = SHADOW_LINES[index].find((line) => !spoken.includes(line));
    if (unsaid !== undefined) {
      return unsaid;
    }
  }

  return null;
}
