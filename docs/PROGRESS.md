# Progress

Current stage, decisions, and open questions. Stages are defined in
[DESIGN-PLAN.md](DESIGN-PLAN.md) under Recommendations. Update this file at the end of
each stage.

For how the code works, read the source: `CLAUDE.md` maps the layers, and every module
carries a header explaining what it owns and why.

## Status

**The objective is a place on the board now. That is the change the last two
weeks were missing: everything shipped between the shadow's face and the
escape-room pivot was craft, and craft cannot manufacture a reason to play.**

- **Neurons.** `game-pieces-1.jpg` specifies them and they had never been built —
  "Neurons unlock memories & appear after a certain # of box clears. Activated by
  popping an adjacent block." A board seeds three, anchored in cells; clearing a
  group beside one lights it and draws a thread to the last one lit, so the
  storyboard's memory map is drawn BY the play. Every progression before this
  measured something — score, then connections, then pads on a ring — and a
  measure can be filling toward anything, which is why the writing it paid out
  always felt bolted on. You cannot plan a route to a number.
- **The goal and the threat are no longer the same axis.** The old lock was "free
  every shadow" while hesitation FED the shadow, so dithering lengthened the
  puzzle instead of costing anything. `isSolved` is now every neuron lit and says
  nothing about shadows.
- **A piece budget is the constraint.** Twelve on the first lock, counting down
  beside the preview. Cutting gravity removed the only thing that made a
  placement a commitment; a count restores it without putting a clock back in
  front of a puzzle. Run out with a neuron dark and the BOARD is re-seeded, never
  the run — a lost board never costs a memory already earned.
- **The aha being chased, and it is seeded deliberately on lock 1:** freeing a
  shadow restores the tile it took, so **a shadow beside a neuron is an
  opportunity, not a threat**. Clearing there repairs the board and lights the
  node. Nobody is told; it is found. It is also the project's own sentence — the
  part of you that stopped is the part you build from.
- **One story in three places.** The ring around the board now measures the
  objective rather than cells cleared, so the node on the board, the ring around
  it and the node on the brain all move together. The escalating
  `connectionsPerNode` schedule is gone with the meter it drove.
- **Measured, with a bot playing at RANDOM over 300 runs of lock 1** (a weak
  proxy — it is here to bound the board, not to judge it):

  | budget | solved | median win | how the losses ended |
  |---|---|---|---|
  | 12 | 4% | 7 pieces | 6 topped out; the budget ends the board, as designed |
  | 24 | 10% | 14 pieces | 96 topped out |
  | 200 | 12% | 15 pieces | **all 265 topped out** |

  Two readings. The budget is doing its job — at twelve, a board ends because it
  is spent rather than because the stack reached the ceiling. And the plateau at
  12% with unlimited pieces is random play filling the board, not the lock being
  unwinnable: **the budget is not the binding constraint, competence is.**
  Whether twelve is right for a person is unproven and a random bot cannot
  settle it.

- **Then measured again with a bot that PLAYS FOR NEURONS**, which is the thing
  a random one could not do. It searches every placement, resolves the cascade,
  and scores lighting a neuron above everything else. It also checked itself
  against the real engine after every placement — several hundred of them,
  **zero mismatches** — so the numbers are the engine's, not a model's.

  It falsified the reading above. Competence takes lock 1 from 4% to 56%, and
  then stops dead:

  | budget | solved | median win |
  |---|---|---|
  | 12 | 56% | 5 pieces |
  | 18 | 56% | 9 pieces |
  | 30 | 56% | 9 pieces |

  **Identical at every budget.** More pieces bought nothing, because the boards
  it failed were not hard, they were impossible — and the failures averaged 1.7
  of 3 neurons lit, so they got most of the way and hit a wall. Dumping one
  showed the wall exactly: a neuron in the bottom corner with two walls, a
  shadow and a single tile beside it. Light that one tile's group or never
  light it, and since neurons are ANCHORS nothing can ever fall in to help.
  **The binding constraint was neither the budget nor competence. It was that
  `seedLock` produced dead boards.**

  The seeder now sites neurons only where a clear can actually reach them, keeps
  the deliberate shadow from taking a neuron's last way in, and prefers cells
  with nothing on top — a buried neuron is solvable but it is a dig, and siting
  for room alone pushed the median solve from four pieces to twelve. After it:

  | budget | solved | median win |
  |---|---|---|
  | 12 | 50% | 8 pieces |
  | 30 | 69% | 8 pieces |

  The dead-board plateau is gone: the budget is a real dial again. What is left
  is a difficulty question rather than a structural one — **the first lock is
  the tutorial and it should be beaten, and at 50% for a bot playing well it is
  not.** Sixteen runs per cell, so treat single points as noise; the flatness in
  the first table is the finding, not the exact percentages.

