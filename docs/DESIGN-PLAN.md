# From Zero to a Fun, Lag-Free Browser Tile-Matcher: A Design + Build Plan

> Point-in-time research, 2026-08-15. Not maintained. Where this disagrees with
> [PROGRESS.md](PROGRESS.md) or [ART-DIRECTION.md](ART-DIRECTION.md), those win.

## TL;DR
- **Build the core mechanic first in Phaser (Phaser 4, TypeScript), keeping a framework-independent "engine/logic" class separate from the rendering layer.** Phaser is batteries-included (input, tweens, audio, particles, scenes), has by far the richest match-3/falling-block tutorial and open-source-clone ecosystem to learn from, and trivially hits 60fps for a puzzle board. PixiJS is faster at raw sprite throughput but is a renderer only — overkill for a ~60–120-tile board and more assembly for a first game. Godot's web export is the wrong first choice here because of large WASM downloads and reported in-browser input/audio latency, which conflicts with the hard "lagless" requirement.
- **The fun in this genre comes from a tight loop of tension → skillful setup → cascading payoff, delivered with heavy "juice."** Puyo Puyo's chains (a buried "trigger" fuse that sets off an exponential cascade), Tetris's low-latency input (DAS/ARR, lock delay, 7-bag fairness), Dr. Mario's escalating fall speed, and Super Puzzle Fighter's power-gem-to-attack conversion all teach the same lesson: reward planning with a big, loud, satisfying resolution, and keep controls frame-tight.
- **The user's special pieces are directionally sound but need sharper, more legible identities and a unifying "memory/mind" theme.** Fire/Rain (line-clears) map cleanly onto Bejeweled/Candy Crush striped candies; Blockers map onto nuisance/locked tiles; Neurons are a great narrative-tied objective tile; Pinball and Earth are the genuinely novel ideas but are currently the least "readable" and risk feeling random or punishing — they need telegraphing, clear feedback, and a rule the player can plan around.

## Key Findings

### What actually makes this genre fun
1. **The tension–resolution loop.** As the University of Wisconsin–Milwaukee Digital Cultures Collaboratory essay "What Makes Tetris so Satisfying?" (Jan 4, 2021) puts it, Tetris "is innately satisfying because it is a game of constant stress and resolution that is never fully relieved until the player loses," and its satisfaction comes because "we make hundreds, thousands, of choices over a single session, and each one feels like it matters, because it could have been different." Every falling-block game is a pressure engine; fun is the release valve, and every decision must feel meaningful and irreversible.
2. **Chains/cascades are the emotional peak.** Puyo Puyo's signature is deferred gratification: you deliberately bury a "trigger" color so clearing it collapses stacks into an exponential chain reaction — Retronauts describes the payoff as "as viscerally satisfying as tipping over a winding line of dominoes." Scoring rewards this exponentially, not linearly.
3. **Juice converts "correct" into "satisfying."** The canonical references are Martin Jonasson & Petri Purho's "Juice It or Lose It" (GDC Europe 2012) and Jan Willem Nijman's "The Art of Screenshake" (Vlambeer, 2013). Layer feedback: squash/stretch, particle bursts, score popups, rising combo-audio pitch, brief hit-stop/freeze-frames on big clears, and subtle screen shake scaled to cascade size. (Note the counterpoint: Folmer Kelly's GDC talk warns over-juicing can hurt immersion — juice serves clarity and impact, it isn't decoration for its own sake.)
4. **Input must feel instant.** The genre lives and dies on latency. Tetris formalizes this with DAS (Delayed Auto Shift), ARR (Auto Repeat Rate), lock delay, and the 7-bag randomizer that guarantees fairness (hard drop scores +2/cell, soft drop +1/cell, rewarding active play). Elite players push DAS very low — a Hacker News analysis notes "a typical DAS for a pro player (e.g. someone like Firestorm) might be somewhere around 70ms" — but the winternebs TETRIS-FAQ advises newcomers to "start around 130ms / 8F and then keep lowering it until you cannot control it." For the web, decouple simulation from rendering with a fixed-timestep accumulator so behavior is identical on 60/120/144Hz screens.
5. **Difficulty ramps by speed and space.** Dr. Mario increases pill fall speed as you clear viruses and punishes you as vertical space shrinks; Tetris accelerates gravity per level. Escalating pace on a shrinking board is the core pacing tool.

