# Progress

Current stage, decisions, and open questions. Stages are defined in
[DESIGN-PLAN.md](DESIGN-PLAN.md) under Recommendations. Update this file at the end of
each stage.

For how the code actually works — the layers, the data flow, and the life of a single
piece — see [CODE-TOUR.md](CODE-TOUR.md).

## Status

**Stage 3 — Juice. The cascade is visible; the rest of the checklist is open.**

- **Stages 0–2 are closed.** Setup, the engine, the scene, input, tuning, matching,
  cascades and exponential chain scoring are all built and verified in Chrome.
  Stage 1's benchmark was judged met ("responsive, just pointless" — DAS 130 / ARR 40
  stand, no sweep needed). Stage 2's was met by hand-building a **three-link chain
  scoring 280**, predicted before the trigger dropped and confirmed exactly.
- **Done in Stage 3** — the cascade resolves one link per beat instead of instantly;
  clearing and settling are separate beats so tiles visibly hang before dropping (judged
  "more legible"); the next-piece preview is built; the hidden 13th row is in; and the
  game now ends when a pair has nowhere to spawn.
- **Next** — the rest of the juice checklist: tweened pop and fall, particles, hit-stop,
  screen shake, audio. Smooth tweening dropped from *needed for comprehension* to
  *optional polish* once the two-beat split landed.
- **Still unproven** — whether one pair of lookahead is enough to plan chains with, and
  whether the chain payoff actually feels good now that it is perceptible.

> **Testing in a browser:** Chrome pauses `requestAnimationFrame` entirely for hidden tabs,
> so a backgrounded window renders **zero** frames and every timing measurement is
> meaningless. The window must be visible and frontmost.

## Live tuning

`src/tuning.ts` holds every feel dial, and dev builds expose the scene's copy as
`window.tuning` — changes take effect on the next frame. The dials and what each
one does are documented in that file; the console recipe is in
[CODE-TOUR.md](CODE-TOUR.md) §6.

## Why the code is shaped this way

Read the source — every module carries a header explaining what it owns and why,
and the traps are commented at the lines they apply to.
[CODE-TOUR.md](CODE-TOUR.md) §3–4 is the map of which file to open.

## Locked decisions

Settled and tested, across Stages 1 and 2. Don't re-litigate without a reason.

The **reasoning for each lives as a comment on the code it governs** — this list
records *what* was decided and where to read *why*, so the two cannot drift.

| Decision | Why it is that way |
|---|---|
| Row 0 is the top; gravity increases the row number | `engine/grid.ts` |
| Pairs spawn in column 2, pivot in the topmost visible row | `engine/simulation.ts` (`SPAWN_COLUMN`, `nextPair`) |
| A locked pair's halves settle independently and may split | `engine/falling-pair.ts` (`lock`) |
| Lock delay resets on a successful move, never a blocked one | `engine/simulation.ts` (`afterInput`) |
| Fall progress is a fraction of the interval, not banked milliseconds | `engine/simulation.ts` (`fallProgress`) |
| Soft drop does not carry across a lock | `input/input-translator.ts` (the latches) |
| DAS does not stay charged across a lock | `input/input-translator.ts` |
| The engine never clamps its own delta; the caller does | `engine/simulation.ts`, `fixed-timestep.ts` |
| Match rule: connected groups of 4, any shape (Puyo, not lines) | `engine/matching.ts` |
| Four colours, not six | `engine/grid.ts` |
| Chain scoring is `cellsCleared × 10 × 2^linkIndex` — a placeholder | `engine/matching.ts` (`scoreLink`) |
| One pair of lookahead, shown beside the board | `engine/simulation.ts` (`upcoming`) |
| A hidden row above the visible field, where tiles rest but stay inert | `engine/grid.ts` (`HIDDEN_ROWS`), `engine/matching.ts` (`findGroups`) |
| Pairs spawn with the satellite in the hidden row, so no half is ever off-board | `engine/simulation.ts` (`SPAWN_ROW`) |
| Board left-aligned in a 620-wide canvas to make room for the preview | `scenes/BoardScene.ts` |
| The chain resolves over time: clear, then settle, one beat each | `engine/simulation.ts` (`advanceChain`), `engine/matching.ts` (`clearStep`) |
| Input is refused while a cascade resolves, and after a top-out | `engine/simulation.ts` (`acceptsInput`) |
| The spawn cells being occupied ends the game; the board is left on screen | `engine/simulation.ts` (`spawnOrTopOut`), `scenes/BoardScene.ts` (`refreshGameOver`) |
| `Board.place` throws on an off-board **or** occupied write | `engine/board.ts` (`place`) |
| Nothing is exempt from `isBlocked`; the ceiling blocks like any other edge | `engine/board.ts` (`isBlocked`) |

Two that are recorded here as well as in the code, deliberately:

- **The frame-delta clamp lives inside `FixedTimestep`.** This flip-flopped once. It was
  deleted on the grounds that Phaser smooths deltas itself, and replaced by a test comparing
  two of our own constants — a test that could not fail for the reason it existed, because
  you cannot unit-test another library's runtime from your own config file. Clamping before
  accumulating is part of *what a fixed-timestep loop is*. Don't delete it again.
- **Input is polled once per frame, not event-driven.** A press *and* release inside one
  frame is therefore dropped. Unreachable from a physical keyboard (a real tap is ~30ms
  against an 8–16ms frame) — it only shows up with synthetic key events. Note this before
  "fixing" it again.

## Decided, pending build

- **Next-piece preview — built.** See the locked decisions above.
- Blockers, Pinball, and difficulty framing are settled in
  [ART-DIRECTION.md](ART-DIRECTION.md) under "By stage".

## Open questions

### Blocking Stage 4

- **Earth** needs reframing — "pushes the player 1 block deeper" is the least legible idea.
  Warned bottom-row insertion, garbage-style?
- **The 30-second timer.** The design plan argues a hard guillotine is off-genre for a
  chain-planning game. Pacing dial, soft pressure, or cut?
- **Fire and Rain as light and dark?** Thematically tidy under the art direction, but it may
  collapse two distinct pieces onto one axis. See [ART-DIRECTION.md](ART-DIRECTION.md).

### Not blocking any stage

- **The game's name.** `CLAUDE.md` still says "Mind Matcher (name pending)".
- **Newcomer onramp.** If the Puyo match rule wins, decide whether to ship a gentler mode or
  strong onboarding, or accept the learning curve.

## Deferred (deliberately not built yet)

- **Capping the frame rate, and stripping the FPS counter from production.** Too early —
  measure real cost first, and do not trade input latency away before feel is settled.
- **Verifying `/game` on the deployed site.** Real files beat the `/*` rewrite on Netlify
  (confirmed against the live host); what is unproven is that a *directory* request
  resolves before the rewrite. If `/game` ever serves the portfolio, add
  `/game/*  /game/:splat  200` above the catch-all in `public/_redirects`.
- **A link from the portfolio to the game.** `/game` works but nothing points at it.
- **Migrating the portfolio from CRA to Vite.** CRA is unmaintained and is why the two
  toolchains need `concurrently` and `src/setupProxy.js`. Do it at a natural pause, not
  mid-feature — the failure mode is the live site breaking, not a red test.
- **The narrative wrapper** — hallway, face, eye, brain intro, memory vignettes. A separate
  workstream once the core matcher is proven fun.
