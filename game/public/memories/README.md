# No photographs ship from here

This directory is deliberately empty of images, and that is the point.

A memory's picture is **drawn, not loaded**. `src/memory-art.ts` holds a few hundred
bytes of colour indices per picture, and `tile-textures.ts` bakes them into a texture at
boot using the game's own tile art — the same pads, vias, chips and branches the board
is made of. Nothing here is fetched at runtime.

## Shoot objects, not people

Five tones across roughly forty cells resolves an object lit against a contrasting
ground. It does not resolve a face: skin, hair and clothing land in the same luma band
and the subject dissolves into noise. Every fragment is therefore a thing rather than a
scene — photograph it alone, well lit, on a dark surface, filling the frame.

## Why drawn rather than loaded

**Coherence.** The project's own rule is that art is baked rather than loaded — see the
header of `scenes/tile-textures.ts`. Drawing a memory out of the pieces the player has
been clearing says something a photograph could not: the memory is made of the same
material as the game.

**Privacy.** Anyone who appears in a source photograph appears here as roughly 512 bits
snapped to four colours, from which nothing can be reconstructed.

**Weight.** A page a stranger opens on whatever laptop they have should not pull a
megabyte of image before it can be played.

## Regenerating

`node scripts/photo-to-tiles.mjs` reads `storyboard/memory-images`, which is gitignored,
and rewrites `src/memory-art.ts`. Add an entry to `PICTURES` for each new photograph.
Commit the generated file, never the photographs.
