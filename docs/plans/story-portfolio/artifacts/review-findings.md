# Review Findings — Build-Phase Outline

Companion to [../build-phase-outline.md](../build-phase-outline.md). See [review-iteration-history.md](review-iteration-history.md) for rounds.

## Major findings

### F1 — Phase 5 default-landing flip is gated on chapter completeness, not on accessibility or crawler-legibility
- **Agent:** junior-developer (JD-001/JD-002), user-experience-designer (UX-002), adversarial-validator (V5) — three-way convergence.
- **Category:** Sequencing / accessibility / SEO.
- **Finding:** OQ2 flips the default landing to the story once Phase 5 ships, but touch, keyboard, reduced-motion, and text-for-automated-readers all land in Phase 7. At the flip, a mobile/keyboard/assistive-tech/vestibular visitor — and any crawler — is defaulted into an experience they cannot use or read, defeating the very reason OQ2 keeps the standard site (Concept.md line 6: "easier for web scrapers").
- **Evidence considered:** Phase 5 "Connects to"; OQ2 decision; Phase 7 "What we build"; Concept.md line 6.
- **Resolution:** Gate the flip on a minimum readiness bar — touch/keyboard detail-reveal, a reduced-motion fallback, and text descriptions reachable by automated readers — and add a canonical-URL note for the root-URL semantic change. Keep the story reachable by direct link before the flip.
- **Resolved by:** evidence (plan edited).
- **Raised in round:** R1.
- **Changed in plan:** OQ2, Phase 5, Phase 7 preconditions.

### F2 — Phase 2 "way back to the story" link is premature (YAGNI)
- **Agent:** junior-developer (JD-003), user-experience-designer (UX-009), adversarial-validator (V7) — three-way convergence.
- **Category:** YAGNI candidate.
- **Finding:** (a) evidence fails — the plan itself labels it "an inferred navigation need, not stated in the concept note"; (b) anti-pattern — built now for a need that only exists post-flip, and during the build it exposes visitors to the half-built story OQ2 is protecting them from; (c) simpler form — browser back-navigation already covers the banner-originated path. Only the "arrived via a direct/shared link to the standard site" case needs a dedicated link, and that case is post-flip.
- **Evidence considered:** Phase 2 "What we build"; Concept.md (no return path); OQ2; `src/index.js` BrowserRouter present.
- **Resolution:** Defer the dedicated standard→story link to Phase 5 (the flip). Rely on browser back for the banner path until then.
- **Resolved by:** evidence (plan edited).
- **Raised in round:** R1.
- **Changed in plan:** Phase 2 "What we build", Phase 5.

### F3 — Phase 2's demo ("open the site and land on the node-brain") contradicts the resolved OQ2 default-landing decision
- **Agent:** adversarial-validator (V2).
- **Category:** Internal contradiction.
- **Finding:** OQ2 keeps the standard site as the default landing during the build, so "open the site and land on the node-brain" is not achievable without a dedicated build-time address for the story — which Phase 2 never lists as a deliverable.
- **Evidence considered:** Phase 2 outcome step 1 and "Why this is Phase 2"; OQ2 decision; `src/App.js` has no routing yet.
- **Resolution:** Add "reach the story experience at a dedicated address during the build" as a Phase 2 deliverable and reword the outcome to open the story via that address.
- **Resolved by:** evidence (plan edited).
- **Raised in round:** R1.
- **Changed in plan:** Phase 2 "What we build" and "Outcome to demonstrate".

### F4 — Phase 2 status "Ready" contradicts the plan's own precondition (a finished Phase 1)
- **Agent:** adversarial-validator (V1).
- **Category:** Status accuracy.
- **Finding:** Phase 2 requires "a finished standard site" but Phase 1 is "In review" with open items. Marking Phase 2 "Ready" overstates readiness.
- **Evidence considered:** Build Phase Index; Phase 2 "Why this is Phase 2"; human-review.md; build-preferences open items.
- **Resolution:** Set Phase 2 status to "Blocked (Phase 1 in review)" and soften "finished" to "content-complete enough to link to."
- **Resolved by:** evidence (plan edited).
- **Raised in round:** R1.
- **Changed in plan:** Build Phase Index; Phase 2 "Why this is Phase 2".

### F5 — Hover-only detail reveal should have a focus/tap equivalent from Phase 3, not a Phase 7 retrofit
- **Agent:** user-experience-designer (UX-003), adversarial-validator (V4).
- **Category:** Accessibility / rework risk.
- **Finding:** The blurb is the scene's payload, and hover-only excludes keyboard even on desktop. Retrofitting a non-hover path in Phase 7 means re-touching every scene built in Phases 3, 4, 6; designing a modality-agnostic reveal at the single-chapter prototype is near-free.
- **Evidence considered:** Phase 3/4 "What we build"; Phase 7 deferral.
- **Resolution:** Require the detail reveal to fire on focus/tap as well as hover, starting in Phase 3.
- **Resolved by:** evidence (plan edited).
- **Raised in round:** R1.
- **Changed in plan:** Phase 3 "What we build".

### F6 — D1 (placeholder-first) does not mitigate the geometry-rework risk it creates
- **Agent:** adversarial-validator (V3).
- **Category:** Departure risk.
- **Finding:** Hover/zoom hit-regions built against placeholder pixel bounds can be invalidated when final art with different silhouettes arrives, turning Phase 8 from a "visual swap" into interaction rework that undoes Phase 7 hardening.
- **Evidence considered:** D1; Phase 3, 7, 8.
- **Resolution:** Add a D1 constraint: placeholders match the planned final-art aspect ratio/anchor points, and hover/zoom targets are defined in scene-relative coordinates, so Phase 8 stays a visual-only swap.
- **Resolved by:** evidence (plan edited).
- **Raised in round:** R1.
- **Changed in plan:** D1 (Departures).