**Stage 3 — Juice is done. The work now is turning a working matcher into a game,
which is a different problem and the one being worked.**

- **The shadow possesses tiles now.** It used to drop into an empty cell, which made it
  garbage-dropping with a face. It takes a tile you already placed, remembers its colour,
  and shows that colour through itself — so it genuinely severs connections, the board
  never grows from it, and driving it off gives your tile back rather than punching a
  hole. Shadows have two strengths; a link damages by its depth, so a chain is the fast
  answer and a single clear is always still an answer. The tier cap is 2 because a bot
  run through this engine produced **zero** chains of 2+ across 26 pieces — a threat
  whose only answer is a skill nobody has is not difficulty.
- **A chain and a memory no longer ruin each other.** Surfacing a fragment used to fire
  from inside `drawProgress` mid-cascade, freezing a five-link chain at link three with
  `N CHAIN` still burning at 64px behind the fragment. Fragments are banked until the
  board settles and then surface one per placement, so a chain worth four of them pays
  one now and one on each of the next three.
- **Measured, and the reason all of this started:** the whole memory plus its question
  took **53 seconds and 26 pieces**, there were **zero** shadows on the board when the
  question arrived (so its payoff was nothing), and one 4-link chain paid 61 connections
  against the 43 a whole memory costs.
- **Open, and being designed:** see the "Finish the Memory" memo — a run should be
  winnable, the shadow should eat progress off the ring, and what the player types should
  do something. The player must never be made to write the story.

- **Stages 0–2 are closed.** Setup, the engine, the scene, input, tuning, matching,
  cascades and exponential chain scoring are all built and verified in Chrome.
  Stage 1's benchmark was judged met ("responsive, just pointless" — DAS 130 / ARR 40
  stand, no sweep needed). Stage 2's was met by hand-building a **three-link chain
  scoring 280**, predicted before the trigger dropped and confirmed exactly.
- **Done in Stage 3** — the cascade resolves one link per beat instead of instantly;
  clearing and settling are separate beats; the next-piece preview is built; the hidden
  13th row is in; the game ends when a pair has nowhere to spawn, and **R starts a new
  one**; and nothing teleports any more — the pair descends between rows, cleared tiles
  shrink away, and settled tiles fall into their holes.
- **Stage 3's checklist is now complete.** Hard drop and a 400ms gravity fixed the pacing;
  procedural Web Audio, particles, hit-stop, screen shake, the landing bounce, score popups
  and a vignette fixed the presentation. Comfortably over 60fps with the filter running.
- **The identity pass has started.** Tiles carry a **figure** as well as a colour — a pad,
  an open via, a chip, a branching trace — drawn as jewel-toned panes with the leading
  around them dark. This was the cheapest identity available and it fixes a real
  accessibility problem: four hues alone are not separable by every player, and everybody
  reads a silhouette faster than a hue under time pressure. The figures come from the
  circuit vocabulary because a tile is a node in a network; the first pass used a star, a
  circle, a square and a diamond, which read fine and meant nothing.
- **A run has a point now.** Progress is counted in **connections** — cells cleared,
  weighted by how deep into a cascade they were — and it fills a circuit that rings the
  board, one pad at a time. Closing that circuit surfaces one fragment of a memory over
  the held board, and the fragment lights permanently in the panel beside it, so the
  memory assembles as you play. One memory is written, in four fragments, ending on a
  question. This is what replaces the score as the progression.
- **The shadow has a face.** It shipped as a near-black square with a hairline
  broken outline, which read as a rendering fault rather than as an antagonist. It is
  now a creature — hunched body, thin antennae, two lit eyes — that breathes, leans and
  blinks, climbs out of the board when it arrives, and is blown outward when a clear
  drives it off. It is lit in the game's own violet on purpose: the thing opposing you
  is part of this mind, not an invader from outside it. `shadowInterval` is 6s now,
  played rather than guessed.