### The reference games, decoded
- **Puyo Puyo:** Pairs drop into a grid "usually 6×12 squares in size" (per Puyo Nexus); clearing happens "when four or more Puyos of the same color connect adjacently, either horizontally, vertically, or in L- or T-shapes." Buried triggers create chains — and there is a hidden 13th row ("Ghost Puyo"): "Puyo in the 13th row can't be cleared even if they 'connect'... You can use the 13th row's properties to make chains that won't pop until the Puyo in the 13th row drops down." Scoring = `(10 × NumPopped) × (ChainPower + ColorBonus + GroupBonus)`, where chain power "starts at 40 for the first link" and 80 for the second, and "chain powers for links 1 through 5 increase exponentially, but after that it increases linearly." Competitive layer: garbage/nuisance puyos (garbage sent = chain score ÷ a default target of 70), countering (sousai), and the All Clear (zenkeshi) bonus, which "awards massive bonus points and sends a large surge of garbage to the opponent." Notably, Puyo is famously *hard for newcomers* because chain-building is non-obvious — a design warning for the user.
- **Tetris:** 7 tetrominoes, SRS rotation with wall kicks, hold piece, hard/soft drop scoring, lock delay (~0.5s in Guideline games), and the 7-bag randomizer that "makes Tetris feel fair — naive RNG produces droughts that drive players away." The genre's gold standard for input feel.
- **Bejeweled / Candy Crush:** Swap-based match-3 with cascades; match-4 makes a line-clearing special, match-5 makes a color bomb. Special candies + combos are the "big moment" players chase and the retention engine. The cascade loop is: match detected → mark tiles → remove → gravity → spawn new → re-check, with a "processing" flag locking input until the board settles.
- **Super Puzzle Fighter II Turbo:** Gems clear only when touched by a same-color Crash Gem; same-color rectangles (≥2×2) fuse into Power Gems that deal far more damage; clearing sends timed Counter Gems to the opponent (start at "5," count down each piece drop, then become normal gems). Attacks are tiered Caution (1–10 gems) / Warning (11–30) / Danger (31+). Teaches the "build big, then detonate" power fantasy.
- **Dr. Mario:** Bicolored pills (Megavitamins) vs. fixed viruses in an 8×16 bottle; match 4 in a line to clear viruses; "as you clear more viruses off the board, the pills begin falling at a faster rate," the model difficulty ramp.

### The user's special pieces vs. genre conventions
| User idea | Closest genre analog | Verdict |
|---|---|---|
| **Neurons** (unlock memories after clearing enough blocks) | Objective/"collect X" tiles in Candy Crush | Strong, on-theme; ties the mechanic directly to narrative reward. Make it the star. |
| **Blockers** (stop combos) | Nuisance Puyo / Candy Crush locked-jelly-ice tiles / SPF Counter Gems | Intuitive; the standard "pressure" tool. Give a clear removal rule. |
| **Fire** (clears 3 horizontally, red) | Horizontal striped candy; SPF Crash Gem | Very readable; matches convention. |
| **Rain** (clears 3 vertically, blue) | Vertical striped candy | Very readable; matches convention. |
| **Pinball** (swaps blocks to random spots) | Candy Crush shuffle / color-bomb chaos | Novel but risky — randomness fights the planning fantasy. Telegraph or make player-triggered. |
| **Earth** (pushes player 1 block deeper) | Garbage/nuisance rows pushing the stack up | Novel framing, currently least legible. Reframe as warned bottom-row insertion. |
| **Pairs drop / 30-sec timer / watching brain** | Puyo pairs; SPF timers; "eyes-on-objects" juice | Solid, but a hard 30s guillotine timer is off-genre for chain-planning — make it a pressure dial, not instant death. |

### Technical stack comparison
An independent benchmark (Shirajuki/js-game-rendering-benchmark, rendering 10,000 moving sprites on a Ryzen 5 4500U laptop in Edge) ranks raw 2D throughput as **PixiJS 47 FPS > Phaser 43 FPS >> Kaboom/Kaplay 3 FPS**, with Babylon.js topping at 56 FPS. Crucially, a tile-matcher renders only ~60–120 tiles plus particles, so *every* option here clears 60fps with room to spare — raw throughput is **not** the deciding factor; developer experience and tutorial availability are. (The author cautions this is a single machine/browser and Canvas-vs-WebGL comparisons "may be biased.")

