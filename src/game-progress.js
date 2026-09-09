// Written by the game at /game/, which shares this origin but not this bundle.
const LOG_KEY = "connected.log";
const FRAGMENTS_TOTAL_KEY = "connected.fragmentsTotal";
const PLAYED_KEY = "connected.played";

// What they came to say is theirs; this only says what happened in the game.
export function draftFrom(log, total, played) {
  if (!played) {
    return "";
  }

  const surfaced = Array.isArray(log) ? log.filter((entry) => entry?.title) : [];

  if (surfaced.length === 0 || !(total > 0)) {
    return "I played Connected.\n\n";
  }

  const reached = Array.isArray(log) ? log.length : 0;
  const head =
    reached >= total
      ? `I played Connected — all ${total}.`
      : `I played Connected — ${reached} of ${total}.`;

  const lines = surfaced.map(
    ({ title, tries }) => `${title} — ${tries} ${tries === 1 ? "try" : "tries"}`
  );

  return `${head}\n\n${lines.join("\n")}\n\n`;
}

export function gameProgressPrefill() {
  try {
    return draftFrom(
      JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]"),
      Number(localStorage.getItem(FRAGMENTS_TOTAL_KEY)),
      localStorage.getItem(PLAYED_KEY) === "true"
    );
  } catch {
    // A browser set to block site data throws here rather than returning null.
    return "";
  }
}
