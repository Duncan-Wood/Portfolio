#!/usr/bin/env node
/*
 * Turn photographs into the game's own tiles, and write the result as source.
 *
 * Run: node scripts/photo-to-tiles.mjs
 *
 * The photographs never ship and never enter git. What ships is what this
 * writes: a few hundred bytes of colour indices per picture, which
 * `tile-textures.ts` bakes into a texture at boot using the same pads, vias,
 * chips and branches the board is made of.
 *
 * TWO reasons it works this way, and the first is not negotiable.
 *
 * PRIVACY. The sources are real people, most of them classmates who were
 * minors, none of whom agreed to appear on a public portfolio. Abstraction is
 * what makes that a non-question rather than a judgement call: a 16x16 grid
 * snapped to five tones carries about 512 bits about an entire photograph, and
 * a face cannot be reconstructed from it. A strong silhouette — a cowboy hat —
 * survives, because a hat is a shape and a face is detail.
 *
 * COHERENCE. `scenes/tile-textures.ts` states the rule: art is baked, not
 * loaded. Shipping JPEGs broke it. Drawing a memory out of the pieces the
 * player has spent the last minute clearing keeps it, and says something a
 * photograph could not — the memory is made of the same material as the game.
 *
 * Depends on ImageMagick, which is already used elsewhere on this machine. It
 * shells out rather than pulling an image library into the project: this runs
 * by hand, occasionally, and `game/package.json` should not grow a dependency
 * for it.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const OUT = join(HERE, '..', 'src', 'memory-art.ts');

/*
 * The ramp, dark to light, as piece types — with '.' for a cell left empty.
 *
 * Ordered by LUMINANCE rather than by hue, and that is the whole trick. The
 * four piece colours are not a value scale, so mapping a pixel to its nearest
 * colour turns a photograph into confetti. Mapping brightness onto an ordered
 * ramp turns it into a posterised picture that still reads as one.
 *
 *   empty  #221038   ~30      the ground showing through
 *   violet #8a4fff  ~117
 *   red    #e4572e  ~125
 *   teal   #17bebb  ~140
 *   yellow #ffc914  ~196
 *
 * Violet and red sit close in value and far apart in hue, which is what gives
 * the midtones their banding instead of a smooth grey.
 */
const RAMP = ['.', '3', '0', '1', '2'];

/** Portrait grid for a single picture, and for one face in a crowd. */
const SINGLE = 16;
const CROWD_CELL = 10;
const CROWD_COLUMNS = 5;
const CROWD_ROWS = 4;

/** Read a photo as an `at` x `at` grid of ramp characters. */
function quantize(file, at) {
  // `!` forces the exact square and ignores aspect. Deliberate: cropping to a
  // square loses the subject — centred keeps torsos, top-aligned keeps
  // ceilings — and at this resolution the distortion is invisible while the
  // whole frame survives.
  const raw = execFileSync('magick', [
    file, '-resize', `${at}x${at}!`, '-colorspace', 'sRGB', '-depth', '8', 'txt:-',
  ], { encoding: 'utf8', maxBuffer: 1 << 24 });

  const grid = Array.from({ length: at }, () => new Array(at).fill('.'));

  for (const line of raw.split('\n')) {
    const match = line.match(/^(\d+),(\d+):\s*\((\d+),(\d+),(\d+)/);
    if (match === null) {
      continue;
    }
    const [, x, y, r, g, b] = match;
    const luma = (0.299 * +r + 0.587 * +g + 0.114 * +b) / 255;
    // Gamma-lifted, because photographs of people indoors sit low and a linear
    // split sends most of the picture to the darkest band.
    const lifted = Math.pow(luma, 0.75);
    const step = Math.min(RAMP.length - 1, Math.floor(lifted * RAMP.length));
    grid[+y][+x] = RAMP[step];
  }

  return grid.map((row) => row.join(''));
}

/** Evenly spaced picks, so a folder is sampled across rather than off the top. */
function sample(folder, count) {
  const files = readdirSync(folder)
    .filter((name) => /\.(jpe?g|png)$/i.test(name))
    .sort()
    .map((name) => join(folder, name));

  if (files.length <= count) {
    return files;
  }
  const stride = files.length / count;
  return Array.from({ length: count }, (_, i) => files[Math.floor(i * stride)]);
}

/**
 * Many portraits in a grid, with a one-cell gutter between them.
 *
 * The Hat is a hundred and forty-one photographs of different people wearing
 * the same hat. What that folder means is the NUMBER of them, so the picture
 * has to be a crowd — quantity is the content, and clarity is not.
 */
function crowd(folder) {
  const faces = sample(folder, CROWD_COLUMNS * CROWD_ROWS)
    .map((file) => quantize(file, CROWD_CELL));

  const columns = CROWD_COLUMNS * CROWD_CELL + (CROWD_COLUMNS - 1);
  const rows = [];

  for (let band = 0; band < CROWD_ROWS; band += 1) {
    for (let line = 0; line < CROWD_CELL; line += 1) {
      const across = [];
      for (let column = 0; column < CROWD_COLUMNS; column += 1) {
        const face = faces[band * CROWD_COLUMNS + column];
        across.push(face === undefined ? '.'.repeat(CROWD_CELL) : face[line]);
      }
      rows.push(across.join('.'));
    }
    if (band < CROWD_ROWS - 1) {
      rows.push('.'.repeat(columns));
    }
  }

  return { columns, rows };
}

const PICTURES = {
  'the-hat': () => crowd(join(REPO, 'cowboy_hat')),
};

const built = {};
for (const [key, make] of Object.entries(PICTURES)) {
  try {
    built[key] = make();
    process.stdout.write(`${key}: ${built[key].columns} wide, ${built[key].rows.length} tall\n`);
  } catch (error) {
    process.stderr.write(`${key}: skipped (${error.message.split('\n')[0]})\n`);
  }
}

const body = Object.entries(built).map(([key, art]) => {
  const rows = art.rows.map((row) => `    '${row}',`).join('\n');
  return `  '${key}': {\n    columns: ${art.columns},\n    rows: [\n${rows}\n    ],\n  },`;
}).join('\n');

writeFileSync(OUT, `/*
 * Memory pictures, drawn as boards.
 *
 * GENERATED by \`scripts/photo-to-tiles.mjs\` — do not edit by hand, and do not
 * commit the photographs it reads. See that script for why a memory is an
 * abstraction rather than an image, and \`public/memories/README.md\` for what
 * that buys.
 *
 * One string per row. '.' is an empty cell and the ground shows through;
 * '0'-'3' are piece types, indexed exactly as \`PIECE_COLORS\` is. The data is
 * legible on purpose — you can read the picture in the source.
 */

export interface MemoryArt {
  columns: number;
  rows: readonly string[];
}

export const MEMORY_ART: Readonly<Record<string, MemoryArt>> = {
${body}
};
`);

process.stdout.write(`wrote ${OUT}\n`);