- **Phaser 4 (JS/TS) — recommended first choice.** Complete 2D framework: WebGL with Canvas fallback, two physics systems, audio, keyboard/mouse/touch/gamepad input, scenes, tilemaps, cameras, tweens, particles, asset loader; ~400–500KB gzipped; 1,700+ runnable examples; the largest community. Uniquely rich puzzle-genre resources: Emanuele Feronato's multi-part Phaser 3 Bejeweled/match-3 series, several open-source Phaser Tetris clones (pgrzmil/tetro, jjcapellan/phaser3-game-jtetris, Abhiek187/tetris-clone with a TS+Rollup quickstart), Jerorx's full-featured open-source Tetris, and Stephen Gose's book *Making Match-3 Browser Games* for Phaser.
- **PixiJS v8:** Fastest pure 2D renderer (WebGPU-first, ~450KB) but "does not know what a game is" — you supply input, audio, physics, and scene management yourself. Ideal later if you outgrow Phaser; more work now.
- **Kaboom/Kaplay (JS/TS):** The most beginner-delightful API with a web playground and 90+ examples, but slowest in the benchmark (3 FPS at 10k sprites), and Kaboom itself is deprecated (Kaplay is the maintained fork). Fine for tiny games; less proven for a high-feel puzzler.
- **Godot (web export):** Excellent engine/editor but uses GDScript (a new language) and its HTML5 exports are heavy — an empty Godot 4.0 2D project's web export is reported at >40MB — with users reporting web-only input/audio lag and lower FPS (e.g., ~20–30fps in-browser vs 60+ on desktop) unless heavily optimized. Conflicts with the "lagless from the web" hard requirement.
- **Excalibur.js (TS-first):** Clean OOP/TypeScript design, pleasant for an experienced engineer, but a much smaller community and far fewer puzzle tutorials than Phaser.
- **Plain Canvas/WebGL:** Lowest overhead and latency (a vanilla-JS Tetris is very doable), but you rebuild tweens/audio/particles/scene management yourself — the slowest path to "juicy," which is where your fun budget should go.

## Details

### Why Phaser 4 + TypeScript fits *this* engineer
The user is an expert programmer but a game-dev beginner. That profile is exactly where a batteries-included framework pays off: it removes incidental complexity (render loop, sprite batching, input polling, audio, tween easing, particle emitters) so the learning budget goes to the *interesting* part — game feel and matching logic. TypeScript suits a professional (types, refactoring, autocomplete), and every option here supports it. The decisive edge is the tutorial/starter ecosystem: Feronato's series explicitly demonstrates a reusable `Match3` class that "handles what happens under the hood" separately from the framework-specific input/animation layer — precisely the architecture a strong engineer wants.

### The architecture that makes it fun *and* maintainable
Separate **game logic** (a pure data model of the grid, pieces, matching, gravity, chains, scoring — testable with plain unit tests, no rendering) from **presentation** (Phaser sprites, tweens, particles, audio). This is the single most-repeated pro tip across match-3 and Tetris writeups; it lets you verify every rule headlessly (one writeup runs its Tetris rule tests in ~70ms) and swap the visual layer freely. The cascade resolver is a loop: detect matches → mark → clear → apply gravity → spawn → re-check, guarded by a "processing" flag that locks input until the board settles.

### Game-feel checklist (implement in this order)
1. Snappy input: immediate move/rotate response, tuned DAS (start ~130ms and lower to taste) and ARR for held movement, plus a short lock delay (~0.5s) so players can slot a piece at the last instant.
2. Tween the pop and the fall (easing), never instant teleports.
3. Particle burst + score popup on each clear.
4. Rising audio pitch per chain link (the Puyo "faiyaaah" escalation).
5. Brief freeze-frame (hit-stop) and small screen shake scaled to cascade size.
6. The watching brain reacts (expression/animation) to big chains — cheap, high-personality juice on-theme with the narrative wrapper.

