// Written by the game at /game/, which shares this origin but not this bundle.
const FRAGMENTS_KEY = "connected.fragments";
const FRAGMENTS_TOTAL_KEY = "connected.fragmentsTotal";
const PLAYED_KEY = "connected.played";

export function openingLine(reached, total, played) {
  if (!played) {
    return null;
  }

  if (!(reached > 0) || !(total > 0)) {
    return "I played Connected.";
  }

  return `I played Connected and got ${Math.min(reached, total)} of ${total}.`;
}

// The game showed them five things it kept; asking for one back is the
// exchange the game itself never made room for.
export function draftFor(opening) {
  return opening === null ? "" : `${opening}\n\nSomething I kept:\n`;
}

export function gameProgressPrefill() {
  try {
    return draftFor(
      openingLine(
        Number(localStorage.getItem(FRAGMENTS_KEY)),
        Number(localStorage.getItem(FRAGMENTS_TOTAL_KEY)),
        localStorage.getItem(PLAYED_KEY) === "true"
      )
    );
  } catch {
    // A browser set to block site data throws here rather than returning null.
    return "";
  }
}
