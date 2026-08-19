# Progress

Current stage, decisions, and open questions. Stages are defined in
[DESIGN-PLAN.md](DESIGN-PLAN.md) under Recommendations. Update this file at the end of
each stage.

For how the code works, read the source: `CLAUDE.md` maps the layers, and every module
carries a header explaining what it owns and why.

## Status

**Stage 3 — Juice. The cascade is visible; the rest of the checklist is open.**

- **Stages 0–2 are closed.** Setup, the engine, the scene, input, tuning, matching,
  cascades and exponential chain scoring are all built and verified in Chrome.
  Stage 1's benchmark was judged met ("responsive, just pointless" — DAS 130 / ARR 40
  stand, no sweep needed). Stage 2's was met by hand-building a **three-link chain
  scoring 280**, predicted before the trigger dropped and confirmed exactly.
- **Done in Stage 3** — the cascade resolves one link per beat instead of instantly;
  clearing and settling are separate beats; the next-piece preview is built; the hidden
  13th row is in; the game ends when a pair has nowhere to spawn, and **R starts a new
  one**; and nothing teleports any more — the pair descends between rows, cleared tiles
  shrink away, and settled tiles fall into their holes.
- **Stage 3's checklist is now complete.** Hard drop and a 400ms gravity fixed the pacing;
  procedural Web Audio, particles, hit-stop, screen shake, the landing bounce, score popups
  and a vignette fixed the presentation. Comfortably over 60fps with the filter running.
- **The identity pass has started.** Tiles carry a **figure** as well as a colour — star,
  circle, square, diamond, straight off the storyboard's first panel — drawn as jewel-toned
  panes with the leading around them dark. This was the cheapest identity available and it
  fixes a real accessibility problem: four hues alone are not separable by every player, and
  everybody reads a silhouette faster than a hue under time pressure.
- **Next** — the Stage 3 benchmark itself: *playtesters visibly react to a big chain.* That
  needs another person, and it is the only thing that closes Stage 3 and unblocks Stage 4.
- **Still unproven** — whether one pair of lookahead is enough to plan chains with, and
  whether the chain payoff actually feels good. That is a playtest with another person,
  and it is Stage 3's real benchmark: *playtesters visibly react to a big chain.*

> **Testing in a browser:** Chrome pauses `requestAnimationFrame` entirely for hidden tabs,
> so a backgrounded window renders **zero** frames and every timing measurement is
> meaningless. The window must be visible and frontmost.
>
> **A frame that throws stops the game for good.** An exception escaping `BoardScene.update`
> propagates out of Phaser's `TimeStep.step` and the rAF chain is never re-requested — the
> game is dead until a reload. It *reads* exactly like the hidden-tab problem above, because
> the tab still reports `visible`, still reports `hasFocus`, and the FPS readout keeps
> showing whatever it last rendered. Tell them apart by checking whether `game.loop.frame`
> advances while your own `requestAnimationFrame` callback still ticks; then read the
> console. `Board.place` throwing on an occupied write is deliberate, so scripting the board
> from the console is the likely way to trip this.

## Live tuning

`src/tuning.ts` holds every feel dial, and dev builds expose the scene's copy as
`window.tuning` — changes take effect on the next frame. The dials, what each one
does, and the console recipe are all documented in that file.

## Why the code is shaped this way

