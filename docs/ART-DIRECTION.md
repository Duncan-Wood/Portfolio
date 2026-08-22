# Art Direction

Art stays placeholder until the core loop is fun; this is recorded early because it
answers design questions, not because it gets built early. Where something here HAS
shipped ahead of that rule, the entry says so and says why.

## The core image

**Stained glass where the leading between panes is the neural pathway.** Panes are tiles,
the dark channels between them are dendrites or circuit traces, light behind the glass is
signal. One image carrying heart, technology, and the node-brain at once.

Kingdom Hearts is the touchstone — take the visual language (stained glass, jewel tones, a
lit platform in darkness, a shadow that opposes you), not the furniture. **Copy nothing:**
no Disney or Square Enix characters, music, logos, or their proper nouns. This ships
publicly under my own name.

## By stage

- **1 — Drop + lock.** The board sits on a circular lit platform in darkness, not a bare
  rectangle. Free now, and every later beat assumes it.
  *Attempted and cut.* A circle big enough to sit under the board does not fit a 620-wide
  canvas — it clipped on all four sides and read as stray arcs. A flattened ellipse in
  perspective is the shape that fits. Only a weak vignette ships today, and per the rule at
  the top of this file, the rest waits until the loop is proven fun.
  *Shipped instead:* the panes themselves. Each tile is a jewel-toned pane with its leading
  drawn dark and a figure — a pad, an open via, a chip, a branching trace — set into it in
  that same lead, baked at boot rather than loaded as art. The figures are drawn from the
  circuit vocabulary rather than from Bejeweled's: a first pass used a star, a circle, a
  square and a diamond, which read perfectly well and meant nothing. It carries more of the core image than the
  platform would have, and it is the half of "stained glass" that the board itself can show.
- **2 — Cascades.** Chains light the leading between cleared tiles, so a cascade is
  visibly a signal crossing the network. Highest-value idea here: nearly free, and it
  makes chains legible.
- **3 — Juice.** Clears shatter as glass catching light. The platform brightens as a chain
  builds. Audio escalates choral per link. The watching brain reacts through the glass.
- **4 — Special pieces.** Neurons are the collectible that unlocks memories. Blockers are
  encroaching shadow, removed by *shadow recedes from light* — clearing adjacent tiles
  pushes it back. Pinball is shadow pooling with a visible wind-up.
  *Shipped early, because Stage 3 needed something to push against:* the shadow takes a
  cell whenever the player stops connecting, and a clear beside it drives it off. It is
  drawn as a creature rather than as a dark cell — a hunched body, thin antennae, two lit
  eyes — because the first pass was a near-black square and read as a rendering fault. It
  is lit in the game's own violet, not in a monster's yellow: the thing opposing you is
  the part of this mind that stops without finishing, so it belongs to the same palette
  as the ground it stands on.
- **4b — The board carries the memory.** Each fragment gets a FIGURE, and while the run
  is earning that fragment one of the four piece types wears it instead of its circuit
  shape: a tower for The Build, a filled grid for Bell Work, a hat for The Hat. The
  memory then stops being a text interruption and becomes the thing the player has been
  handling for the last minute without knowing what it was.
  *Constraint that shapes this:* exactly ONE type may carry it. Four memory figures at
  once would leave colour as the only thing separating the types, which is the
  accessibility problem `PIECE_SHAPES` exists to solve. Three circuit parts and one
  figure keeps four distinct silhouettes and makes the odd one out read as special —
  which is the opening it needs if the memory tile is ever to mean something mechanically
  as well ("connections from the memories" being distinct from ordinary ones).
- **5 — Framing.** Difficulty selection is an opening values question, not Easy/Normal/Hard.
- **Narrative (later).** Each memory gets its own platform and portrait.

## Open

- Do Fire and Rain become light and dark? Tidy, but collapses two distinct pieces onto one
  axis. Defer to Stage 4.
- How ornate can the glass get before tile readability suffers at speed? Readability beats
  beauty in a game built on fast pattern recognition. Prototype at real speed.
  *Partly answered:* one solid figure per pane, drawn in the leading colour, is **more**
  readable than a flat swatch, not less — shape survives at speed where hue alone does not.
  What is still untested is detail finer than a single silhouette.
