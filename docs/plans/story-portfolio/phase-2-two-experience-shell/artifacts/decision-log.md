# Decision Log — Phase 2: Two-Experience Shell

Companion to [../feature-specification.md](../feature-specification.md).

## Full decisions

### D1 — Story address {#d1-story-address}
- **Decision:** The story experience lives at its own address, `/story`; the standard portfolio stays the default at the root address (`/`). Phase 2 introduces the site's first real address routing to distinguish them.
- **Rationale:** OQ2 (resolved) keeps the standard site as the default landing until Phase 5, so the story needs a distinct, shareable address to be reachable and demoable during the build. `/story` is human, memorable, and matches the framing.
- **Evidence:** OQ2 in the parent plan; user choice (chose `/story` over `/explore`, `/enter`). The routing library is already a dependency but is **not currently used** — the app renders one page for every path today, so Phase 2 adds real routing.
- **Rejected alternatives:** `/explore`, `/enter` (both viable; `/story` chosen as clearest). A query-parameter toggle (rejected — a real path is shareable and cleaner).
- **Driven by findings:** —
- **Linked technical notes:** —
- **Referenced in spec:** Actors and Triggers; Primary Flow; Coordinations.

### D2 — Node-brain motion {#d2-node-motion}
- **Decision:** In Phase 2 the node-brain is a composed, still image; only the single active node has a slow, subtle glow. Under reduced-motion the glow does not animate, but the start node keeps a **static** visual distinction (a brighter/highlighted state), so the start node is never identified by motion alone. No drifting or floating particle field.
- **Rationale:** A prior "floating nodes" direction was rejected as reading cheap / AI-generated (it mirrored the EcoMap redesign's canvas hero). The node-brain is core to the concept, but its execution must read as intentional and hand-composed, not generic motion. The glow is the sole marker of the start node, so it must survive reduced-motion as a static cue (UX-2).
- **Evidence:** User choice ("Still + one subtle glow"); build-preferences ("Two versions" + the rejected-direction lesson); the EcoMap redesign as an explicit anti-reference.
- **Rejected alternatives:** Fully static (viable; the subtle glow was chosen to mark the start node). Ambient drifting nodes (explicitly ruled out). Reduced-motion that drops the marker entirely (rejected — motion-only information trap).
- **Driven by findings:** F2, F5.
- **Linked technical notes:** —
- **Referenced in spec:** Primary Flow; Alternate Flows; User Interactions; Deferred (YAGNI).

### D3 — Story→standard escape hatch {#d3-escape-hatch}
- **Decision:** The story provides a clearly labeled, keyboard-reachable control that takes the visitor to the standard site's root. In Phase 2 (one screen) the requirement is "present and findable on the entry screen"; it must meet a legibility and target-size floor. Persistence *across* screens is a Phase 3 requirement (added when chapter screens exist).
- **Rationale:** The standard site is the fallback for exactly the visitors the immersive story can fail (recruiters skimming, keyboard/assistive-tech users). Its escape route must be findable in a moment of need; "restrained" means visually quiet, not faint or hard to find. Phase 2 has only one screen, so "persistent across screens" is a Phase 3 concept, not a Phase 2 one (YAGNI-1).
- **Evidence:** Plan-review finding F11 (escape-hatch findability floor); Concept note (a subtle banner to the standard version); UX-4 (legibility floor); UX YAGNI-1 (persistence is Phase 3).
- **Rejected alternatives:** A purely "subtle" banner with no legibility floor (rejected — a control can be quiet and still be an unfindable whisper). Committing "persistent across screens" in Phase 2 (rejected — no second screen exists yet).
- **Driven by findings:** F7, F8.
- **Linked technical notes:** —
- **Referenced in spec:** Primary Flow; Edge Cases; User Interactions; Deferred (YAGNI).

### D5 — Glowing node is not an entry control in Phase 2 {#d5-node-not-enterable}
- **Decision:** In Phase 2 the glowing node is presented as **non-interactive art** — no pointer-cursor change, not keyboard-focusable, no hover or click response. It signals *where* the story begins without presenting as a control. Making it enterable (zoom into a chapter) is Phase 3.
- **Rationale:** A single lit node in a dark field is the learned convention for "click here." If the node looked clickable but did nothing, a visitor would hit a silent dead-end. Communicating "not yet" by *withholding the affordance* avoids that without adding a "coming soon" label or any new UI (UX-1 / junior F3).
- **Evidence:** Phase 2/3 boundary in the parent plan; UX-1 (silent dead-click risk); junior F3.
- **Rejected alternatives:** A "coming soon" label or disabled-with-tooltip node (rejected — adds scope/UI; withholding the affordance is simpler and communicates the same thing). Leaving the node's interactivity unspecified (rejected — invites a silent dead-click).
- **Driven by findings:** F3.
- **Linked technical notes:** —
- **Referenced in spec:** Edge Cases; User Interactions.

### D6 — Unknown-address behavior {#d6-unknown-address}
- **Decision:** An unknown address (a mistyped path) takes the visitor to the standard site at the root. This is **new behavior** built with Phase 2's new routing — not an existing fallback.
- **Rationale:** The site has no real routing today (every path renders the same page only because nothing gates it); once Phase 2 distinguishes `/` from `/story`, the catch-all becomes a real decision. Landing unknown paths on the standard root gives one canonical standard URL, which the Phase 5 crawlability/canonical work will build on.
- **Evidence:** Junior F1; codebase check (`App.js` has no routing, `Main.jsx` is unmounted, `public/_redirects` only serves the app shell for any path).
- **Rejected alternatives:** Rendering the standard content in place at the typed path (rejected — a redirect to the root keeps one canonical URL, cleaner for Phase 5). Leaning on it as "existing behavior" (rejected — it does not exist yet).
- **Driven by findings:** F1.
- **Linked technical notes:** —
- **Referenced in spec:** Edge Cases; Alternate Flows.

### D8 — Entry-screen orientation {#d8-entry-orientation}
- **Decision:** The `/story` entry screen carries a document/page title and a short heading naming the experience (whose portfolio, and that it is the story version), so an unaccompanied visitor knows what they are looking at.
- **Rationale:** During the build `/story` is a real shareable address, so it may be opened without Duncan narrating it. With placeholder art, one glowing dot, and a quiet link, there is otherwise no information scent and no orientation — and a page title is the primary orientation cue for screen-reader users. This is table-stakes wayfinding (and page-title accessibility), not a feature.
- **Evidence:** UX-3; D1 (address is shareable); WCAG page-title expectation.
- **Rejected alternatives:** No orientation, relying on the glow as the sole "you are here" cue (rejected — the glow is a misleading sole signifier, per UX-1). Adding work-in-progress/placeholder framing copy (rejected — that is scope; the placeholder art is a decided interim per D7).
- **Driven by findings:** F6.
- **Linked technical notes:** —
- **Referenced in spec:** Outcome; Primary Flow; User Interactions.

## Trivial decisions

- D4: No standard→story reverse link in Phase 2 — deferred to Phase 5; the crossing to the standard site adds to browser history so back navigation returns to `/story` (considered building the reverse link now; rejected because it would expose visitors to the half-built story). — Driven by findings: F4. — Referenced in spec: Actors and Triggers; Primary Flow; Alternate Flows; Deferred (YAGNI).
- D7: The node-brain is a deliberate still arrangement of placeholder shapes — the *composition* is intentional in Phase 2; the *art fidelity* is placeholder, with final art swapped in at Phase 8 (D1 placeholder-first). Reconciles the "hand-composed" vs "placeholder" tension. — Driven by findings: F2. — Referenced in spec: Primary Flow.