- **The portfolio is on Vite.** CRA was deprecated and had started blocking installs of
  anything current. What changed for the game: `src/setupProxy.js` is gone and the `/game`
  proxy lives in the root `vite.config.mjs`, and the root test runner excludes `game/`.
  Run the game's suite from `game/`, as before.
- **The question takes an answer, and answering is the strongest move in the game.** It
  waits on a person rather than a clock. Type anything and every shadow on the board is
  driven off, deepest first, the pitch climbing a semitone a cell; press enter on an empty
  line and you decline and keep them. The engine is told THAT an answer happened, never
  what it said. The answer stays beside its memory on the panel.
- **Losing is the shadow winning.** It said `TOPPED OUT` — arcade text, in a game whose
  antagonist by then has a face, a voice and a nine-line script. Now the run ends the way
  the game is about: every lit connection goes out in turn, falling a semitone a cell,
  which is `answerVoice` run backwards — the answer beat is the moment this is the
  opposite of. The memory panel darkens with them, because what a run built is what it
  loses. Then two lines: the game's, and under it the shadow's, which is the only time it
  gets the last word, over static: a noise texture scrolled and re-alpha'd every frame,
  with the colour draining under it. Both lines are placeholders in `shadow-voice.ts`.

  One rule the closing line has to obey, learned by breaking it: **it must not give the
  player permission to leave.** The first version was "You can start again tomorrow" —
  exactly in character, and the worst thing to read while deciding whether to press R.
  The antagonist telling you to stop only works if stopping is not a thing you might
  actually do. The restart prompt sits under it now, which losing never had: the pause
  screen said `esc to resume` and the ending said nothing, so R was a secret.
- **Next, and the only thing left in Stage 3** — its benchmark: *playtesters visibly react
  to a big chain.* That needs another person. What it is really testing is the pair of
  things still unproven — whether one pair of lookahead is enough to plan a chain with,
  and whether the chain payoff feels like anything — and it is what unblocks Stage 4.

> **Testing in a browser:** Chrome pauses `requestAnimationFrame` entirely for hidden tabs,
> so a backgrounded window renders **zero** frames and every timing measurement is
> meaningless. The window must be visible and frontmost.
>
> **A frame that throws stops the game for good.** An exception escaping `BoardScene.update`
> propagates out of Phaser's `TimeStep.step` and the rAF chain is never re-requested — the
> game is dead until a reload. It *reads* exactly like the hidden-tab problem above, because
> the tab still reports `visible`, still reports `hasFocus`, and the FPS readout keeps
> showing whatever it last rendered. Tell them apart by checking whether `game.loop.frame`
> advances while your own `requestAnimationFrame` callback still ticks; then read the
> console. `Board.place` throwing on an occupied write is deliberate, so scripting the board
> from the console is the likely way to trip this.

## Live tuning

`src/tuning.ts` holds every feel dial, and dev builds expose the scene's copy as
`window.tuning` — changes take effect on the next frame. The dials, what each one
does, and the console recipe are all documented in that file.

## Why the code is shaped this way

Read the source — every module carries a header explaining what it owns and why,
and the traps are commented at the lines they apply to. `CLAUDE.md` under
"Architecture" is the map of which file to open.

## Locked decisions

Settled and tested, across Stages 1 and 2. Don't re-litigate without a reason.

The **reasoning for each lives as a comment on the code it governs** — this list
records *what* was decided and where to read *why*, so the two cannot drift.