### Refining the special pieces so they read as original, not derivative
- **Neurons:** Make this the flagship. Tie the count cleared directly to memory unlocks so the puzzle *is* the narrative progression, and telegraph arrival with a distinct spawn animation.
- **Fire/Rain:** Keep, but make them *earned* like Bejeweled specials (created by clearing a larger group) rather than random drops, so they reward skill. Let Fire+Rain adjacency combine into a cross-clear — a legible, satisfying "combo" beat.
- **Blockers:** Give a countdown or an explicit removal rule (adjacent clear, like SPF Counter Gems) so they create planning pressure, not helplessness.
- **Pinball (novel):** Its randomness fights the genre's planning fantasy. Make it a *controlled* shuffle the player triggers, or reframe it as a rare "intrusive thought" event with a visible wind-up telegraph — turn chaos into a readable beat.
- **Earth (novel):** "Pushes the player 1 block deeper" is the least legible. Reframe as garbage-style bottom-row insertion (a proven pressure mechanic) with a warning indicator so the player can build defensively.
- **30-second timer:** A hard guillotine is punishing and off-genre for a chain-planning game (Puyo has no round timer; it uses a gradual sudden-death garbage multiplier starting around 96 seconds). Treat the timer as a per-memory pacing dial or soft pressure (like SPF's counter countdown), not instant death.

## Recommendations

**Stage 0 — Setup (Day 1).** Clone a Phaser 4 + TypeScript + Vite/Rollup starter; render a static colored grid. *Benchmark:* an empty 60fps canvas with a drawn grid.

**Stage 1 — Core drop + lock (Week 1).** Pairs dropping into a 6×12 grid (Puyo-style), left/right/rotate/soft-drop input, gravity, lock delay. Keep logic in a pure `Board`/`PuzzleEngine` class with unit tests. *Benchmark:* you can place pairs precisely and it *feels* instant.

**Stage 2 — Matching + cascades (Week 2).** Detect connected groups of 4+ (Puyo feel) or match-3 lines (Bejeweled feel), clear, apply gravity, re-check for chains; add exponential chain scoring. *Benchmark:* a deliberately buried trigger sets off a multi-step chain.

**Stage 3 — Juice pass (Week 3).** Tweens, particles, score popups, rising chain audio, hit-stop, screen shake, and the watching-brain reaction. *Benchmark:* playtesters visibly react to a big chain. This is where "correct" becomes "fun."

**Stage 4 — One special piece at a time (Week 4+).** Neurons first (narrative tie), then Fire/Rain (readable), then Blockers, then prototype Pinball and Earth *last* with heavy telegraphing. Playtest each in isolation; cut anything that reads as random or unfair.

**Stage 5 — Tune difficulty + polish.** Ramp fall speed as blocks/Neurons clear (Dr. Mario model); add a start-speed selector. Only after the core is fun, revisit whether the 30s timer helps or hurts.

**Thresholds that change the plan:** If Phaser's bundle size or abstraction ever blocks you on *feel*, drop to PixiJS + your already-separated logic class (minimal rewrite). If you need pixel-perfect competitive input latency, profile a fixed-timestep loop first before switching engines. If you later decide to ship a downloadable desktop build too, reconsider Godot *at that point* — not now.

## Caveats
- The Shirajuki benchmark is one mid-range laptop/browser; treat FPS figures as directional (the author warns Canvas-vs-WebGL comparisons "may be biased"). All listed frameworks are far more than fast enough for a tile board.
- "Lagless from the web" depends as much on *your* loop and asset sizes as on the framework: use a fixed-timestep accumulator, keep texture atlases small, and cap the delta because `requestAnimationFrame` pauses on backgrounded tabs (returning one huge delta on refocus).
- Puyo Puyo's chain depth has a genuine learning curve and is "hard for newcomers"; if you want broad accessibility, offer a gentler match rule or strong onboarding, or you'll inherit that reputation.
- Some framework version/date claims (e.g., Phaser 4 stability and release dates) come from a single vendor blog; verify current versions on the official Phaser site before committing.
- Kaboom is deprecated; if that ecosystem appeals, use the maintained Kaplay fork, but expect the weakest raw performance of the options here.
- This plan deliberately defers the narrative wrapper (hallway, face, eye, brain intro, memory vignettes). Build and validate the fun of the core matcher first; the storyboard's cutscene layer is a separate, later workstream that will be easier to bolt on once the playable core exists.