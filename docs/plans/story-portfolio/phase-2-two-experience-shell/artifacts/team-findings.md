# Team Findings — Phase 2: Two-Experience Shell

Companion to [../feature-specification.md](../feature-specification.md). Review team: han-core:junior-developer, han-core:user-experience-designer (size: small). All findings resolved by evidence/rewrite; none required escalation beyond one Open Item (F9).

## Major findings

### F1 — "Unknown address falls back to standard" was claimed as existing behavior; it is new
- **Agent:** junior-developer.
- **Finding:** The draft leaned on an "existing single-page redirect behavior" that doesn't exist — the site has no active routing (`App.js` renders one page for all paths; `Main.jsx` is unmounted; `public/_redirects` only serves the app shell). The fallback is new behavior, and it hid a sub-decision (render-in-place vs redirect-to-root).
- **Resolution:** Reframed D6 as new behavior built with Phase 2's routing; chose "land on the standard root" (one canonical URL for Phase 5). Corrected the Summary and Alternate Flows over-claims.
- **Resolved by:** evidence.
- **Affected decisions:** D6, D1. **Affected tech-notes:** —. **Changed in spec:** Edge Cases; Alternate Flows; Coordinations; Summary.

### F2 — "Placeholder shapes" (D7) vs "intentional, hand-composed" (D2) pulled opposite directions
- **Agent:** junior-developer.
- **Finding:** The only thing a Phase 2 visitor sees is the node-brain, yet the decisions were ambiguous about how finished it must be.
- **Resolution:** Clarified that Phase 2 owns a deliberate *composition* of *placeholder* shapes — arrangement intentional, art fidelity placeholder (final art = Phase 8).
- **Resolved by:** evidence.
- **Affected decisions:** D2, D7. **Changed in spec:** Primary Flow.

### F3 — Glowing node's interactivity under-specified → silent dead-click risk
- **Agent:** junior-developer (F3) + user-experience-designer (UX-1).
- **Finding:** A lit node in a dark field is the learned "click here" convention; D5 made the click a no-op with no acknowledgment — an unrecoverable silent dead-end.
- **Resolution:** D5 now states the node is non-interactive *by absence* (no cursor change, not focusable, no hover/click response), so no click is invited. Communicates "not yet" without a "coming soon" label or new UI.
- **Resolved by:** evidence.
- **Affected decisions:** D5. **Changed in spec:** Edge Cases; User Interactions.

### F4 — Return path rests entirely on browser back
- **Agent:** junior-developer.
- **Finding:** With no reverse link, browser back is the sole way back to `/story`; "and back" needed to be pinned, and the crossing must push (not replace) history.
- **Resolution:** Primary Flow now states the crossing adds to history and "and back" means browser back immediately after crossing.
- **Resolved by:** evidence.
- **Affected decisions:** D4. **Changed in spec:** Primary Flow.

### F5 — Reduced-motion may strip the only marker of the start node
- **Agent:** user-experience-designer (UX-2).
- **Finding:** The glow is the sole signifier of the start node; if reduced-motion drops it entirely, the visitor sees an undifferentiated brain (a motion-only-information trap that becomes a real barrier in Phase 3).
- **Resolution:** D2 now keeps a static visual distinction on the start node under reduced-motion; only the animation drops.
- **Resolved by:** evidence.
- **Affected decisions:** D2. **Changed in spec:** Alternate Flows.

### F6 — No orientation on the entry screen (no page title/heading)
- **Agent:** user-experience-designer (UX-3).
- **Finding:** A visitor on `/story` sees placeholder shapes, one dot, and a quiet link — nothing says whose portfolio it is or that it's a story experience; a missing page title also removes the primary orientation cue for screen-reader users.
- **Resolution:** Added D8 — the entry screen carries a page title and a short heading naming the experience. Minimal wayfinding, no framing prose.
- **Resolved by:** evidence.
- **Affected decisions:** D8 (new). **Changed in spec:** Outcome; Primary Flow; User Interactions.

### F7 — "Restrained" escape hatch had no lower bound
- **Agent:** user-experience-designer (UX-4).
- **Finding:** "Restrained = visually quiet" can be satisfied by a low-contrast whisper; the control needs a legibility/target-size floor so it stays findable in a moment of need.
- **Resolution:** D3 now requires a legibility and target-size floor alongside "quiet."
- **Resolved by:** evidence.
- **Affected decisions:** D3. **Changed in spec:** User Interactions.

## Minor edits

- F8: "Persistent" escape hatch is a Phase 3+ concept (Phase 2 has one screen); relaxed to "present and findable on the entry screen," with cross-screen persistence deferred to Phase 3 — user-experience-designer (YAGNI-1) — D3; Deferred (YAGNI).
- F9: OQ-1 (who self-orients on `/story` — Duncan-demo vs shared link) — resolved by assuming the shareable/unaccompanied reading (the safer one), which is what drives D8 and D3; surfaced as an Open Item so the user can relax those to Phase 3 if `/story` stays a narrated demo — user-experience-designer — Open Items.
- F10: Light mechanics/over-claim in the "single-page redirect configuration" wording — tightened together with F1 — junior-developer — Alternate Flows; Summary.