Read the source — every module carries a header explaining what it owns and why,
and the traps are commented at the lines they apply to. `CLAUDE.md` under
"Architecture" is the map of which file to open.

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
| Space hard-drops: slam, commit, no lock delay | `engine/simulation.ts` (`hardDrop`) |
| Gravity is 400ms/row, because nobody waits for gravity in this genre | `tuning.ts` (`fallInterval`) |
| Audio is synthesised, not sampled — no asset files, no licences | `audio/voices.ts`, `audio/sound-board.ts` |
| Sound decisions are pure data and unit-tested; only playback touches the browser | `audio/voices.ts` |
| Chain pitch rises a semitone per link, capped two octaves up | `audio/voices.ts` (`popVoice`) |
| The camera rolls as well as shakes — translation alone reads as a glitch | `scenes/BoardScene.ts` (`kickCamera`) |
| Hit-stop freezes the simulation without banking the frozen time | `scenes/BoardScene.ts` (`update`) |
| Particles are tinted from one runtime-baked texture, so no art is needed | `scenes/BoardScene.ts` (`SPARK_TEXTURE`) |
| The vignette is deliberately weak: readability beats atmosphere | `scenes/BoardScene.ts` |
| **No** lit platform — built, judged wrong, and cut. Revisit after the playtest | `scenes/BoardScene.ts` (comment above the vignette) |
| The chain resolves over time: clear, then settle, one beat each | `engine/simulation.ts` (`advanceChain`), `engine/matching.ts` (`clearStep`) |
| Input is refused while a cascade resolves, and after a top-out | `engine/simulation.ts` (`acceptsInput`) |
| R restarts from any state, without tearing the scene down | `engine/simulation.ts` (`restart`), `scenes/BoardScene.ts` (`restart`) |
| `settle` reports which tiles moved, so the scene can animate the drop | `engine/board.ts` (`TileMove`) |
| The engine leaves each cascade beat's result for the scene to read; no callbacks | `engine/simulation.ts` (`beatsPlayed`, `lastBeat`) |
| A beat is one tagged `CascadeBeat`, not two fields told apart by object identity | `engine/simulation.ts` (`CascadeBeat`) |
| `piecesLocked` and `lastLanded` announce a landing; the spawn counter misses two | `engine/simulation.ts` (`lockPair`) |
| The pair is drawn at `row + fallProgress`, so gravity looks like falling | `scenes/BoardScene.ts` (`drawPair`) |
| The pair's hidden-row half is clipped to the board, not hidden or floated | `scenes/BoardScene.ts` (`drawClippedToBoard`) |
| The hidden-row half is **cropped**, not resized and not masked | `scenes/BoardScene.ts` (`drawClippedToBoard`) |
| Every piece type has a distinct shape as well as a distinct colour | `palette.ts` (`PIECE_SHAPES`) |
| Tile art is baked into textures once at boot, not drawn per frame or loaded | `scenes/tile-textures.ts` |
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
- **How much progress a memory costs — measured.** A greedy bot run through the real
  engine clears **1.6-1.8 cells per piece**, and a strong run lasts 270-410 pieces, so a
  whole run is worth roughly **450-700 cells**. Four memories therefore want escalating
  thresholds that fit inside that, with a deliberately tiny first one:

  | Memory | Cells | Cumulative | Roughly |
  |---|---|---|---|
  | 1 | 30 | 30 | ~18 pieces, under a minute |
  | 2 | 60 | 90 | ~53 pieces |
  | 3 | 120 | 210 | ~124 pieces |
  | 4 | 240 | 450 | a strong run |

  A weak run earns one or two, which is what gives replaying a point. The tiny first one
  is Dr. Mario's trick — its level 0 is four viruses, and that is the tutorial.
- **The score is not the progression, and never was.** `scoreLink` has always been marked a
  placeholder, and a number in the corner is the reason a long session reads as pointless.
  The storyboard already settled what replaces it: *"Neurons unlock memories & appear after a
  certain # of box clears. Activated by popping an adjacent block."* So the HUD wants a meter
  filling toward the next Neuron, and a Neuron that pays out a memory. `DESIGN-PLAN.md` says
  the same thing — *"Make this the flagship. Tie the count cleared directly to memory unlocks
  so the puzzle **is** the narrative progression."*
- **The watching brain**, in the empty panel below NEXT. ART-DIRECTION already lists it under
  Stage 3, the storyboard draws it beside the board, and the space is sitting there.
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
