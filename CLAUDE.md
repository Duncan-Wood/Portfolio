# Mind Matcher (name pending)

This repo holds two things:
- the React portfolio at `/` — stable, and the crawlable default. Keep it that way.
- the game in `game/` — served at `/game`, and the active work.

The matcher is the core of a larger narrative game; build and validate the matcher first.

Current stage + open questions: @docs/PROGRESS.md
Visual + thematic direction: @docs/ART-DIRECTION.md

## Stack
- `game/` is a self-contained Vite package: Phaser 4 + TypeScript. Browser only.
- Hard requirement: 60fps, low input latency.
- The portfolio at `/` is Vite + React, configured in the root `vite.config.mjs`. Two
  Vite projects, not one: the game has its own base path, tsconfig and suite, and
  folding them together would mean one build whose halves need different answers to
  nearly every question. They are joined only by the root `build` and `start` scripts
  and the dev-server proxy.

## Commands
From the repo root:
- `npm start` — both dev servers; portfolio at `:3000/`, game at `:3000/game/`.
- `npm run build` — builds both and composes the game into `build/game`.
- Preview the built site with `npx serve build`, **not** `serve -s build`. The `-s` flag
  rewrites every request to the root index and hides `/game`.

From `game/` — Node 24 activates on `cd` via `mise`:
- `npm test`, `npm run typecheck`, `npm run dev`.
- Run these from `game/`, not the root. Root `npm test` runs the portfolio's own two
  tests and deliberately excludes `game/`, so it will not tell you anything about the
  game.

## Architecture (non-negotiable)
- `game/src/engine/` — pure game logic. No Phaser imports. Grid, pieces, matching,
  gravity, chains, scoring. Fully unit-tested with Vitest.
- `game/src/scenes/` — Phaser only: rendering, audio, particles, and reading the keyboard.
  Anything with rules in it belongs outside, so it can be tested without a browser.
- `game/src/input/` — DAS/ARR and the key latches. Phaser-free, so game *feel* is testable.
- `game/src/fixed-timestep.ts` — clamps the frame delta and returns whole steps.
- `game/src/tuning.ts` — every feel dial; exposed as `window.tuning` in dev builds.

## Working style
- I'm an experienced engineer but new to game dev. Explain game-dev-specific
  choices (lock delay, DAS, tween easing) rather than assuming I know them.
- One stage at a time. Don't build ahead of the current stage.
- Write the engine test first, then the implementation.
