// Written by the game at /game/, which shares this origin but not this bundle.
const FRAGMENTS_KEY = "connected.fragments";
const FRAGMENTS_TOTAL_KEY = "connected.fragmentsTotal";
const FURTHEST_TITLE_KEY = "connected.furthestTitle";
const PLAYED_KEY = "connected.played";

export function openingLine(reached, total, title, played) {
  if (!played) {
    return null;
  }

  if (!(reached > 0) || !(total > 0)) {
    return "I played Connected.";
  }

  const surfaced = Math.min(reached, total);

  if (surfaced >= total) {
    return `I played Connected and saw all ${total}.`;
  }

  return title
    ? `I played Connected and got as far as ${title} — ${surfaced} of ${total}.`
    : `I played Connected and got ${surfaced} of ${total}.`;
}

// What they came to say is theirs; the draft only says where they got to.
export function draftFor(opening) {
  return opening === null ? "" : `${opening}\n\n`;
}

export function gameProgressPrefill() {
  try {
    return draftFor(
      openingLine(
        Number(localStorage.getItem(FRAGMENTS_KEY)),
        Number(localStorage.getItem(FRAGMENTS_TOTAL_KEY)),
        localStorage.getItem(FURTHEST_TITLE_KEY),
        localStorage.getItem(PLAYED_KEY) === "true"
      )
    );
  } catch {
    // A browser set to block site data throws here rather than returning null.
    return "";
  }
}