### F7 — Phase 3 lists no blurb-text precondition; blurb authoring/verification is unscheduled content work
- **Agent:** junior-developer (JD-004).
- **Category:** Missing precondition.
- **Finding:** Phase 4 requires blurb text as a precondition but Phase 3 does not — an asymmetry. Blurbs carry the same accuracy/voice verification burden as Phase 1 content (per build-preferences), which can stall the phase.
- **Evidence considered:** Phase 3 vs Phase 4 preconditions; build-preferences Voice & Accuracy.
- **Resolution:** Add "high-school blurb text drafted and verified" to Phase 3 preconditions and schedule blurb authoring in parallel, mirroring how OQ3 schedules art.
- **Resolved by:** evidence (plan edited).
- **Raised in round:** R1.
- **Changed in plan:** Phase 3 preconditions.

### F8 — Standing design-modernization, automatic-responsiveness, and skills-treatment work has no phase home
- **Agent:** junior-developer (JD-005).
- **Category:** Missing scope / standards conflict.
- **Finding:** build-preferences names these as standing requirements and CLAUDE.md says respect them every phase, but no phase owns them; the nav-overflow was an active Phase-1 defect.
- **Evidence considered:** build-preferences "Design & responsiveness" and "Open design questions"; CLAUDE.md; human-review.md.
- **Resolution:** Add a "Cross-cutting work" note to the plan assigning responsiveness to every phase's acceptance and naming where the design-modernization + skills-treatment redesign is sequenced. **Open item — author decides fold-into-Phase-1 vs a dedicated phase.**
- **Resolved by:** user input (pending) — see Open items.
- **Raised in round:** R1.
- **Changed in plan:** new "Cross-cutting work" note (added); final placement pending author.

### F9 — No signifier that the glowing node is enterable
- **Agent:** user-experience-designer (UX-001).
- **Category:** Discoverability.
- **Finding:** A glow signals importance, not the zoom-in action. First-time visitors (essentially all) must guess the highest-leverage interaction.
- **Resolution:** Add an entry signifier (pointer affordance / attract cue / "enter" microcopy, plus a focusable labeled control) to Phase 2/3.
- **Resolved by:** evidence (plan edited).
- **Raised in round:** R1.
- **Changed in plan:** Phase 3 "What we build".

### F10 — No in-timeline wayfinding or progress, and scroll-as-time is unlabeled
- **Agent:** user-experience-designer (UX-004, UX-006).
- **Category:** Wayfinding / control.
- **Finding:** Four chapters traversed by scroll with no position indicator; scroll is repurposed for chapter transitions, fighting the read-down convention and overshooting.
- **Resolution:** Add a progress/wayfinding signifier and a "scroll to travel" cue to Phase 4, make transitions discrete and interruptible, and add explicit prev/next controls.
- **Resolved by:** evidence (plan edited).
- **Raised in round:** R1.
- **Changed in plan:** Phase 4 "What we build".

### F11 — Escape-hatch is specced "subtle" and undefined inside chapters
- **Agent:** user-experience-designer (UX-005).
- **Category:** Control / findability.
- **Finding:** The one route from the immersive story to the evaluable standard site is deliberately de-emphasized and may not persist into chapters — stranding the highest-stakes visitor.
- **Resolution:** Set a findability floor: the escape hatch persists across the entry screen and every chapter, is keyboard-focusable, and carries a clear accessible name. "Subtle" means visually restrained, never hidden.
- **Resolved by:** evidence (plan edited).
- **Raised in round:** R1.
- **Changed in plan:** Phase 2 "What we build".

### F12 — Evaluation-critical "fuller account" is gated behind deep zoom with easter eggs
- **Agent:** user-experience-designer (UX-007).
- **Category:** Progressive-disclosure misuse.
- **Finding:** The substance a recruiter needs sits behind the same discovery gesture as hidden rewards. Hide delight freely; never hide decision content.
- **Resolution:** In Phase 6, give the fuller account a visible "more" affordance separate from hidden easter eggs, and ensure the standard site carries the same substance for skimmers.
- **Resolved by:** evidence (plan edited).
- **Raised in round:** R1.
- **Changed in plan:** Phase 6 "What we build".

## Minor edits

- F13: Add a resolution call-to-action (contact / resume / standard portfolio) to the Phase 5 ending (UX-008) — user-experience-designer — Phase 5.
- F14: Add a one-line rollback trigger for the default flip (JD-006) — junior-developer — OQ2.
- F15: Justify Phase 6's position after Phase 5, or note it may run in parallel with Phase 5 (V6) — adversarial-validator — Phase 6 "Why this is Phase 6".
- F16: Own the Phase 7 "cheaper than piecemeal" and OQ2 "flip is safe" claims as judgment calls, not citation-backed facts (V8) — adversarial-validator — Phase 7 wording (partly mitigated by F1/F5).
- F17: Reword Phase 1 "no dependency on any other phase" to "no upstream dependency; the standard site receives later passes in Phases 2 and 8" (JD-007) — junior-developer — Phase 1 "Why this is Phase 1".

## Open items (author decision)

- **OI-1 (F8): RESOLVED (2026-07-27).** Design modernization and the skills-treatment redesign do not apply to the standard version — it stays in its current format (refresh, not redesign); expressive/personality-forward design belongs to the node-brain alternate. Recorded in build-preferences.md ("Two versions — keep them separate").
- **OI-2 (F1):** Which flip-gate shape — (a) keep a single Phase 7 and gate the OQ2 flip on it (simplest), or (b) build accessibility into each slice as acceptance criteria and shrink Phase 7 to a final sweep (cheaper long-run, per F5/V4)? The plan now states the gate; the mechanism is the author's call.
