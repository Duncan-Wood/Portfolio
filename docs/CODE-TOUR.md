# Code Tour

A complete walkthrough of how this repository works, assuming no prior
knowledge of it. Start here; the source files carry the detail, and
[PROGRESS.md](PROGRESS.md) carries the current state and open questions.

---

## 1. What this repository contains

Two independent applications that share a URL:

| | Lives in | Built with | Served at |
|---|---|---|---|
| Portfolio | `/src` | Create React App | `/` |
| Game | `/game` | Vite + Phaser 4 + TypeScript | `/game` |

They share **no code, no components and no dependencies**. They are joined at
exactly three seams, and it is worth knowing all three because almost every
"why is it like that?" question about the plumbing traces back to one of them:

1. `package.json`'s `start` script runs both dev servers at once
2. `package.json`'s `build` script builds both and copies the game's output into
   the portfolio's output
3. `src/setupProxy.js` makes the game reachable through the portfolio's dev
   server

---

## 2. How the two apps become one site

### In development

`npm start` runs two servers simultaneously:

```
Create React App  ->  localhost:3000     (the portfolio)
Vite              ->  localhost:5173     (the game)
```

A browser page has a single origin, so the game has to appear to live on
`:3000`. `src/setupProxy.js` does that: it forwards anything under `/game` to
`:5173`.

Two details in that file are load-bearing:

- **The trailing-slash redirect.** Vite is configured with `base: '/game/'`, so
  it writes asset URLs relative to that. Request `/game` without the slash and
  the browser resolves sibling assets against `/` instead, and everything 404s.
- **`ws: true`.** Vite keeps a WebSocket open to the page so it can push "this
  file changed" — HTTP alone can't, because only the client may start a
  conversation. A WebSocket starts as an HTTP request carrying an `Upgrade`
  header, and a proxy that doesn't forward upgrades silently kills it. Without
  this flag the page loads but stops live-reloading.

### In production

There is no proxy, because there are no servers. `npm run build` produces a
folder:

```
build/
  index.html                     <- portfolio
  static/js/main.*.js
  game/
    index.html                   <- game
    assets/index-*.js
```

`build/game/index.html` references `/game/assets/index-*.js`, and that file
exists at exactly that path. The URL structure and the folder structure are the
same thing, so a static host just reads bytes off disk.

> **Previewing the build:** use `npx serve build`, **not** `serve -s build`. The
> `-s` flag rewrites every request to the root index, which hides `/game`
> entirely.

---

## 2b. The portfolio, component by component

Much simpler than the game, and worth reading first because it sets up the
contrast.

**It is one page.** `App.js` has exactly two routes: `/` renders everything, and
anything else redirects home. The nav does *not* route — it scrolls.

```
index.js              creates the React root, wraps in StrictMode + BrowserRouter
  └── App.js          two routes: "/" and a catch-all redirect
        └── StandardPortfolio.jsx    <Nav/> + six sections in order
              ├── nav.jsx        scrolls to section ids (react-scroll)
              ├── home.jsx       headshot, name, social links
              ├── About.jsx      static prose
              ├── Experience.jsx data array -> cards
              ├── Projects.jsx   two lists, hover-preview cards, show-more
              ├── Skills.jsx     grouped tags, linked or plain
              └── Contact.jsx    EmailJS form, no backend
```

Seven things will surprise you, and each is explained at the code:

| Surprise | Explained in |
|---|---|
| Section `id`s are an untyped contract with the nav — rename one and its link dies | `nav.jsx`, and inline at every section's `id` |
| `Link` is aliased to `ScrollLink` so it is not mistaken for the router's `Link` | `nav.jsx` |
| The scroll offset is `?? -100`, not `\|\| -100`, because Contact passes an explicit `0` | `nav.jsx` |
| Content lives in data arrays, not JSX | `Experience.jsx` |
| There is no backend — EmailJS relays from the browser, and its public key is public by design | `Contact.jsx` |
| Images are imported (so the build fingerprints them); `/resume.pdf` is the deliberate exception | `home.jsx` |
| The hover GIFs are 1-41MB and are NOT in the bundle — first hover pays the download | `Projects.jsx` |

State is rare: four `useState` calls in total — the mobile menu, the projects
show-more toggle, per-card hover, and the contact form's status.

---

## 3. The game's architecture

The single most important thing to understand:

> **The game logic contains no Phaser, and the Phaser code contains no game
> logic.** (`main.ts` imports Phaser to build the config; `BoardScene` is the
> only file where Phaser and behaviour meet.)

```
              ┌─────────────────────────────────────────┐
              │  BoardScene.ts      (the only Phaser)   │
              │  reads keys, drives the clock, draws    │
              └───────┬───────────────────────┬─────────┘
                      │                       │
         ┌────────────▼─────────┐   ┌─────────▼──────────┐
         │ input/               │   │ fixed-timestep.ts  │
         │ InputTranslator      │   │ real time -> steps │
         │ DAS, ARR, latches    │   └────────────────────┘
         └──────────────────────┘
    neither imports Simulation — BoardScene owns and wires all three

                    ┌───────────────────────────┐
                    │ engine/Simulation         │
                    │ the clock and state machine│
                    └─┬────────────┬────────────┘
                      │            │
        ┌─────────────▼──┐  ┌──────▼─────────┐
        │ engine/        │  │ engine/        │
        │ FallingPair    │  │ matching       │
        │ the live piece │  │ groups, chains │
        └─────────────┬──┘  └──────┬─────────┘
                      │            │
                    ┌─▼────────────▼─┐
                    │ engine/Board   │
                    │ what is where  │
                    └────────────────┘
```

