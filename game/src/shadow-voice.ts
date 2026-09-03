/*
 * RULES ANY REWRITE HAS TO KEEP. Second person, at the player. It never
 * threatens: the character is the one who stops without finishing, and a shadow
 * that snarls is a monster, which is not what quits on you. The register is
 * RECOGNITION, never permission — a line granting permission reads as the game
 * reassuring the player, and a line stating a thesis is equally true of every
 * run, so it lands like a fortune cookie.
 */

export const SHADOW_LINES: readonly (readonly string[])[] = [
  [
    'You were doing well.',
    'There it is.',
    'I know this part.',
  ],
  [
    'You will stop before this is finished.',
    'You always do.',
    'This is usually where you find something else to do.',
  ],
  [
    'It was never the game that was hard.',
    'This is the part you do not tell anyone about.',
    'I am not the thing stopping you.',
  ],
];

export const CONNECTION_LOST = 'CONNECTION LOST';

export const SHADOW_CLOSING_LINE = 'That is usually where it stops.';

export const SHADOW_OPENING_LINE = 'You stopped here before.';

export const STILL_CONNECTED = 'STILL CONNECTED';

export function recoveredLine(memoryTitle: string): string {
  return `${memoryTitle} is yours again.`;
}

export const REACH_OUT_LINE = 'say hello';

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
