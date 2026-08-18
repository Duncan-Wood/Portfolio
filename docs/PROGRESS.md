# Progress

Current stage, decisions, and open questions. Stages are defined in
[DESIGN-PLAN.md](DESIGN-PLAN.md) under Recommendations. Update this file at the end of
each stage.

## Status

**Stage 1 — Core drop + lock. Built and verified; awaiting the feel judgment.**

- **Done** — Stage 0 setup (`game/` is a self-contained Vite + TypeScript + Phaser 4.2.1
  package, Node pinned in `game/mise.toml`, `/game` wired into both the root dev server
  and the production build), plus the Stage 1 engine, scene, input, and tuning.
- **Blocking Stage 1** — the feel judgment. Only Duncan can call it.
- **Next** — build the hidden row and next-piece preview *before* judging feel, then run
  the benchmark below.

Verified in Chrome through the dev proxy: gravity, lock, respawn, rotation, wall blocking,
DAS auto-repeat, `window.tuning` driving the live simulation, soft drop not carrying across
a lock, and a held direction not carrying either. No console errors; 120fps on a 120Hz
display. Re-verified after input and the accumulator were extracted into their own modules.

> **Testing in a browser:** Chrome pauses `requestAnimationFrame` entirely for hidden tabs,
> so a backgrounded window renders **zero** frames and every timing measurement is
> meaningless. The window must be visible and frontmost.

## Closing Stage 1: how to run the benchmark

The benchmark is *pairs can be placed precisely and it feels instant*.

Judge nothing until the next-piece preview exists — half the pair is invisible at spawn, so
the question has no fair answer yet. To test before then, press Up as a pair spawns:
rotating to orientation 1 brings the satellite from row −1 into view.

Hold `autoRepeatInterval` at 40 and sweep `autoShiftDelay` (130 → 110 → 90 → 70) live in
the console. On a 6-wide board DAS does nearly all the work. Three repeatable tasks per
value, rather than free play:

1. **Tap precision** — tap Left once, ten times quickly. Any tap that moves two columns
   means DAS is below your tap duration. This is the floor.
2. **Hold traversal** — hold Right to the wall. One continuous slide, or separate steps?
   Separate steps means DAS is too high.
3. **Targeted placement** — name a column before the pair appears, then put it there. Ten
   reps, count misses. This is the benchmark restated as something countable.

Take the lowest DAS that still passes task 1 cleanly.

For reset-on-lock the test is different: stack toward one side for a minute, holding the
direction naturally. If a new pair ignoring the held key reads as "good, it didn't slam
into the wall", keep it. If you re-tap with irritation, it is a dead key — see the
DAS-charging decision below for the one-line revert.

## Live tuning

`src/tuning.ts` holds every feel dial in one pure, Phaser-free object: `fallInterval` 800ms,
`softDropInterval` 50ms, `lockDelay` 500ms, `autoShiftDelay` 130ms, `autoRepeatInterval`
40ms.

`BoardScene` takes a **copy** of `DEFAULT_TUNING` and hands it to `Simulation`, so both read
the same live object. In dev builds only, that copy is exposed as `window.tuning`:

```js
tuning.autoShiftDelay = 100      // DAS — the dial that matters most on a 6-wide board
tuning.autoRepeatInterval = 30   // ARR; 0 means "slide to the wall in one frame"
tuning.fallInterval = 600
```

Changes take effect on the next frame — no reload, no rebuild. Write down what feels right,
then change `DEFAULT_TUNING`.

## Why the code is shaped this way

The file layout and APIs are readable from the source. These are the parts that are not.

- **`src/engine/` is pure.** No Phaser, fully unit-tested. Piece types come from
  `Math.random` in the scene via a supplier, so the engine stays deterministic and its
  tests stay seedless.
- **`Simulation.piecesSpawned` exists so the scene can detect "a piece locked and a new one
  spawned" without comparing `FallingPair` references.** Identity comparison worked but was
  silent and fragile: the engine never promised to allocate a fresh pair per spawn, so
  pooling or a `pair.reset()` refactor would have quietly resurrected the soft-drop
  carryover bug with no failing test. The engine owns the lock→spawn transition, so it owns
  the signal.
- **`src/input/InputTranslator` lives outside the scene so game *feel* is testable.** It
  owns DAS/ARR and both "awaiting release" latches, and is Phaser-free. `BoardScene` keeps
  only the Phaser-specific parts: reading `cursors`, and the `timeDown` tie-break when both
  direction keys are held. Twelve tests cover the rules that previously could only be
  checked by playing.
- **`src/fixed-timestep.ts` clamps the frame delta, banks it, and returns whole steps.**
  See the clamp decision below for why the clamp lives here.
- **`BoardScene` is deliberately thin** — it owns Phaser and nothing else. Its translator
  field is named `inputTranslator`, **not** `input`: `input` is Phaser's own `Scene.input`
  plugin and shadowing it breaks `this.input.keyboard`.

## Decisions locked in Stage 1

Settled and tested. Don't re-litigate without a reason.

