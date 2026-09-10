// Written by the game at /game/, which shares this origin but not this bundle.
const LOG_KEY = "connected.log";
const FRAGMENTS_TOTAL_KEY = "connected.fragmentsTotal";
const PLAYED_KEY = "connected.played";
const BEST_CHAIN_KEY = "connected.bestChain";
const CONTROLS_KEY = "connected.controls";

export function draftFrom(log, total, played, bestChain, controls) {
  if (!played) {
    return "";
  }

  const surfaced = Array.isArray(log) ? log.filter((entry) => entry?.title) : [];

  if (surfaced.length === 0 || !(total > 0)) {
    return "I played Connected.\n\n";
  }

  const finished = surfaced.length >= total;
  const opening = finished
    ? "Still connected."
    : `I got as far as ${surfaced[surfaced.length - 1].title}.`;

  const chain = bestChain >= 2 ? ` Best chain: ${bestChain}.` : "";
  const scheme = controls === "buttons" ? " (on the buttons)" : "";

  return `${opening}${chain}${scheme}\n\n`;
}

export function gameProgressPrefill() {
  try {
    return draftFrom(
      JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]"),
      Number(localStorage.getItem(FRAGMENTS_TOTAL_KEY)),
      localStorage.getItem(PLAYED_KEY) === "true",
      Number(localStorage.getItem(BEST_CHAIN_KEY)),
      localStorage.getItem(CONTROLS_KEY)
    );
  } catch {
    // A browser set to block site data throws here rather than returning null.
    return "";
  }
}
