# Connected

A Phaser 4 + TypeScript puzzle game, served at `/game`. Its own Vite app with its
own dependencies, sharing a repo and a deploy with the portfolio at the root.

## Running it

Every command below must be run from inside `game/`. The root package has its own
`test` and `build` that deliberately ignore this directory.

```
npm install
npm run dev         # localhost:5173, or /game/ via the root dev server
npm test            # vitest, engine and input only
npm run typecheck   # tsc --noEmit
npm run build       # typecheck, then vite build to dist/
```

From the repo root, `npm start` runs both apps at `:3000` and `:3000/game/`, and
`npm run build` builds both into `build/`. To check a production build, use
`npx serve build` — `serve -s build` rewrites every path to the SPA index and
breaks asset loading under `/game`.

## Layout

`engine/` is the game: grid, pieces, gravity, matching, chains, scoring. It
imports nothing from Phaser, so all of it is unit tested. `input/` holds the
DAS/ARR and key-latching rules and is Phaser-free for the same reason — game feel
is decided by tests rather than by hand.

`scenes/` is everything Phaser: rendering, audio, particles, hardware input. It
reads the engine and draws it. Logic that belongs in `engine/` must not leak here,
or it stops being testable.

`tuning.ts` holds the feel dials. Dev builds expose them as `window.tuning`, and
both the simulation and the input translator re-read the object every frame, so a
value changed in the console applies on the next frame. Destructuring tuning into
a local breaks that.