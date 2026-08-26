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
 *
 * The register is RECOGNITION, and that is a correction. The opening tier used
 * to be "Take your time." and "There is no hurry." — patient, in character, and
 * wrong, because permission is indistinguishable from kindness when the player
 * has no idea who is speaking. Those read as the game reassuring you. They also
 * said the same thing twice, spending a third of the script on one idea.
 *
 * What actually frightens is being KNOWN. "You were doing well" survived that
 * cut and is the model: the menace is entirely in the past tense. Every line
 * here now recognises something rather than permitting it — which is also what
 * makes them reactions to the moment they fire in rather than theses that would
 * be equally true at any other time.
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
  // Barely a foothold. It has not threatened anything; it has just noticed.
  [
    'You were doing well.',
    'There it is.',
    'I know this part.',
  ],
  // It has ground now.
  [
    'You will stop before this is finished.',
    'You always do.',
    'This is usually where you find something else to do.',
  ],
  // It holds most of what you built, and it gets more intimate rather than
  // louder. The middle line here used to be "You could stop now. No one would
  // know." — the same permission bug as the opening tier, and the exact thing
  // this file's closing-line rule forbids, sitting unnoticed in the tier that
  // does the most damage.
  [
    'It was never the game that was hard.',
    'This is the part you do not tell anyone about.',
    'I am not the thing stopping you.',
  ],
];

/**
 * What the game says when the shadow has taken the whole board, and what the
 * shadow says under it.
 *
 * Two lines rather than one, doing different jobs. The first is the GAME
 * reporting what happened, in the register the rest of the interface uses —
 * "TOPPED OUT" said nothing about this game in particular, and this is the last
 * thing a run leaves anyone with. The second is the shadow, and it is the only
 * time it gets the last word.
 *
 * PLACEHOLDER, both of them, in the way `memories.ts` was: they are the most
 * important sentences here and they are not mine to settle. Isolated in this
 * file with no imports so rewriting them touches nothing else.
 */
export const CONNECTION_LOST = 'CONNECTION LOST';

/**
 * Deliberately not drawn from `SHADOW_LINES`. Those are needling, said while
 * you can still answer them; this is said when you cannot.
 *
 * The rule this line has to obey, learned by breaking it: it must not give the
 * player permission to leave. The first version was "You can start again
 * tomorrow" — perfectly in character, and the worst possible thing to read at
 * the moment you are deciding whether to press R. The antagonist telling you to
 * stop is only good writing if stopping is not what you might actually do.
 *
 * So it states the shadow's thesis about you and leaves it hanging. The
 * rebuttal is the restart, which is why the prompt for it sits directly
 * underneath.
 */
export const SHADOW_CLOSING_LINE = 'That is usually where it stops.';

/**
 * The first thing anyone reads, over a board that is not moving yet.
 *
 * The game had no opening at all: a visitor arrived on a board already
 * falling, with no title, no framing and an objective line that read as an
 * instruction from nowhere. The shadow speaks first because it is the only
 * voice here that can make that objective an ANSWER to something — "light
 * every neuron" means nothing until something has said what went dark.
 *
 * It obeys the same rule as every line above: recognition, past tense, no
 * threat. And it must not be a tutorial. The player learns the controls by
 * having them; what this buys is a reason to care that they work.
 *
 * PLACEHOLDER, like the two below it, and the most load-bearing sentence in
 * the game — it is the first impression of a portfolio. Duncan's to settle.
 */
export const SHADOW_OPENING_LINE = 'You stopped here before.';

/**
 * What the game says when a memory is finished, and the line under it.
 *
 * The mirror of `CONNECTION_LOST`, and the reason that constant's own comment
 * calls the title "the title the loss screen contradicts": until now, losing
 * was the ONLY authored ending in the game. Everything after the last fragment
 * was silence — the run kept re-seeding a board with nothing left to earn — so
 * the shadow got the last word by default, because it was the only one with a
 * last word written.
 *
 * This is where the title stops being contradicted and starts being earned.
 * Same three-object shape as the loss, run the other way: the traces light
 * instead of dying, the pitch climbs instead of falling, and the memory panel
 * comes up full instead of going dark.
 */
export const STILL_CONNECTED = 'STILL CONNECTED';

/**
 * The line under it, naming what was recovered.
 *
 * Specific for the same reason `closingLine` is specific: a thesis is the
 * weakest thing to end on because it is equally true of every run. The player
 * just finished High School, and saying so is the difference between an ending
 * and a screen.
 *
 * DRAFT wording. Nothing imports this file, so rewriting it touches nothing.
 */
export function recoveredLine(memoryTitle: string): string {
  return `${memoryTitle} is yours again.`;
}

/**
 * The offer that follows it, which is the point of the whole exercise.
 *
 * `CLAUDE.md` sets the bar this line exists to clear: the game "has to be good,
 * and it has to lead to me". A memory finishing is the only moment in a
 * portfolio-you-play where someone has actually spent a few minutes on
 * somebody's life and might want to say something about it — so the way to do
 * that belongs here and nowhere else.
 *
 * Not a call to action, and deliberately quiet. It has just been said that
 * something was recovered; a recruiting pitch on top of that would undo it.
 */
export const REACH_OUT_LINE = 'say hello';

/** What the run was reaching for when it ended, if it was reaching for anything. */
export interface UnfinishedBusiness {
  /** The title of the fragment that was next, or `null` if none was left. */
  reaching: string | null;
  /** How many more connections it needed. */
  connectionsShort: number;
}

/**
 * The shadow's last word, naming what THIS run did not finish.
 *
 * `SHADOW_CLOSING_LINE` states a thesis about the player, and a thesis is the
 * weakest thing you can end on: it is equally true of every run, so it lands
 * like a fortune cookie rather than like something that just happened. What a
 * player actually lost is sitting right there and was never said — they were
 * three connections from The Hat, and that is specific, earned, and only true
 * of the attempt they just made.
 *
 * Dark Souls' "YOU DIED" carries on context, not vocabulary. This is the
 * context.
 *
 * The rule the general line has to obey applies here too, and harder: it must
 * not give the player permission to leave. Naming the unfinished thing is the
 * opposite of permission — it is the reason to press R, said by the one thing
 * in the game that does not want you to.
 *
 * DRAFT wording, like the two constants above: the shape is the point and the
 * sentences are Duncan's to settle. Nothing imports this file, so rewriting
 * them touches nothing else.
 */
export function closingLine({ reaching, connectionsShort }: UnfinishedBusiness): string {
  if (reaching === null) {
    return SHADOW_CLOSING_LINE;
  }

  // Singular, because "1 connections from" is the tell of a sentence nobody
  // read back, and this is the last one anyone sees.
  const distance = connectionsShort <= 1
    ? 'One connection'
    : `${connectionsShort} connections`;

  return `${distance} short of ${reaching}. That is usually where it stops.`;
}

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
