// Written by the game at /game/, which shares this origin but not this bundle.
const FRAGMENTS_KEY = "connected.fragments";
const FRAGMENTS_TOTAL_KEY = "connected.fragmentsTotal";

export function progressLine(reached, total) {
  if (!(reached > 0) || !(total > 0)) {
    return null;
  }

  const surfaced = Math.min(reached, total);
  const percent = Math.round((surfaced / total) * 100);

  return `Played Connected — reached ${surfaced} of ${total} fragments (${percent}%).`;
}

export function gameProgressPrefill() {
  let line = null;

  try {
    line = progressLine(
      Number(localStorage.getItem(FRAGMENTS_KEY)),
      Number(localStorage.getItem(FRAGMENTS_TOTAL_KEY))
    );
  } catch {
    // A browser set to block site data throws here rather than returning null.
    return "";
  }

  return line === null ? "" : `${line}\n\n`;
}