- **Row 0 is the top**; gravity increases the row number.
- **Pairs spawn at row 0** in the middle column.
- **Lock delay resets on a successful move or rotate, never on a blocked one** — otherwise
  you could stall forever by mashing into a wall. There is deliberately no cap on resets
  (Puyo behaviour); Tetris caps it with a move-reset limit. Revisit when tuning feel.
- **Soft drop swaps the fall interval** (800ms → 50ms) rather than multiplying, so the
  timing stays predictable.
- **Soft drop does not carry across a lock.** Holding Down used to mirror `isDown` straight
  onto `softDropping`, so a pair that spawned while the key was held fast-fell immediately —
  16× gravity, the whole board in ~600ms. Tetris lets soft drop carry over, but its soft
  drop is ~2× gravity, not 16×.
- **DAS does not stay charged across a lock.** A new pair requires the direction key to be
  released and pressed again, matching the soft-drop rule. Tetris deliberately keeps DAS
  charged and good players rely on it, so if this reads as a dead key rather than as safety,
  the softer variant is one line in `src/input/input-translator.ts`: drop
  `shiftAwaitingRelease` and let the still-held key re-trigger as a fresh press.
- **The engine never clamps its own delta.** `Simulation.update` trusts its caller.
- **The frame-delta clamp lives inside `FixedTimestep`.** This flip-flopped once; the
  warning is here so it doesn't again. Phaser *does* clamp on its own (`TimeStep.smoothDelta`
  caps delta at 200ms via `fps.min`), and the clamp was deleted on that basis — replaced by
  a test comparing config constants. That test could not fail for the reason it existed,
  because you cannot unit-test another library's runtime from your own config file, and it
  asserted something false besides. Clamping before accumulating is part of *what a
  fixed-timestep loop is*; without it the loop's iteration bound lives in a third-party
  config file. `FixedTimestep`'s tests exercise the real property: `stepsFor(10_000)`
  returns a bounded step count.
- **Input is polled once per frame, not event-driven.** A press must survive to the next
  poll, so a press *and* release inside one frame is dropped. Unreachable from a physical
  keyboard (a real tap is ~30ms against an 8–16ms frame) — it only shows up with synthetic
  key events, so it is not worth event-driven input. Note it before "fixing" it again.

## Decided, pending build

- **Hidden 13th row — yes.** Puyo's "Ghost Puyo" row: one row above the visible field where
  pieces rest but stay inert. It buys three things — breathing room at the top, a sharp
  game-over rule ("spawn cell occupied"), and the expert technique of completing a group
  whose last piece sits in the ghost row and only detonates when it later falls in. Build it
  before matching, since it changes every coordinate.
  - Open sub-rule: hidden-row pieces must **not** participate in matches (Puyo's rule), or
    you get explosions the player cannot see.
- **Next-piece preview — yes.** This, not the hidden row, is what fixes "I can't see what
  I'm holding". The hidden row does not solve it: a satellite spawned into a hidden row is
  still invisible. Puyo shows the incoming pair in a panel beside the board instead.
- Blockers, Pinball, and difficulty framing are settled in
  [ART-DIRECTION.md](ART-DIRECTION.md) under "By stage".

## Open questions

### Blocking Stage 2

- **Match rule: Puyo-style or Bejeweled-style?** Connected groups of 4+ (deep chains, higher
  skill ceiling, "hard for newcomers") versus match-3 lines (more approachable, weaker chain
  fantasy). The 6×12 board and pair-drop already lean Puyo. This is the core feel decision —
  decide it before matching is built.
- **There is no game over.** When the stack reaches the spawn cell, `spawn()` puts a pair
  inside occupied cells, `place` overwrites them, and it locks in place forever — the board
  fills and the game keeps running. Confirmed by playing. The topping-out rule comes with the
  hidden row above, but only becomes *reachable* once matching stops the board filling.

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

- **Capping the frame rate and stripping the FPS counter from production.** Phaser's
  `fps.limit` defaults to 0, so the game runs at the display's refresh rate — 120fps on a
  120Hz screen, double the work for a 60fps requirement. Too early to limit: measure real
  cost first, and do not trade away input latency before the feel is settled.
- **Verifying `/game` on the deployed site.** Netlify serves real files before applying the
  `/*` rewrite in `public/_redirects` — confirmed against the live host, where a real
  `/static/*` asset returns JavaScript rather than the rewritten index. What is still
  unproven is that a *directory* request (`/game/`) resolves to `/game/index.html` before the
  rewrite. If `/game` ever serves the portfolio after a deploy, the fix is one rule above the
  catch-all: `/game/*  /game/:splat  200`.
- **A link from the portfolio to the game.** `/game` works but nothing points at it.
- **Migrating the portfolio from Create React App to Vite.** CRA is unmaintained, and it is
  why the two toolchains need `concurrently` and `src/setupProxy.js` to share a dev server.
  Migrating collapses both into one Vite app and deletes that seam — along with the `/game`
  path currently repeated across `setupProxy.js`, `vite.config.ts`, and the root `build`
  script.
- **The narrative wrapper** — hallway, face, eye, brain intro, memory vignettes. A separate
  workstream after the core matcher is proven fun.
