# Connected

A Phaser 4 + TypeScript puzzle game, served at `/game`. Its own Vite app with its
own dependencies, sharing a repo and a deploy with the portfolio at the root.

## Running it

Every command below must be run from inside `game/`. The root package has its own
`test` and `build` that deliberately ignore this directory.

```
npm install
npm run dev         # the game alone, or /game/ via the root dev server
npm test            # vitest, everything except the Phaser scenes
npm run typecheck   # tsc --noEmit
npm run build       # typecheck, then vite build to dist/
```

From the repo root, `npm start` runs both apps on one server at `:3000` and
`:3000/game/` (or the next free port), and
`npm run build` builds both into `build/`. To check a production build, use
`npx serve build` — `serve -s build` rewrites every path to the SPA index and
breaks asset loading under `/game`.

## Layout

`engine/` is the game: grid, pieces, gravity, matching, chains, scoring. It
imports nothing from Phaser, so all of it is unit tested. `input/` holds the
DAS/ARR and key-latching rules and is Phaser-free for the same reason — game feel
is decided by tests rather than by hand.

`audio/` makes every sound with the Web Audio API; there are no audio files. Only
`sound-board.ts` touches `AudioContext`, so the rest is plain, tested code.

`scenes/` is everything Phaser: rendering, particles, hardware input. It reads the
engine and draws it. Logic that belongs in `engine/` must not leak here, or it
stops being testable. The rules that are not about the grid, such as saved
progress, how a run opens and the reveal and handover sequences, live in plain
modules beside `main.ts` for the same reason.

`tuning.ts` holds the feel dials. Dev builds expose them as `window.tuning`, and
both the simulation and the input translator re-read the object every frame, so a
value changed in the console applies on the next frame. Destructuring tuning into
a local breaks that.

## Licence and credits

The code is MIT licensed; see `LICENSE`.

The written text and the artwork are not covered by it. They are copyright 2026
Duncan Wood, all rights reserved:

- text: `src/memories.ts`, `src/shadow-voice.ts`, `src/intro.ts`
- artwork: `src/memory-art.ts`, `src/character-purse.ts`,
  `src/scenes/character-textures.ts`, `src/scenes/tile-textures.ts`,
  `src/transcript-page.ts`, `src/one-door.ts`, `src/review-screen.ts`

Built with [Phaser](https://phaser.io) (MIT) and the
[Sentry browser SDK](https://github.com/getsentry/sentry-javascript) (MIT). Every
sound is synthesised in code, the text uses the system monospace font, and the
pictures are either drawn in code or converted from photographs by
`scripts/photo-to-tiles.mjs`. No audio or font files are bundled.
