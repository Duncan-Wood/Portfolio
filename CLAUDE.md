# Mind Matcher (name pending)

This repo holds two things:
- the React portfolio at `/` — stable, and the crawlable default. Keep it that way.
- the game in `game/` — served at `/game`, and the active work.

The matcher is the core of a larger narrative game; build and validate the matcher first.

Full design plan: @docs/DESIGN-PLAN.md
Current stage + open questions: @docs/PROGRESS.md
Visual + thematic direction: @docs/ART-DIRECTION.md

## Stack
- `game/` is a self-contained Vite package: Phaser 4 + TypeScript. Browser only.
- Hard requirement: 60fps, low input latency.
- The portfolio is Create React App. The two toolchains are joined only by the root
  `build` and `start` scripts and `src/setupProxy.js`.

## Commands
From the repo root:
- `npm start` — both dev servers; portfolio at `:3000/`, game at `:3000/game/`.
- `npm run build` — builds both and composes the game into `build/game`.
- Preview the built site with `npx serve build`, **not** `serve -s build`. The `-s` flag
  rewrites every request to the root index and hides `/game`.

From `game/` — Node 24 activates on `cd` via `mise`:
- `npm test`, `npm run typecheck`, `npm run dev`.
- Run these from `game/`, not the root. Root `npm test` is CRA's Jest in watch mode and
  will hang a non-interactive shell.

## Architecture (non-negotiable)
- `game/src/engine/` — pure game logic. No Phaser imports. Grid, pieces, matching,
  gravity, chains, scoring. Fully unit-tested with Vitest.
- `game/src/scenes/` — Phaser rendering, input, audio, particles. Reads the engine.
- Simulation uses a fixed-timestep accumulator, decoupled from render.

## Working style
- I'm an experienced engineer but new to game dev. Explain game-dev-specific
  choices (lock delay, DAS, tween easing) rather than assuming I know them.
- One stage at a time. Don't build ahead of the current stage.
- Write the engine test first, then the implementation.