Why this matters in practice: **game feel is testable**. DAS timing, the lock
delay, whether soft drop carries across a piece — all of it runs in a unit test
in about a millisecond, instead of requiring someone to play the game and form
an opinion. There are 121 tests and none of them open a browser.

The rule to keep: if a change adds a *rule* to `BoardScene.ts`, it is in the
wrong file.

---

## 4. The layers, bottom to top

What each module is for, and where to look when you need the reasoning.

**The *why* lives in the source.** Every decision, trap and piece of bug history
is a comment on the code it applies to, so this section is a map rather than a
second copy — open the file and the rationale is at the line.

| Module | Owns | Open it for |
|---|---|---|
| `engine/grid.ts` | `COLUMNS` 6, `VISIBLE_ROWS` 12 + `HIDDEN_ROWS` 1, `PIECE_TYPE_COUNT` 4 | why row 0 is the top; why there is a hidden row; why four colours and not six |
| `engine/board.ts` | which cell holds which colour; gravity (`settle`) | why `place` throws rather than overwriting; why `settle` makes a locked pair split apart |
| `engine/falling-pair.ts` | the two-tile piece, its orientation and movement | what a wall kick is and how the kick direction is derived; why `lock()` writes both halves unconditionally |
| `engine/matching.ts` | the match rule, clearing, cascades, scoring | why groups are connected rather than lines; why `clearStep` deliberately omits the settle; why flood fill marks visited on *push* |
| `engine/simulation.ts` | the clock and the state machine | why `fallProgress` is a fraction; the lock-delay reset asymmetry; why input is refused mid-cascade |
| `input/input-translator.ts` | DAS, ARR, and the two release latches | why the latches exist at 16x gravity; why a blocked shift zeroes the repeat timer |
| `fixed-timestep.ts` | real elapsed time into fixed steps | why a fixed timestep at all; why the clamp is part of the loop rather than a guard |
| `tuning.ts` | every feel dial | what each dial does, in milliseconds; why DAS matters more on a 6-wide board |
| `palette.ts` | piece type to colour | why a mismatched length renders invisible tiles rather than erroring |
| `scenes/BoardScene.ts` | Phaser: input, the clock, drawing | why the field is `inputTranslator` and not `input`; why the pair is hidden while resolving |

Two things worth carrying in your head, because they explain most of the layout:

- **The engine never imports Phaser**, and `BoardScene` never contains a rule.
  That is what makes game feel unit-testable.
- **The board is the bottom.** Everything above reads and writes it; it has no
  opinion about the rules of the game.

## 5. The life of one piece

Following a single pair end to end ties every layer together:

1. **Spawn.** `Simulation.spawn()` takes the colours from `upcoming` (drawn one
   piece ahead for the preview), draws a replacement, resets the per-piece
   timers, and constructs a `FallingPair` at column 2, orientation 0, with its
   pivot in the topmost visible row. Its satellite is therefore in the hidden
   row above — on the board, but not drawn. If either of those cells is already
   taken, no pair spawns and the game is over instead.
2. **Fall.** Each `update`, `fallProgress` grows by `delta / interval`. When it
   crosses 1, `pair.fall()` moves down a row and 1 is subtracted.
3. **Player input.** The scene reads the arrow keys, resolves a direction, and
   hands a frame to `InputTranslator`, which decides whether this is an
   immediate move, an auto-repeat, or nothing. Successful moves reset the lock
   delay.
4. **Land.** `canFall` returns false. `lockTimer` starts accumulating.
5. **Lock.** After `lockDelay`, `pair.lock(board)` writes both halves onto the
   board and calls `settle()` — where the halves may split and come to rest at
   different heights.
6. **Peek.** If `findGroups` finds nothing, the next pair spawns immediately and
   we're back at step 1.
7. **Cascade.** Otherwise `resolving` becomes true and beats alternate:

   ```
   clear   -> a group vanishes, tiles left hanging over the hole
   settle  -> those tiles drop
   clear   -> whatever that landing completed vanishes in turn
   ...     -> until a clear finds nothing
   ```

   Each link scores at double the multiplier of the previous. Input is refused throughout.
8. **Done.** The next pair spawns.

---

## 6. Working on it

From `game/` (Node 24 activates on `cd` via `mise`):

```
npm test        # none of them open a browser
npm run typecheck
npm run dev
```

Run these from `game/`, **not** the root — the root `npm test` is CRA's Jest in
watch mode and will hang a non-interactive shell.

### Tuning by feel

Every feel dial is in `src/tuning.ts`, and in dev builds the scene exposes its
copy as `window.tuning`:

```js
tuning.autoShiftDelay = 100      // DAS
tuning.autoRepeatInterval = 30   // ARR; 0 means slide to the wall
tuning.fallInterval = 350
tuning.chainLinkDelay = 700      // slow a cascade down to watch it
```

Changes take effect on the next frame. (Both consumers re-read `this.tuning.x`
per frame; the trap that would break that is documented on each of them.)

### Testing in a browser

Chrome pauses `requestAnimationFrame` for hidden tabs — the window must be
visible and frontmost or every timing measurement is meaningless. See
[PROGRESS.md](PROGRESS.md).

---

## 7. Known sharp edges

Tracked in [PROGRESS.md](PROGRESS.md) under "Open questions" and "Deferred" —
that file is the single record, so it does not get a second copy here. The short
version: chain scoring is a placeholder, a top-out ends the game but offers no
restart short of a page reload, and nothing is animated smoothly yet.
