/*
 * What the shadow says, and when it is allowed to say it.
 *
 * Plain data and one pure function, like `memories.ts` and `audio/voices.ts`,
 * so the writing is separable from everything that draws it and the RULES about
 * when it speaks are ordinary unit tests rather than something you can only
 * judge by playing for ten minutes.
 *
 * It speaks in the SECOND PERSON, at the player. That is a deliberate fork: the
 * other option was first person — my own doubt talking to itself — which
 * is more literally true to what the antagonist is but leaves the person
 * holding the keyboard watching someone else's argument. Undertale's whole
 * engine is that the game knows you are there. This is the cheap version of
 * that, and it is the only place in the game where anything addresses the
 * player except the question at the end of a memory.
 *
 * The character is set in `docs/PROGRESS.md` and in my own answer to it: the
 * one who stops without finishing, who doubts themself, who settles. So none of
 * these lines threaten. It is patient, it is reasonable, and it is not in a
 * hurry — which is the only version of this character that is frightening. A
 * shadow that snarls is a monster, and a monster is not what quits on you.
 */

/**
 * What it says, in tiers, by how much of the board it is holding when it
 * speaks. It gets more intimate the more ground it has, never louder.
 *
 * Fixed order rather than shuffled, and deliberately so: this is writing, and
 * writing has an order. Every run hearing the same lines in the same sequence
 * is what lets the last one land — it is the payoff for the eight before it,
 * not a random draw from a bag.
 */
export const SHADOW_LINES: readonly (readonly string[])[] = [
  // Barely a foothold. Almost polite.
  [
    'Take your time.',
    'There is no hurry.',
    'You were doing well.',
  ],
  // It has ground now.
  [
    'You will stop before this is finished.',
    'You always do.',
    'This is usually where you find something else to do.',
  ],
  // It holds most of what you built.
  [
    'It was never the game that was hard.',
    'You could stop now. No one would know.',
    'I am not the thing stopping you.',
  ],
];

/**
 * How many cells it has to hold before it will use the next tier's lines.
 *
 * Indexed to match `SHADOW_LINES`, so tier 0 needs nothing and the last tier
 * needs a board it is genuinely winning.
 */
const TIER_THRESHOLDS = [0, 5, 12];

/**
 * How many cells it has to take between one line and the next.
 *
 * This is the dial that decides whether the shadow is menacing or insufferable,
 * and it is high on purpose. It arrives every six seconds of hesitation; a line
 * every time would be a pop-up. Three arrivals of silence between lines means
 * that at the shipping interval it says something roughly every twenty seconds
 * of the player dithering, and says nothing at all to somebody who is playing
 * well.
 *
 * It also buys the first sighting: the counter starts at zero, so the first
 * three arrivals are wordless and the creature gets to be a thing on the board
 * before it is a voice.
 */
export const ARRIVALS_BETWEEN_LINES = 3;

/**
 * The line for an arrival, or `null` for silence — which is most of the time.
 *
 * `spoken` is every line already used this run. Nothing repeats: a taunt you
 * have heard before is furniture, and the second time it lands as a game
 * looping an asset rather than as something with an opinion about you.
 *
 * When the tier it has earned is used up it drops to a lower one rather than
 * going quiet, so a long grinding run still has something to say; when
 * everything is used up it is silent for good, which is its own ending.
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
