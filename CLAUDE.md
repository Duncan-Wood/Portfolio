# Connected

This repo holds two things:
- the React portfolio at `/` — stable, and the crawlable default. Keep it that way.
- the game in `game/` — served at `/game`, and the active work.

## Stack
- `game/` is a self-contained Vite package: Phaser 4 + TypeScript. Browser only.
- 60fps and low input latency, **within a light resource budget**. I don't want to
  hijack a visitor's GPU — this is a page on my portfolio that a stranger opens on
  whatever machine they have, not a game they chose to install. Prefer the cheaper
  technique; measure before spending.
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

## What this is

**A portfolio you play.** The storyboard's four memories are the résumé — High School,
College, DC, Software Engineer — and `README.md` is the same facts as a CV. The game is
the other route through them, not a puzzle with a story attached.

The standard portfolio stays the landing page and the crawlable default; the game is a
prominent alternate route, linked from the hero and both nav menus, with a way back in
the storyboard's own wording. It carries no obligation to list experience. It has to be
good, and it has to lead to me.


## Working style
- I'm an experienced engineer but new to game dev. Explain game-dev-specific
  choices (lock delay, DAS, tween easing) rather than assuming I know them.
- One stage at a time. Don't build ahead of the current stage.
- Write the engine test first, then the implementation.
- **Ask me questions about as often as I ask you.** Decisions about voice, pacing,
  tone and scope are mine, and picking them quietly means I find out by reading a
  diff. Prefer two to four specific either/or choices over open questions — name the
  one you'd pick and why, then let me overrule. Ask *before* building the thing that
  depends on the answer.
- **Never commit without my say-so for that specific commit**, and author commits as
  me with no Claude attribution. Split large work into commits I can actually review;
  one enormous diff means I stop understanding my own codebase.
- Slow down. I would rather build something good than something fast.

## Comments
One or two sentences, and only where the code cannot say it itself. A comment must
read the same in ten years: no war stories, no "this used to be X", no bug
post-mortems, no citations of design docs or other games, no measurements from a
session that is over. Keep one where it names a trap or a cross-file invariant a
reader would otherwise trip over.

## Traps
- **Chrome renders zero frames in a hidden tab.** It pauses `requestAnimationFrame`
  entirely, so timing measured from a backgrounded window is meaningless. The window
  must be visible and frontmost.
- **A frame that throws kills the game until reload.** An exception escaping
  `BoardScene.update` propagates out of Phaser's `TimeStep.step` and the rAF chain is
  never re-requested. It reads exactly like the hidden-tab problem — the tab still
  reports visible and focused, and the FPS readout freezes on its last value. Tell
  them apart by checking whether `game.loop.frame` advances, then read the console.
  `Board.place` throws on an occupied write, so scripting the board from the console
  is the likely way to trip it.
- **`public/_redirects` is a bare `/*  /index.html  200` catch-all.** Real files beat
  it on Netlify, but whether a *directory* request resolves before it does is
  unproven. If `/game` ever serves the portfolio, add `/game/*  /game/:splat  200`
  above the catch-all.

## Open questions
In `OPEN-QUESTIONS.md`. An unmade decision goes there, never into a comment
beside the code it will change.
