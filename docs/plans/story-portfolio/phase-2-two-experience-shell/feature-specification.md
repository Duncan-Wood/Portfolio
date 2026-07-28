# Feature Specification — Phase 2: Two-Experience Shell

The entryway for the new story experience and the ability to cross from it to the standard portfolio. This is a foundation phase: it stands up the node-brain landing and the two-experience structure without yet telling any chapter.

Parent plan: [../build-phase-outline.md](../build-phase-outline.md) (Phase 2). Standing preferences: [../build-preferences.md](../build-preferences.md).

## Outcome

A visitor who goes to the story's dedicated address (`/story`) arrives on the **node-brain** — a composed, still depiction of a brain wired from nodes, with a single node softly glowing to mark where the story will begin. The screen names whose portfolio this is and that it is a story experience ([D8](artifacts/decision-log.md#d8-entry-orientation)). From there the visitor can cross to the standard portfolio at any time using a clearly labeled, findable control, and return with the browser's back navigation. The standard portfolio stays the default experience at the root address, unchanged from Phase 1.

Phase 2 is successful when both experiences exist as distinct addresses and a visitor can move from the story shell to the standard site and back.

## Actors and Triggers

- **A visitor** triggers the story shell by navigating to `/story` ([D1](artifacts/decision-log.md#d1-story-address)). During the build this is often Duncan demonstrating via a direct link, but because `/story` is a real, shareable address it may also be opened **unaccompanied** (a shared link to a recruiter or peer). The spec assumes the unaccompanied case, since it is the more demanding one ([D8](artifacts/decision-log.md#d8-entry-orientation)).
- **A standard-site visitor** continues to arrive at the root address as before; nothing about their experience changes in Phase 2 ([D4](artifacts/decision-log.md#d4-no-reverse-link)).

## Primary Flow

1. A visitor opens `/story`.
2. The node-brain renders as a composed, **still** image — a deliberate arrangement of placeholder shapes standing in for the final art — with one node softly glowing and the rest dark ([D2](artifacts/decision-log.md#d2-node-motion), [D7](artifacts/decision-log.md#d7-placeholder-art)).
3. A short heading names the experience (whose portfolio, and that it is the story version), so an unaccompanied visitor knows what they are looking at ([D8](artifacts/decision-log.md#d8-entry-orientation)).
4. A restrained but clearly legible, labeled control offers to take the visitor to the standard version ([D3](artifacts/decision-log.md#d3-escape-hatch)).
5. The visitor activates that control and arrives at the standard portfolio at the root address; the crossing adds to browser history so back navigation works ([D1](artifacts/decision-log.md#d1-story-address), [D4](artifacts/decision-log.md#d4-no-reverse-link)).
6. Immediately after crossing, the visitor uses the browser's back navigation and returns to the node-brain at `/story`.

## Alternate Flows and States

- **Reduced-motion visitor:** the glow does not animate, but the start node keeps a **static** visual distinction (a brighter or highlighted state), so "where the story begins" is never carried by motion alone ([D2](artifacts/decision-log.md#d2-node-motion)).
- **Direct link, refresh, or share of `/story`:** `/story` is a real, shareable location — opening or refreshing it loads the app, which renders the node-brain rather than the standard site. (Evidence: the site already serves its app shell for any path; Phase 2 adds the routing that distinguishes `/story` from `/`.)
- **Standard-site visitor:** no new element appears; there is no link from the standard site to the story in Phase 2 ([D4](artifacts/decision-log.md#d4-no-reverse-link)).

## Edge Cases and Failure Modes

- **Unknown address** (a mistyped path such as `/stroy`): the visitor lands on the standard site at the root. This is **new behavior** established with the routing Phase 2 introduces — the site has no real routing today — not an existing fallback ([D6](artifacts/decision-log.md#d6-unknown-address)).
- **The glowing node is activated:** in Phase 2 the node is presented as **non-interactive art** — no pointer-cursor change, not keyboard-focusable, no hover or click response — so a click is never invited and never fails silently. It marks *where* the story begins without presenting itself as a control; making it enterable (zoom into the first chapter) is Phase 3 ([D5](artifacts/decision-log.md#d5-node-not-enterable)).
- **Keyboard-only visitor:** because the node is not focusable, the story→standard control is the sole focusable element on the entry screen — reachable and operable by keyboard with a clear label, even though the broader story interaction is not hardened for keyboard until Phase 7 ([D3](artifacts/decision-log.md#d3-escape-hatch), [D5](artifacts/decision-log.md#d5-node-not-enterable)).

## User Interactions

- The node-brain is the entry surface: a still, deliberately composed image with one softly glowing node. It reads as intentional and hand-composed — never a field of drifting particles ([D2](artifacts/decision-log.md#d2-node-motion)).
- A short heading orients the visitor to what the screen is ([D8](artifacts/decision-log.md#d8-entry-orientation)).
- The single affordance is the **story→standard control**: present and findable on the entry screen, clearly labeled (e.g., "Standard version"), keyboard-reachable, and meeting a legibility and target-size floor — "restrained" means visually quiet, never hidden and never so faint it is hard to find in a moment of need ([D3](artifacts/decision-log.md#d3-escape-hatch)).

## Coordinations

- **With the standard portfolio (Phase 1):** the story→standard control lands on the standard site's root; the standard site is unchanged and needs no new coordination.
- **New routing surface:** Phase 2 introduces the site's first real address routing (distinguishing `/` from `/story`), where today every path renders the same page.
- **With Phase 3:** Phase 2 establishes the node-brain surface and the marked start node that Phase 3 will make enterable (zoom into the first chapter).
- **With Phase 5:** the default-landing flip and the standard→story reverse link are deliberately deferred to Phase 5.

## Out of Scope

- Zooming into the node or any chapter content (Phase 3+).
- Any link from the standard site to the story (Phase 5).
- Making the story the default landing, and crawlability/canonical handling of the story route (Phase 5).
- Full touch, keyboard, and reduced-motion hardening of the story experience (Phase 7) — Phase 2 commits only to: the escape-hatch being keyboard-reachable and legible, the single glow keeping a static reduced-motion fallback, and the entry screen having a page title/heading.
- Final artwork (Phase 8; placeholder shapes per D1 placeholder-first).

## Deferred (YAGNI)

- **Standard→story reverse link** — deferred to Phase 5. *Reopening trigger:* the story becomes the default landing. Building it now would expose visitors to the half-built story the default-landing decision is protecting them from.
- **Story crawlability / canonical handling** — deferred to Phase 5, when the default flips and the story route must be reachable by automated readers. *Reopening trigger:* the Phase 5 flip.
- **Escape-hatch persistence across screens** — Phase 2 has one screen, so the requirement is only "present and findable on the entry screen." *Reopening trigger:* Phase 3 adds chapter screens, where the control must persist across them ([D3](artifacts/decision-log.md#d3-escape-hatch)).
- **Any node motion beyond the single glow** — ruled out now. *Reopening trigger:* a deliberate, hand-crafted motion decision that demonstrably does not read as generic drift (the explicit lesson from the rejected "floating nodes" direction).

## Open Items

- **Audience of `/story` during the build.** The spec assumes `/story` can be opened unaccompanied (shared link), which is the safer reading and drives the orientation ([D8](artifacts/decision-log.md#d8-entry-orientation)) and escape-hatch legibility ([D3](artifacts/decision-log.md#d3-escape-hatch)) commitments. If in practice Phase 2's `/story` is only ever shown in a narrated demo, those two commitments could relax to Phase 3 — confirm if you want that.

## Summary

Phase 2 stands up `/story` as the node-brain entry to the story experience and the labeled, findable crossing from it to the standard site, with the standard site unchanged as the default at the root. It introduces the site's first real routing. It is a shell: no chapters, no node entry, no reverse link — those are Phases 3 and 5. Decisions: 8 (see [decision-log.md](artifacts/decision-log.md)). Deferrals: 4. Review team: junior-developer + user-experience-designer (see [team-findings.md](artifacts/team-findings.md)). No load-bearing implementation mechanics required a technical-notes file — the routing library is already a dependency and the behaviors above are specified without naming mechanics.
