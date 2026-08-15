# Progress

Current stage and open questions. Stages are defined in [DESIGN-PLAN.md](DESIGN-PLAN.md)
under Recommendations. Update this file at the end of each stage.

## Current stage

**Stage 0 — Setup. Complete (2026-08-15).**

Benchmark from the design plan — "an empty 60fps canvas with a drawn grid" — met.

- `game/` is a self-contained Vite + TypeScript + Phaser package inside the portfolio
  repo. The React portfolio at `/` is untouched.
- Phaser 4.2.1, Vite 8.2.1, Vitest 4.1.10, TypeScript 7.0.2, Node 24.19.0 (`game/mise.toml`).
- Static 6×12 grid renders on WebGL; verified by sampling canvas pixels, including a
  diagonal check that rules out row/column transposition.
- FPS counter reads `game.loop.actualFps`, refreshed at 4Hz.
- `game/src/engine/grid.ts` is pure — no Phaser import. 9 unit tests pass.
- Root `npm start` runs both dev servers and serves the game at `/game`; root `npm run
  build` composes `game/dist` into `build/game`.

**Next: Stage 1 — Core drop + lock.** Pairs dropping into the 6×12 grid, left/right/
rotate/soft-drop input, gravity, lock delay. Logic stays in a pure engine class with
tests written first. Benchmark: pairs can be placed precisely and it *feels* instant.

Stage 1 is where the fixed-timestep accumulator lands — there is now a simulation to step.

## Open questions

Blocking Stage 1:

- **Nothing.** Stage 1 is fully specified by the design plan.

Blocking Stage 2 (decide before matching is built — this is the core feel decision):

- **Match rule: Puyo-style or Bejeweled-style?** Connected groups of 4+ (deep chains,
  higher skill ceiling, and the design plan warns Puyo is "hard for newcomers") versus
  match-3 lines (more approachable, weaker chain fantasy). The 6×12 board and pair-drop
  already lean Puyo.
- **Hidden 13th row?** Puyo's "Ghost Puyo" row enables chains that don't pop until a
  piece drops. Powerful for expert play, invisible to newcomers.

Blocking Stage 4:

- **Earth** needs reframing — "pushes the player 1 block deeper" is the least legible
  idea. Warned bottom-row insertion, garbage-style?
- **The 30-second timer.** The design plan argues a hard guillotine is off-genre for a
  chain-planning game. Pacing dial, soft pressure, or cut?
- **Fire and Rain as light and dark?** Thematically tidy under the art direction, but it
  may collapse two distinct pieces onto one axis. See [ART-DIRECTION.md](ART-DIRECTION.md).

Resolved by the art direction (2026-08-15), pending build:

- **Blockers** are encroaching shadow; the removal rule is *shadow recedes from light*,
  so clearing adjacent tiles pushes it back.
- **Pinball** is a shadow pooling on the glass with a visible wind-up — the telegraph the
  design plan asked for.
- **Difficulty selection** is framed as an opening values question, not an Easy/Normal/Hard
  menu.

Not blocking any stage, but unresolved:

- **The game's name.** `CLAUDE.md` still says "Mind Matcher (name pending)".
- **Newcomer onramp.** If the Puyo match rule wins, decide whether to ship a gentler
  mode or strong onboarding, or accept the learning curve.

## Deferred (deliberately not built yet)

- **A link from the portfolio to the game.** `/game` works but nothing points at it yet.
- **Migrating the portfolio from Create React App to Vite.** CRA is unmaintained, and it
  is the reason the two toolchains need `concurrently` and `src/setupProxy.js` to share a
  dev server. Migrating collapses both into one Vite app and deletes that seam.
- **The narrative wrapper** — hallway, face, eye, brain intro, memory vignettes. Per the
  design plan, a separate workstream after the core matcher is proven fun.
