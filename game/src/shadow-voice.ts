/*
 * What the shadow says, and when it may say it. Plain data and one pure
 * function, so the rules about when it speaks are ordinary unit tests.
 *
 * RULES ANY REWRITE HAS TO KEEP. Second person, at the player. It never
 * threatens: the character is the one who stops without finishing, and a shadow
 * that snarls is a monster, which is not what quits on you. The register is
 * RECOGNITION, never permission — a line granting permission reads as the game
 * reassuring the player, and a line stating a thesis is equally true of every
 * run, so it lands like a fortune cookie.
 */

/**
 * In tiers, by how much of the board it holds: more intimate with more ground,
 * never louder. Fixed order, because the last line is the payoff for the eight
 * before it rather than a draw from a bag.
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

/**
 * The GAME reporting what happened, in the register the rest of the interface
 * uses; the shadow answers underneath it. PLACEHOLDER, Duncan's to settle.
 */
export const CONNECTION_LOST = 'CONNECTION LOST';

/**
 * Not drawn from `SHADOW_LINES`: those needle you while you can still answer.
 * Read at the moment someone is deciding whether to press R, so it must not give
 * permission to leave — the rebuttal is the restart, prompted directly under it.
 */
export const SHADOW_CLOSING_LINE = 'That is usually where it stops.';

/**
 * The first thing anyone reads. The shadow speaks first because it is the only
 * voice that can make the objective an ANSWER — "light every neuron" means
 * nothing until something has said what went dark. Not a tutorial.
 *
 * PLACEHOLDER, and the first impression of a portfolio. Duncan's to settle.
 */
export const SHADOW_OPENING_LINE = 'You stopped here before.';

/** The mirror of `CONNECTION_LOST`, built from the same objects run backwards. */
export const STILL_CONNECTED = 'STILL CONNECTED';

/**
 * Naming what was recovered, for the reason `closingLine` is specific: it is the
 * difference between an ending and a screen. DRAFT wording.
 */
export function recoveredLine(memoryTitle: string): string {
  return `${memoryTitle} is yours again.`;
}

/**
 * The point of the whole exercise: a memory finishing is the one moment someone
 * has spent a few minutes inside somebody's life. Deliberately quiet — a
 * recruiting pitch on top of what was just said would undo it.
 */
export const REACH_OUT_LINE = 'say hello';

export interface UnfinishedBusiness {
  /** The fragment that was next, or `null` if none was left. */
  reaching: string | null;
  connectionsShort: number;
}

/**
 * Naming what THIS run did not finish, which is true only of the attempt just
 * made where a thesis is true of every run — and the opposite of permission to
 * leave: a reason to press R, said by the one thing that does not want you to.
 *
 * DRAFT wording; the shape is the point.
 */
export function closingLine({ reaching, connectionsShort }: UnfinishedBusiness): string {
  if (reaching === null) {
    return SHADOW_CLOSING_LINE;
  }

  // Singular, because this is the last sentence anyone sees.
  const distance = connectionsShort <= 1
    ? 'One connection'
    : `${connectionsShort} connections`;

  return `${distance} short of ${reaching}. That is usually where it stops.`;
}

/** Indexed to match `SHADOW_LINES`. */
const TIER_THRESHOLDS = [0, 5, 12];

/**
 * The dial between menacing and insufferable: a line per arrival is a pop-up,
 * and at three it says nothing at all to someone playing well. It also buys the
 * first sighting, so the creature is a thing on the board before it is a voice.
 */
export const ARRIVALS_BETWEEN_LINES = 3;

/**
 * The line for an arrival, or `null` for silence, which is most of the time.
 * Nothing repeats: a taunt heard twice reads as a looping asset rather than as
 * an opinion about you. A used-up tier drops to a lower one rather than going
 * quiet, and when everything is spent it is silent for good.
 */
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