| Decision | Why it is that way |
|---|---|
| Row 0 is the top; gravity increases the row number | `engine/grid.ts` |
| Pairs spawn in column 2, pivot in the topmost visible row | `engine/simulation.ts` (`SPAWN_COLUMN`, `nextPair`) |
| A locked pair's halves settle independently and may split | `engine/falling-pair.ts` (`lock`) |
| Lock delay resets on a successful move, never a blocked one | `engine/simulation.ts` (`afterInput`) |
| Fall progress is a fraction of the interval, not banked milliseconds | `engine/simulation.ts` (`fallProgress`) |
| Soft drop does not carry across a lock | `input/input-translator.ts` (the latches) |
| DAS does not stay charged across a lock | `input/input-translator.ts` |
| The engine never clamps its own delta; the caller does | `engine/simulation.ts`, `fixed-timestep.ts` |
| Match rule: connected groups of 4, any shape (Puyo, not lines) | `engine/matching.ts` |
| Four colours, not six | `engine/grid.ts` |
| Chain scoring is `cellsCleared × 10 × 2^linkIndex` — a placeholder | `engine/matching.ts` (`scoreLink`) |
| One pair of lookahead, shown beside the board | `engine/simulation.ts` (`upcoming`) |
| A hidden row above the visible field, where tiles rest but stay inert | `engine/grid.ts` (`HIDDEN_ROWS`), `engine/matching.ts` (`findGroups`) |
| Pairs spawn with the satellite in the hidden row, so no half is ever off-board | `engine/simulation.ts` (`SPAWN_ROW`) |
| Board left-aligned in a 620-wide canvas to make room for the preview | `scenes/BoardScene.ts` |
| Space hard-drops: slam, commit, no lock delay | `engine/simulation.ts` (`hardDrop`) |
| Gravity is 400ms/row, because nobody waits for gravity in this genre | `tuning.ts` (`fallInterval`) |
| Audio is synthesised, not sampled — no asset files, no licences | `audio/voices.ts`, `audio/sound-board.ts` |
| Sound decisions are pure data and unit-tested; only playback touches the browser | `audio/voices.ts` |
| Chain pitch rises a semitone per link, capped two octaves up | `audio/voices.ts` (`popVoice`) |
| The camera rolls as well as shakes — translation alone reads as a glitch | `scenes/BoardScene.ts` (`kickCamera`) |
| Hit-stop freezes the simulation without banking the frozen time | `scenes/BoardScene.ts` (`update`) |
| Particles are tinted from one runtime-baked texture, so no art is needed | `scenes/BoardScene.ts` (`SPARK_TEXTURE`) |
| The vignette is deliberately weak: readability beats atmosphere | `scenes/BoardScene.ts` |
| **No** lit platform — built, judged wrong, and cut. Revisit after the playtest | `scenes/BoardScene.ts` (comment above the vignette) |
| The chain resolves over time: clear, then settle, one beat each | `engine/simulation.ts` (`advanceChain`), `engine/matching.ts` (`clearStep`) |
| Single-key bindings are gated while the question is taking an answer | `scenes/BoardScene.ts` (`update`, `awaitingAnswer`) |
| Input is refused while a cascade resolves, and after a top-out | `engine/simulation.ts` (`acceptsInput`) |
| R restarts from any state, without tearing the scene down | `engine/simulation.ts` (`restart`), `scenes/BoardScene.ts` (`restart`) |
| Space resumes as well as Escape; `JustDown` consumes the press, so it cannot also hard-drop | `scenes/BoardScene.ts` (`update`) |
| Escape pauses via our own flag, not `scene.pause()`, which would eat the key | `scenes/BoardScene.ts` (`setPaused`) |
| `settle` reports which tiles moved, so the scene can animate the drop | `engine/board.ts` (`TileMove`) |
| The engine leaves each cascade beat's result for the scene to read; no callbacks | `engine/simulation.ts` (`beatsPlayed`, `lastBeat`) |
| A beat is one tagged `CascadeBeat`, not two fields told apart by object identity | `engine/simulation.ts` (`CascadeBeat`) |
| `piecesLocked` and `lastLanded` announce a landing; the spawn counter misses two | `engine/simulation.ts` (`lockPair`) |
| The pair is drawn at `row + fallProgress`, so gravity looks like falling | `scenes/BoardScene.ts` (`drawPair`) |
| The pair's hidden-row half is clipped to the board, not hidden or floated | `scenes/BoardScene.ts` (`drawClippedToBoard`) |
| The hidden-row half is **cropped**, not resized and not masked | `scenes/BoardScene.ts` (`drawClippedToBoard`) |
| Every piece type has a distinct shape as well as a distinct colour | `palette.ts` (`PIECE_SHAPES`) |
| Tile art is baked into textures once at boot, not drawn per frame or loaded | `scenes/tile-textures.ts` |
| The spawn cells being occupied ends the game; the board is left on screen | `engine/simulation.ts` (`spawnOrTopOut`), `scenes/BoardScene.ts` (`refreshGameOver`) |
| Losing plays out: the connections die one by one, then the shadow speaks | `scenes/BoardScene.ts` (`loseTheBoard`) |
| The ending's two lines are placeholders, isolated with no imports | `shadow-voice.ts` (`CONNECTION_LOST`, `SHADOW_CLOSING_LINE`) |
| Progress is measured in **neurons reached**, not cells cleared. `connectionsMade` survives as score, not as progression | `engine/neurons.ts`, `engine/simulation.ts` (`connectionsMade`) |
| The meter is the board: a circuit ringing it, lit one pad at a time — and it measures the OBJECTIVE now, not cells cleared | `scenes/BoardScene.ts` (`drawProgress`), `track-geometry.ts` |
| Solving the LOCK surfaces ONE fragment, over the held board — never a cutscene | `scenes/BoardScene.ts` (`checkLock`, `revealNextNode`) |
| Fragments light permanently in the panel: the memory assembles as you play | `scenes/BoardScene.ts` (`redrawMemoryPanel`) |
| A memory's question follows its last fragment rather than replacing it | `scenes/BoardScene.ts` (`pendingReveal`) |
| A lock is solved by lighting every neuron; the shadows are beside the point | `engine/locks.ts` (`isSolved`) |
| A neuron is ANCHORED: it does not fall, and nothing falls past it | `engine/grid.ts` (`isAnchored`), `engine/board.ts` (`settle`) |
| `landingRow` scans from the top down, since anchors break the no-gaps invariant | `engine/board.ts` (`landingRow`) |
| Lighting a neuron is one hit per neuron per link, like shadow damage | `engine/neurons.ts` (`lightAdjacent`) |
| A board hands you a piece budget; spending it re-seeds the BOARD, never the run | `engine/locks.ts` (`Lock.pieces`), `engine/simulation.ts` (`pieceBudget`) |
| A spent board stops feeding the shadow, but its last cascade still plays out | `engine/simulation.ts` (`update`) |
| The coming memory's shape fills in beside the board as it is earned | `scenes/BoardScene.ts` (`redrawMemoryPanel`) |
| One node layout, shared, so the outline you fill is the shape you walk | `memories.ts` (`nodeLayout`) |
| Each memory ends on a question that is never scored or branched on | `memories.ts` (`Memory.question`) |
| The shadow is a creature, not a dark cell: hunched body, antennae, lit eyes | `scenes/tile-textures.ts` (`bakeShadow`) |
| It is lit in the game's own violet — the antagonist is part of this mind | `palette.ts` (`SHADOW_BODY_COLOR`) |
| Its eyes are baked apart from its body, so they can blink and flare | `scenes/tile-textures.ts` (`SHADOW_EYES_TEXTURE`) |
| The idle is computed per frame from one clock, never tweened | `scenes/BoardScene.ts` (`animateShadow`) |
| An arrival is announced by a counter, like a landing, and it climbs out of the board | `engine/simulation.ts` (`shadowTaken`), `scenes/BoardScene.ts` (`playShadowArrival`) |
| A link reports which shadow it freed and which it only dented | `engine/matching.ts` (`ChainLink.shadowPurified`, `shadowDamaged`) |
| Hesitation feeds the shadow every 6 seconds — played, not guessed | `tuning.ts` (`shadowInterval`) |
| The shadow **possesses a tile** and remembers its colour; it never fills an empty cell | `engine/grid.ts` (`shadowCell`), `engine/simulation.ts` (`encroach`) |
| Driving it off **restores** that colour — a repair, not a kill | `engine/matching.ts` (`damageShadow`) |
| Shadows have strength; a link damages by its DEPTH, so chains are the fast answer | `engine/grid.ts` (`MAX_SHADOW_STRENGTH`), `engine/matching.ts` |
| Two tiers, not three: a bot measured **zero** chains of 2+ in 26 pieces | `engine/grid.ts` (`MAX_SHADOW_STRENGTH`) |
| A single clear always makes progress against any tier — never a skill gate | `engine/matching.ts` (`damageShadow`) |
| One hit per shadow per link, however many cleared cells touched it | `engine/matching.ts` (`damageShadow`) |
| The creature is a **layer over the tile**, not a swapped texture | `scenes/tile-textures.ts` (`shadowBodyTexture`), `scenes/BoardScene.ts` (`shadowBodies`) |
| Nothing to take means no arrival — and, unlike before, no top-out | `engine/simulation.ts` (`encroach`) |
| A fragment waits for the cascade to finish, then surfaces one per placement | `scenes/BoardScene.ts` (`surfaceBankedFragment`) |
| The `N CHAIN` callout is hidden while the story holds the board | `scenes/BoardScene.ts` (`refreshChain`) |
| `Board.place` throws on an off-board **or** occupied write | `engine/board.ts` (`place`) |
| Nothing is exempt from `isBlocked`; the ceiling blocks like any other edge | `engine/board.ts` (`isBlocked`) |
| The game is called **Still Connected** — the title the loss screen contradicts | `shadow-voice.ts` (`CONNECTION_LOST`) |
| The portfolio stays the crawlable default; the game is a prominent alternate route | `src/components/nav.jsx`, `src/components/home.jsx` |

