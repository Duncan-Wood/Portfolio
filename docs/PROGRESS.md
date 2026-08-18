# Progress

Current stage, decisions, and open questions. Stages are defined in
[DESIGN-PLAN.md](DESIGN-PLAN.md) under Recommendations. Update this file at the end of
each stage.

## Status

**Stage 3 — Juice. Started: the cascade is now visible. Stage 2's benchmark is met.**

Stage 1 is closed. Its benchmark (*pairs can be placed precisely and it feels instant*) was
judged met: "responsive, just pointless" — the input is right, and what was missing was the
loop, which is what Stage 2 adds. DAS 130 / ARR 40 stand as-is; no sweep was needed.

- **Done** — Stage 0 setup (`game/` is a self-contained Vite + TypeScript + Phaser 4.2.1
  package, Node pinned in `game/mise.toml`, `/game` wired into both the root dev server
  and the production build), plus the Stage 1 engine, scene, input, and tuning.
- **Stage 2 is closed.** Its benchmark — *a deliberately buried trigger sets off a
  multi-step chain* — was met by hand-building one: nine placed pieces produced a
  **three-link chain scoring 280** (`40 + 80 + 160`), predicted before the trigger was
  dropped and confirmed exactly. That also independently validates the exponential scoring.
- **Done in Stage 3 so far** — the cascade resolves one link per `chainLinkDelay` instead
  of instantly, so it can be seen at all.
- **Next** — the rest of the juice checklist (tweens on pop and fall, particles, hit-stop,
  screen shake, rising audio per link), then the hidden row and next-piece preview.

### Why Stage 3 became urgent

Building that chain by hand exposed the real reason the game read as unfun: **the payoff
was invisible.** The whole cascade resolved between two frames. The only evidence it had
happened was the score jumping 0 → 280 and three columns vanishing — no falling, no
clearing, nothing to watch or react to. The best thing the game could do was imperceptible.

Two other things that session surfaced, both arguing for the preview:

- Every one of the nine pieces had to be **rotated purely to discover the satellite's
  colour**, since it spawns at row −1 off-screen. You cannot plan a chain when half the
  information costs an input to reveal.
- Four of nine pairs were unusable for the plan and got parked in corners. That is normal
  for 4 colours, but it means chain-building leans on lookahead the game does not offer.

Verified in Chrome through the dev proxy: gravity, lock, respawn, rotation, wall blocking,
DAS auto-repeat, `window.tuning` driving the live simulation, soft drop not carrying across
a lock, and a held direction not carrying either. No console errors; 120fps on a 120Hz
display. Re-verified after input and the accumulator were extracted into their own modules.

> **Testing in a browser:** Chrome pauses `requestAnimationFrame` entirely for hidden tabs,
> so a backgrounded window renders **zero** frames and every timing measurement is
> meaningless. The window must be visible and frontmost.

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
- **`src/engine/matching.ts` is the whole Stage 2 rule set**, and it is pure: `findGroups`
  flood-fills orthogonal same-colour neighbours, `resolveChain` settles *before* each scan
  so it never scores a floating group, then clears and loops until nothing matches, returning one `ChainLink` per link so the scene can animate them
  separately later. Its tests build boards from ASCII pictures, which is what makes a rule
  about *shapes* readable — L-shapes, T-shapes, and the no-diagonals rule are each one
  picture.
- **`src/fixed-timestep.ts` clamps the frame delta, banks it, and returns whole steps.**
  See the clamp decision below for why the clamp lives here.
- **`BoardScene` is deliberately thin** — it owns Phaser and nothing else. Its translator
  field is named `inputTranslator`, **not** `input`: `input` is Phaser's own `Scene.input`
  plugin and shadowing it breaks `this.input.keyboard`.

## Locked decisions

Settled and tested, across Stages 1 and 2. Don't re-litigate without a reason.

- **Row 0 is the top**; gravity increases the row number.
- **Pairs spawn at row 0** in the middle column.
- **Lock delay resets on a successful move or rotate, never on a blocked one** — otherwise
  you could stall forever by mashing into a wall. There is deliberately no cap on resets
  (Puyo behaviour); Tetris caps it with a move-reset limit. Revisit when tuning feel.
- **Fall progress is a fraction of the current interval, not a millisecond timer.**
  Soft drop swaps the interval (800ms → 50ms) rather than multiplying it, and the naive
  version banked elapsed milliseconds against whichever interval was active. Press Down
  750ms into a normal fall and the loop spent that bank at the *new* rate — `750 / 50` =
  15 rows in one frame, so the pair teleported to the floor. Reported as "holding down
  almost instantly drops it unless you hold the key for one frame"; a test pinned it at
  11 rows. Tracking `fallProgress` as a 0–1 fraction means a rate change preserves *how far
  you are toward the next row* instead of re-denominating banked time, so switching rates
  can never produce a burst. It also makes live tuning changes safe mid-fall.
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
- **Match rule: connected groups of 4 (Puyo).** Four or more same-colour tiles touching
  orthogonally, any shape. Chosen over match-3 lines because the art direction's core image
  is a *network* — chains lighting the leading between tiles reads as a signal crossing a
  graph, which is what connected groups are and what lines are not. Accepts the design
  plan's warning that Puyo chain-building is hard for newcomers.
- **Four colours, not six.** `PIECE_TYPE_COUNT` was 6; Puyo ships 4 as standard and treats 5
  as the harder setting. On a 6-wide board, six colours made same-coloured pieces land
  adjacent too rarely for groups to form, so the board filled before anything could be set
  up. This was very likely the largest single reason the game read as unfun.
- **Chain scoring is `cellsCleared × 10 × 2^linkIndex`** — deliberately a placeholder.
  Exponential in chain depth, which is the property that matters, but not Puyo's real
  formula (chain power + colour bonus + group bonus). Replace it when scoring is tuned.
- **The chain resolves over time, in a `resolving` phase between lock and spawn.** Each
  link is applied one `chainLinkDelay` (220ms) apart, so a completed group is on screen as a
  group before it clears. Two rules fall out of it: input is **ignored while resolving**
  (there is now a real window where `pair` is locked onto the board but the next one has not
  spawned, and moving it would corrupt the board), and a lock that matches nothing spawns
  **immediately** with no delay — otherwise every non-matching piece would pay the chain tax.
  `resolveChain` is now a loop over a single-step `resolveStep`, so the engine keeps its
  all-at-once API for tests while the scene gets it link by link.
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
