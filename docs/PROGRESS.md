# Progress

Current stage and open questions. Stages are defined in [DESIGN-PLAN.md](DESIGN-PLAN.md)
under Recommendations. Update this file at the end of each stage.

## Current stage

**Stage 1 — Core drop + lock. Engine done, scene not started.**

Stage 0 (setup) is complete: `game/` is a self-contained Vite + TypeScript + Phaser 4.2.1
package, Node pinned in `game/mise.toml`, `/game` wired into both the root dev server and
the production build.

The Stage 1 *engine* is built and tested (`0d117c6`). Nothing renders it yet — `BoardScene`
still draws the Stage 0 placeholder grid, so the game looks exactly as it did at Stage 0.

### What exists in `game/src/engine/`

- **`grid.ts`** — `COLUMNS` (6), `ROWS` (12), `PIECE_TYPE_COUNT` (6). Also `pieceTypeAt`,
  which is Stage 0 scaffolding that generates the static diagonal; delete it once the
  scene renders the real board.
- **`board.ts`** — `Board`: `isInside`, `isEmpty`, `isBlocked`, `pieceAt`, `place`,
  `settle`. Occupancy only.
- **`falling-pair.ts`** — `FallingPair`: `cells()`, `moveLeft`, `moveRight`,
  `rotateClockwise`, `canFall`, `fall`, `lock`. Four orientations; the satellite sits
  up/right/down/left of the pivot for orientation 0/1/2/3.
- **`simulation.ts`** — `Simulation`: owns a board and the active pair, `update(delta)`,
  `moveLeft`/`moveRight`/`rotate`, and a `softDropping` flag. Constants: `FALL_INTERVAL`
  800ms, `SOFT_DROP_INTERVAL` 50ms, `LOCK_DELAY` 500ms, `SPAWN_COLUMN`. Takes a
  `() => [number, number]` supplier so tests are deterministic.

### Next: the Stage 1 scene layer

1. `BoardScene` reads a `Simulation` instead of `pieceTypeAt`, and renders the settled board.
2. Render the falling pair on top of it.
3. Keyboard input driving `moveLeft`/`moveRight`/`rotate`/`softDropping`, with DAS/ARR.
   The design plan suggests starting DAS around 130ms and lowering it until it stops
   feeling controllable.
4. The fixed-timestep accumulator, which **must clamp large deltas** — see the decision below.

Stage 1's benchmark: pairs can be placed precisely and it *feels* instant. That can't be
judged until this layer exists.

## Decisions locked in Stage 1

Settled and tested. Don't re-litigate without a reason.

- **Row 0 is the top**; gravity increases the row number.
- **Lock delay resets on a successful move or rotate, never on a blocked one** — otherwise
  you could stall forever by mashing into a wall. There is deliberately no cap on resets
  (Puyo behaviour); Tetris caps it with a move-reset limit. Revisit when tuning feel.
- **Gravity uses an accumulator and does not clamp large deltas.** A backgrounded tab
  returns one enormous delta on refocus, which would drop a pair through the whole board.
  Clamping belongs in the scene's fixed-timestep loop, not the engine.
- **Soft drop swaps the fall interval** (800ms → 50ms) rather than multiplying, so the
  timing stays predictable.
- **Pairs spawn at row 0** in the middle column. This deliberately leaves the hidden-13th-row
  question below untouched.

## Open questions

Blocking Stage 2 (decide before matching is built — this is the core feel decision):

- **Match rule: Puyo-style or Bejeweled-style?** Connected groups of 4+ (deep chains,
  higher skill ceiling, "hard for newcomers") versus match-3 lines (more approachable,
  weaker chain fantasy). The 6×12 board and pair-drop already lean Puyo. It does *not*
  block the Stage 1 scene work — Dr. Mario drops pieces and matches in lines, so both
  rules sit on top of the same drop mechanic.
- **Hidden 13th row?** Puyo's "Ghost Puyo" row enables chains that don't pop until a
  piece drops. Powerful for expert play, invisible to newcomers.

Blocking Stage 4:

- **Earth** needs reframing — "pushes the player 1 block deeper" is the least legible
  idea. Warned bottom-row insertion, garbage-style?
- **The 30-second timer.** The design plan argues a hard guillotine is off-genre for a
  chain-planning game. Pacing dial, soft pressure, or cut?
- **Fire and Rain as light and dark?** Thematically tidy under the art direction, but it
  may collapse two distinct pieces onto one axis. See [ART-DIRECTION.md](ART-DIRECTION.md).

Resolved by the art direction, pending build:

- **Blockers** are encroaching shadow; the removal rule is *shadow recedes from light*,
  so clearing adjacent tiles pushes it back.
- **Pinball** is a shadow pooling on the glass with a visible wind-up.
- **Difficulty selection** is an opening values question, not an Easy/Normal/Hard menu.

Not blocking any stage:

- **The game's name.** `CLAUDE.md` still says "Mind Matcher (name pending)".
- **Newcomer onramp.** If the Puyo match rule wins, decide whether to ship a gentler mode
  or strong onboarding, or accept the learning curve.

## Deferred (deliberately not built yet)

- **Verifying `/game` on the deployed site.** It works locally, and Netlify serves real
  files before applying the `/*` rewrite in `public/_redirects` — the portfolio's own
  `/static/*` assets already depend on that. But it has not been observed on the live
  host. Check it after the first push.
- **A link from the portfolio to the game.** `/game` works but nothing points at it.
- **Migrating the portfolio from Create React App to Vite.** CRA is unmaintained, and it
  is why the two toolchains need `concurrently` and `src/setupProxy.js` to share a dev
  server. Migrating collapses both into one Vite app and deletes that seam — along with
  the `/game` path currently repeated across `setupProxy.js`, `vite.config.ts`, and the
  root `build` script.
- **The narrative wrapper** — hallway, face, eye, brain intro, memory vignettes. A
  separate workstream after the core matcher is proven fun.