Two that are recorded here as well as in the code, deliberately:

- **The frame-delta clamp lives inside `FixedTimestep`.** This flip-flopped once. It was
  deleted on the grounds that Phaser smooths deltas itself, and replaced by a test comparing
  two of our own constants — a test that could not fail for the reason it existed, because
  you cannot unit-test another library's runtime from your own config file. Clamping before
  accumulating is part of *what a fixed-timestep loop is*. Don't delete it again.
- **Input is polled once per frame, not event-driven.** A press *and* release inside one
  frame is therefore dropped. Unreachable from a physical keyboard (a real tap is ~30ms
  against an 8–16ms frame) — it only shows up with synthetic key events. Note this before
  "fixing" it again.

## Decided, pending build

- **What progress costs — measured, then shipped.** A greedy bot run through the real
  engine clears **1.6-1.8 cells per piece**, and a strong run lasts 270-410 pieces, so a
  whole run is worth roughly **450-700 cells**. What shipped against that is a schedule
  costed per FRAGMENT rather than per memory — `connectionsPerNode` is
  `[6, 9, 12, 16, 20, 26, 32, 40]`, so the first fragment of High School costs 6
  connections (two or three clears) and all four of them cost 43. The tiny first one is
  Dr. Mario's trick: its level 0 is four viruses, and that is the tutorial.

  Two things about it are unplayed. Whether the *whole* memory at 43 is too long a wait
  for the ending, and what the second memory should cost, since nothing has ever earned
  one.
