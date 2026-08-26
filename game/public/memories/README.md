# No photographs ship from here

This directory is deliberately empty of images, and that is the point.

A memory's picture is **drawn, not loaded**. `src/memory-art.ts` holds a few hundred
bytes of colour indices per picture, and `tile-textures.ts` bakes them into a texture at
boot using the game's own tile art — the same pads, vias, chips and branches the board
is made of. Nothing here is fetched at runtime.

## Why

**Privacy.** The source photographs are of real people, most of them classmates who were
minors at the time, and none of them agreed to appear on a public portfolio. The
abstraction is what makes that a non-question rather than a judgement call: a 16x16 grid
snapped to four colours carries roughly 512 bits about an entire photograph. A face
cannot be reconstructed from it. The originals stay in `cowboy_hat/` and
`portfolio_memories/`, which are gitignored and never leave the machine.

**Coherence.** The project's own rule is that art is baked rather than loaded — see the
header of `scenes/tile-textures.ts`. Shipping JPEGs broke it. Drawing a memory out of the
pieces the player has been clearing keeps it, and says something the photograph could
not: the memory is made of the same material as the game.

**Weight.** A page a stranger opens on whatever laptop they have should not pull a
megabyte of image before it can be played.

## Regenerating

`node scripts/photo-to-tiles.mjs` reads the local, gitignored folders and rewrites
`src/memory-art.ts`. Run it when the source photos or the grid size change; commit the
generated file, never the photographs.
