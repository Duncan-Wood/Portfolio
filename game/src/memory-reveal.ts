// A memory surfaces from the middle outward, not in bands: cells are ordered by
// their distance from the centre, jittered so the advancing edge stays ragged.
const JITTER = 2.4;

function scatter(column: number, row: number): number {
  const noise = Math.sin(column * 127.1 + row * 311.7) * 43758.5453;
  return noise - Math.floor(noise);
}

export function revealOrder(columns: number, rows: number): number[] {
  const centerColumn = (columns - 1) / 2;
  const centerRow = (rows - 1) / 2;

  const cells = Array.from({ length: columns * rows }, (_, cell) => {
    const column = cell % columns;
    const row = Math.floor(cell / columns);
    const reach = Math.hypot(column - centerColumn, row - centerRow);

    return { cell, at: reach + scatter(column, row) * JITTER };
  });

  cells.sort((first, second) => first.at - second.at || first.cell - second.cell);

  return cells.map(({ cell }) => cell);
}