- **A figure per fragment, worn by the board.** See ART-DIRECTION under "4b". Needs one
  drawn figure per node, in the same baked-vector style as the circuit parts.
- **The watching brain.** ART-DIRECTION lists it under Stage 3 and the storyboard draws it
  beside the board, but the panel it was going to live in now holds the coming memory. It
  needs somewhere else to be, or it replaces the memory panel and the memory moves.
- Blockers, Pinball, and difficulty framing are settled in
  [ART-DIRECTION.md](ART-DIRECTION.md) under "By stage".

## Open questions

### Blocking Stage 4

- **Earth** needs reframing — "pushes the player 1 block deeper" is the least legible idea.
  Warned bottom-row insertion, garbage-style?
- **The 30-second timer.** The design plan argues a hard guillotine is off-genre for a
  chain-planning game. Pacing dial, soft pressure, or cut?
- **Fire and Rain as light and dark?** Thematically tidy under the art direction, but it may
  collapse two distinct pieces onto one axis. See [ART-DIRECTION.md](ART-DIRECTION.md).

### Not blocking any stage

- **Newcomer onramp.** If the Puyo match rule wins, decide whether to ship a gentler mode or
  strong onboarding, or accept the learning curve.

## Deferred (deliberately not built yet)

- **Capping the frame rate, and stripping the FPS counter from production.** Too early —
  measure real cost first, and do not trade input latency away before feel is settled.
- **Verifying `/game` on the deployed site.** Real files beat the `/*` rewrite on Netlify
  (confirmed against the live host); what is unproven is that a *directory* request
  resolves before the rewrite. If `/game` ever serves the portfolio, add
  `/game/*  /game/:splat  200` above the catch-all in `public/_redirects`.
- **A link from the portfolio to the game.** `/game` works but nothing points at it.
- **The narrative wrapper** — hallway, face, eye, brain intro, memory vignettes. A separate
  workstream once the core matcher is proven fun.
