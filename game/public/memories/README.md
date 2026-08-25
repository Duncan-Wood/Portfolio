# Photographs

Real photographs of the memories, one per fragment.

**Why they live here and not in `src/assets/`:** Vite serves `public/` verbatim,
so these keep the filenames below and are cached by the browser instead of being
inlined and hashed into the bundle. That matters — the game's stated budget is
"don't hijack a visitor's GPU", and a page that a stranger opens should not pull
a megabyte of JPEG before it can be played.

**The deliberate split:** the game is DRAWN and the memories are REAL. Tiles,
neurons, the shadow and the brain are all baked vectors with no asset files. A
photograph is the one thing here that is not invented, which is exactly why it
is the payoff — a memory stops being a claim and becomes evidence.

## Naming

One file per fragment, named after the node's `photo` field in
`src/memories.ts`. Today that is:

| fragment    | file             |
|-------------|------------------|
| The Build   | `the-build.jpg`  |
| Bell Work   | `bell-work.jpg`  |
| The Hat     | `the-hat.jpg`    |
| My Voice    | `my-voice.jpg`   |

A fragment with no `photo` field, or a missing file, simply shows its words —
nothing breaks, so these can arrive one at a time.

## Before adding one

- **Resize.** Around 900px on the long edge is plenty at this canvas size.
  Straight off a phone these are 3–4MB each and there is no reason to ship that.
- **Look at what else is in frame.** These go on a public portfolio: other
  people's faces, addresses, screens with anything readable on them.
