---
title: Portfolio Metamorphosis — Build-Phase Outline
source: ../../../Concept.md
storyboard: ../../../storyboard/
status: in-progress — Phase 1
---

# Portfolio Metamorphosis — Build-Phase Outline

This outline turns the portfolio metamorphosis concept into a sequence of build phases. Each phase is a thin, end-to-end slice you can put in front of a real visitor and watch work. Earlier phases stay valid as later ones enrich them, and every phase traces back to the concept note or the hand-drawn storyboard that inspired it.

The plan covers two connected tracks: refreshing the existing conventional ("standard") portfolio so it reflects the last three years, and building a brand-new interactive story experience in which a visitor lands on a glowing node-brain and is carried through the highlights of your life. The two are wired together so a visitor can move between them at any time.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Build Phase Index](#build-phase-index)
- [How This Build Departs from the Concept Note](#departures)
- [Phase Kinds](#phase-kinds)
- [Phase 1 — Refresh the Standard Portfolio](#phase-1)
- [Phase 2 — Two-Experience Shell](#phase-2)
- [Phase 3 — First Chapter by Zooming Into the Node](#phase-3)
- [Phase 4 — Complete the Life-Journey Timeline](#phase-4)
- [Phase 5 — Narrative Resolution](#phase-5)
- [Phase 6 — Deeper Detail and Hidden Rewards](#phase-6)
- [Phase 7 — Works Everywhere, for Everyone](#phase-7)
- [Phase 8 — Final Art and Unified Identity](#phase-8)
- [Open Questions](#open-questions)

## Executive Summary {#executive-summary}

**Goal.** A visitor arrives and is taken on a short, interactive adventure through your life — high school in Illinois, college in Florida, your years in the DC area, and your software career — framed by a node-brain that opens the story and resolves it by reaching outward to connect with others. Anyone who prefers a conventional page, or any automated reader, can switch to a refreshed standard portfolio at any time. "Fully shipped" means both experiences are live, wired together, work on phones, are usable without a mouse, and carry your final artwork.

**Shape of the build.**

- Start with the safe, high-value work: bring the existing standard portfolio up to date so it can serve as the reliable fallback the story links to.
- Stand up a shell where the node-brain is the entryway and a visitor can cross between the two experiences.
- Prove the whole story interaction on a single chapter before building the rest.
- Fill in the remaining chapters, close the narrative loop, then layer on depth, hidden rewards, broad device support, and final art.

**Sequencing rationale.** The standard refresh comes first because the story's escape-hatch banner points at it, and because it delivers real value on day one with almost no risk. The interactive experience is then grown one demoable slice at a time, so the novel interaction is validated early and cheaply. Artwork is deliberately the last major layer: rough placeholder shapes stand in throughout the build so the experience can be demonstrated long before the illustrations are finished.

**Departures from the concept.** One shaping decision changes how several phases are built — final illustrations are produced *after* the interaction works, not before. See [How This Build Departs from the Concept Note](#departures).

**Deferred.** Modernizing the underlying build tooling is out of scope for now and listed at the bottom of the [Build Phase Index](#build-phase-index) with a reopening trigger.

**Where to look next.** Phase 1 is greenlit and in progress. The open questions that blocked Phase 2 — the node-rendering approach and the default landing — are now resolved; see [Open Questions](#open-questions).

## Build Phase Index {#build-phase-index}

| # | Phase | Kind | Status | Outcome (one sentence) |
|---|-------|------|--------|------------------------|
| 1 | [Refresh the Standard Portfolio](#phase-1) | Feature slice | In progress | The conventional site reflects the last three years and every link works. |
| 2 | [Two-Experience Shell](#phase-2) | Foundation | Ready | Visitors land on the node-brain and can switch to the standard site and back. |
| 3 | [First Chapter by Zooming Into the Node](#phase-3) | Feature slice | Planned | Entering the glowing node zooms into the first life scene with hover details. |
| 4 | [Complete the Life-Journey Timeline](#phase-4) | Feature slice | Planned | Visitors move forward and back through all four life chapters. |
| 5 | [Narrative Resolution](#phase-5) | Feature slice | Planned | The journey ends by pulling back to the node-brain reaching outward. |
| 6 | [Deeper Detail and Hidden Rewards](#phase-6) | Feature slice | Planned | Curious visitors zoom into experiences and discover easter eggs. |
| 7 | [Works Everywhere, for Everyone](#phase-7) | Polish | Planned | The story works on phones and for keyboard and reduced-motion visitors. |
| 8 | [Final Art and Unified Identity](#phase-8) | Polish | Planned | Final illustrations and the node-brain logo replace every placeholder. |
| — | Modernize the build tooling | Deferred | Deferred | *(deferred)* Revisit only if tooling friction blocks the interactive work. |

## How This Build Departs from the Concept Note {#departures}

<a id="d1"></a>
**D1 — Placeholder-first artwork.** The concept note lists "research and produce the artwork" as one of the chunks of work, which could be read as producing the illustrations before building the experience. This plan does the opposite: every story phase is built with rough placeholder shapes standing in for the node-brain, the shadow character, and the scene frames, and the final vector illustrations are swapped in during [Phase 8](#phase-8). This keeps the experience demonstrable months before the art is finished and prevents unfinished art from blocking any build work. Individual phases refer to this decision as "D1 (placeholder-first)."

## Phase Kinds {#phase-kinds}

- **Foundation** — Prerequisite work a later phase requires. Still demonstrable on its own.
- **Feature slice** — A thin, end-to-end slice that delivers value a visitor can recognize.
- **Polish** — Enrichment that improves an already-working core rather than making it work.
- **Deferred** — Out of scope for now, listed for traceability with a named trigger for reopening it.

## Phase 1 — Refresh the Standard Portfolio {#phase-1}

**Kind.** Feature slice.

**Builds on.** Nothing — this is the starting phase.

**What we build.** Bring the existing conventional portfolio up to date so it honestly reflects the last three years and can act as the dependable fallback the story experience links to.

- Update the about and experience content to include the software career (Ecomap and the Mighty Crow contract work) and the growth since the last version.
- Refresh the skills so they match current reality.
- Prune old or less-relevant projects and update the ones that remain.
- Confirm the contact form still delivers messages.
- Confirm the resume link points at the current resume.

The logo and headshot are intentionally left for later: the leaf-to-brain logo change belongs with the unified visual identity in [Phase 8](#phase-8), and a refreshed headshot depends on an asset that is not ready yet (see [Open Questions](#open-questions)).

**Why this is Phase 1.** The story experience's escape-hatch banner ("take me to the standard version") points directly at this site, so it must be trustworthy before the two are wired together. It is also the lowest-risk, highest-certainty work in the plan and delivers real value immediately, with no dependency on any other phase.

**Outcome to demonstrate.**

1. Open the standard portfolio.
2. Read the about and experience sections and see the software career represented accurately.
3. Scan the skills and projects and confirm nothing is stale.
4. Submit a message through the contact form and confirm it arrives.
5. Click the resume link and confirm the current resume opens.

**Source citations.**

- [Concept.md → Plan](../../../Concept.md#plan) — the "update the boring/standard version" chunk.
- [Concept.md → Current Status](../../../Concept.md#current-status) — the intent to keep an updated standard version for automated readers and visitors who skip the new experience.
- [README.md](../../../README.md) — current experience, skills, and project content to update.
- [Resume.docx](../../../Resume.docx) — the current resume the standard site's content and resume link must match.

**Connects to.** Feeds [Phase 2](#phase-2), which links to this site as the alternate experience.

**Preconditions to verify before starting.**

- Headshot — **resolved:** keep the current headshot through Phase 1; revisit in [Phase 8](#phase-8).
- Resume — **resolved:** the current resume is identified and up to date; see this phase's Source citations.

## Phase 2 — Two-Experience Shell {#phase-2}

**Kind.** Foundation.

**Builds on.** [Phase 1](#phase-1).

**What we build.** The entryway for the new experience and the ability to cross between the two.

- A new node-brain screen renders as the entry to the story experience, drawn with placeholder shapes per D1 (placeholder-first).
- One node glows while the others stay dark, signalling where the story begins.
- A subtle banner offers to take the visitor to the standard version.
- The standard version offers a way back to the story experience (an inferred navigation need, not stated in the concept note).

This phase does not yet zoom into the node or tell any chapter — it establishes the two-experience structure and the crossing between them.

**Why this is Phase 2.** Every later story phase needs an entry point and a way to move between the two experiences, so this is the foundation the rest of the story stands on. It comes after Phase 1 because the "take me to the standard version" banner needs a finished standard site to point at. It is demonstrable on its own: a visitor can land on the node-brain and cross to the standard site and back.

**Outcome to demonstrate.**

1. Open the site and land on the node-brain entry screen.
2. See a single node glowing among darker ones.
3. Click the banner and arrive at the refreshed standard portfolio from [Phase 1](#phase-1).
4. Follow the link back and return to the node-brain.

**Source citations.**

- [storyboard/1.jpg](../../../storyboard/1.jpg) — the opening node-brain with one glowing node and the "take me to the standard version" banner.
- [Concept.md → Future Status](../../../Concept.md#future-status) — the subtle banner to the standard version.
- [Concept.md → Plan](../../../Concept.md#plan) — the brain-with-nodes concept that carries through the site.

**Connects to.** Feeds [Phase 3](#phase-3), which builds the zoom-into-node interaction on top of this entry screen.

**Preconditions to verify before starting.**

- Which visual approach renders the node system? (See [OQ1](#oq-1).)
- During the build, which experience is the default landing — the node-brain or the standard site? (See [OQ2](#oq-2).)

## Phase 3 — First Chapter by Zooming Into the Node {#phase-3}

**Kind.** Feature slice.

**Builds on.** [Phase 2](#phase-2).

**What we build.** The complete story interaction, proven on a single chapter — the high-school years.

- Entering the glowing node zooms the view inward, transitioning from the node-brain into the first scene.
- The high-school scene appears with its placeholder elements (the lonely-kid lunch, the built computer, speech, and theatre).
- Hovering an element reveals a short blurb about that memory.

Only one chapter is built here. The goal is to validate the entry-to-scene-to-detail interaction before repeating it.

**Why this is Phase 3.** Building all four chapters before knowing the core interaction feels right would be expensive to unwind. One chapter proves the zoom transition, the scene layout, and the hover-for-detail behaviour end to end, so the remaining chapters in [Phase 4](#phase-4) become repetition of a known-good pattern.

**Outcome to demonstrate.**

1. Start on the node-brain and enter the glowing node.
2. Watch the view zoom inward and settle on the high-school scene.
3. Hover the built-computer element and read its blurb.
4. Hover the theatre element and read its blurb.

**Source citations.**

- [storyboard/2.jpg](../../../storyboard/2.jpg) — the Illinois high-school scene and the "hover for short blurbs" note.
- [storyboard/1.jpg](../../../storyboard/1.jpg) — the zoom-into-the-node transition.
- [Concept.md → Future Status](../../../Concept.md#future-status) — landing and being taken on a short adventure; zooming into experiences to learn more.

**Connects to.** Establishes the pattern that [Phase 4](#phase-4) repeats across the remaining chapters; the hover detail here is deepened in [Phase 6](#phase-6).

**Preconditions to verify before starting.**

- The visual approach chosen in [Phase 2](#phase-2) supports smooth zooming and hover targets.

## Phase 4 — Complete the Life-Journey Timeline {#phase-4}

**Kind.** Feature slice.

**Builds on.** [Phase 3](#phase-3).

**What we build.** The remaining three chapters and the ability to travel through the whole timeline.

- The college years in Florida (the flight south, the Imprint article, student organizations, the Writing Center).
- The DC-area years (fundraising for queer rights, dog walking, kickball, the coding bootcamp).
- The software career (Ecomap's work and the move to Mighty Crow).
- Scrolling carries the visitor forward and backward through the chapters, fast-forwarding or reversing through the journey.

Each new chapter reuses the scene-and-hover pattern proven in [Phase 3](#phase-3).

**Why this is Phase 4.** With the interaction validated on one chapter, the remaining chapters are lower-risk repetition. Adding scrolling here — once there is more than one chapter to move between — is the moment travel through the timeline becomes meaningful. After this phase, the full life story is walkable start to finish.

**Outcome to demonstrate.**

1. Enter the story and scroll forward from the high-school scene into Florida, then DC, then the software career.
2. Confirm each chapter shows its scene and reveals blurbs on hover.
3. Scroll backward and travel in reverse through the chapters.

**Source citations.**

- [storyboard/3.jpg](../../../storyboard/3.jpg) — Florida and UCF: Imprint, student orgs, the Writing Center.
- [storyboard/4.jpg](../../../storyboard/4.jpg) — the DC-area chapter: fundraising, dog walking, kickball, coding bootcamp.
- [storyboard/5.jpg](../../../storyboard/5.jpg) — the software career: Ecomap's projects and Mighty Crow.
- [Concept.md → Future Status](../../../Concept.md#future-status) — the full narrative arc from high school through the software roles.
- [Concept.md → Plan](../../../Concept.md#plan) — the storyboard as the reference for the journey.

**Connects to.** Provides the chapters that [Phase 5](#phase-5) resolves and that [Phase 6](#phase-6) deepens.

**Preconditions to verify before starting.**

- The short blurb text for each experience across all three chapters is written or drafted.

## Phase 5 — Narrative Resolution {#phase-5}

**Kind.** Feature slice.

**Builds on.** [Phase 4](#phase-4).

**What we build.** The ending that closes the story's loop.

- After the software-career chapter, the view pulls back out to the node-brain.
- This time the nodes reach outward from the brain, symbolising making connections and contributions beyond yourself.

**Why this is Phase 5.** The resolution only lands once the full journey exists to resolve, so it depends on the completed timeline. It gives the experience a deliberate ending rather than trailing off after the last chapter, completing the arc the opening node-brain set up.

**Outcome to demonstrate.**

1. Travel through the timeline to the end of the software-career chapter.
2. Watch the view pull back to the node-brain.
3. See the nodes now reaching outward to connect with others.

**Source citations.**

- [storyboard/6.jpg](../../../storyboard/6.jpg) — the closing node-brain with nodes reaching outward to connect with others.
- [Concept.md → Future Status](../../../Concept.md#future-status) — wrapping back to the node-connected brain with nodes coming out to symbolise connection and contribution.

**Connects to.** Completes the core narrative begun in [Phase 2](#phase-2) and built through [Phase 4](#phase-4). Once this phase ships, the story is a complete experience and can become the default landing (see [Open Questions](#open-questions)).

**Preconditions to verify before starting.**

- The full timeline from [Phase 4](#phase-4) is walkable end to end.

## Phase 6 — Deeper Detail and Hidden Rewards {#phase-6}

**Kind.** Feature slice.

**Builds on.** [Phase 4](#phase-4).

**What we build.** Rewards for visitors who slow down and look closer.

- Zooming further into an experience reveals a fuller account of it, beyond the short hover blurb.
- Hidden easter eggs are tucked into the scenes to reward curious exploration.

**Why this is Phase 6.** This enriches chapters that already exist and work, so it sensibly follows the complete timeline. It is separated from the core chapters because the experience is already valuable without it — the depth and the hidden rewards make a good experience delightful rather than making it function.

**Outcome to demonstrate.**

1. Enter a chapter and zoom into a single experience.
2. Read the fuller account that appears beyond the hover blurb.
3. Discover at least one hidden easter egg by exploring a scene.

**Source citations.**

- [Concept.md → Future Status](../../../Concept.md#future-status) — zooming into experiences for more detail; easter eggs.
- [Concept.md → Plan](../../../Concept.md#plan) — rewarding visitors with hidden interactivity for looking closer.

**Connects to.** Deepens the hover detail introduced in [Phase 3](#phase-3) and extended in [Phase 4](#phase-4).

**Preconditions to verify before starting.**

- The longer-form content and any easter-egg ideas for at least the first chapter are drafted.

## Phase 7 — Works Everywhere, for Everyone {#phase-7}

**Kind.** Polish.

**Builds on.** [Phase 3](#phase-3), [Phase 4](#phase-4), [Phase 5](#phase-5), [Phase 6](#phase-6).

**What we build.** Broad device and accessibility support for the interactive experience so it is not confined to one screen size or one way of navigating.

- The story adapts to phone and tablet screens, with touch replacing hover where needed.
- The journey can be navigated without a mouse.
- Visitors who prefer reduced motion get a calmer version of the transitions.
- Scenes and their elements carry text descriptions so the story is legible to assistive technology and to automated readers.

**Why this is Phase 7.** This hardens an experience that already works on a desktop with a mouse, so it follows the phases that build that experience. It is grouped into one dedicated pass because the story is motion-heavy and scroll-driven, which raises device and accessibility concerns that are cheaper to address deliberately across the whole experience than piecemeal.

**Outcome to demonstrate.**

1. Open the story on a phone and travel through the timeline with touch.
2. Navigate the journey using only the keyboard.
3. Turn on a reduced-motion preference and confirm the transitions calm down.
4. Confirm each scene's elements expose readable descriptions.

**Source citations.**

- [Concept.md → Plan](../../../Concept.md#plan) — keeping the site mobile-friendly and accessible, not restricted to one screen size.

**Connects to.** Hardens everything delivered in [Phase 3](#phase-3) through [Phase 6](#phase-6).

**Preconditions to verify before starting.**

- The core chapters and interactions are stable enough that adapting them will not be invalidated by imminent changes.

## Phase 8 — Final Art and Unified Identity {#phase-8}

**Kind.** Polish.

**Builds on.** [Phase 2](#phase-2), [Phase 3](#phase-3), [Phase 4](#phase-4), [Phase 5](#phase-5), [Phase 6](#phase-6), [Phase 7](#phase-7).

**What we build.** The visual finish that unifies both experiences, swapping placeholders for the real thing per D1 (placeholder-first).

- Final vector illustrations replace the placeholder node-brain, the shadow character, and every scene across the chapters.
- The standard portfolio's logo moves from the leaf to the node-brain, tying the two experiences together visually.
- If a refreshed headshot is ready, it is added to the standard portfolio.

**Why this is Phase 8.** Under the placeholder-first decision, final art is the last major layer: it depends on every scene existing so there is a complete inventory to illustrate, and it must not block earlier interaction work. Doing the logo change here as well means the unified brain identity lands across both experiences at once.

**Outcome to demonstrate.**

1. Travel through the whole story and see final illustrations in place of every placeholder.
2. Open the standard portfolio and see the node-brain logo in place of the leaf.
3. Confirm the two experiences read as one visual identity.

**Source citations.**

- [Concept.md → Plan](../../../Concept.md#plan) — producing the brain-with-nodes logo and theme, drawing the storyboard frames and a distinguishable shadow character, and possibly moving the logo from the leaf to the brain.
- [Concept.md → Current Status](../../../Concept.md#current-status) — the leaf-and-nodes logo being replaced by the brain.
- [storyboard/1.jpg](../../../storyboard/1.jpg), [storyboard/6.jpg](../../../storyboard/6.jpg) — the node-brain that anchors the visual identity.

**Connects to.** Completes the placeholder-first decision named in [How This Build Departs from the Concept Note](#departures) and finishes the identity introduced back in [Phase 1](#phase-1) and [Phase 2](#phase-2).

**Preconditions to verify before starting.**

- The method for producing the final illustrations is decided and the art is ready. (See [OQ3](#oq-3).)
- Whether a refreshed headshot is available. (See [OQ4](#oq-4).)

## Open Questions {#open-questions}

### OQ1 — Which visual approach renders the node system? {#oq-1}

**Blocks phase(s).** [Phase 2](#phase-2) (and by extension the whole story experience).

The node-brain and its connecting nodes are the signature visual, and the concept explicitly calls for researching the right technology — something simple, elegant, and geometric that can carry through the site. The choice affects how crisply the nodes scale, how easily hover and zoom targets are attached, and how well the experience performs on phones.

- **Option A (recommended): a resolution-independent, shape-based approach.** Best for crisp geometric lines at any zoom, straightforward hover and click targets, and text descriptions for accessibility. Recommended unless motion complexity later proves it too heavy.
- **Option B: a pixel/raster rendering approach.** More headroom for dense particle-like motion, at the cost of harder accessibility and interaction targeting.
- **Recommendation:** Start with Option A; only move to Option B for specific scenes if motion demands it.
- **Decision (resolved):** Option A — the resolution-independent, shape-based approach, unless motion complexity later proves it too heavy.

### OQ2 — Which experience is the default landing during the build? {#oq-2}

**Blocks phase(s).** [Phase 2](#phase-2).

The concept wants visitors to land in the story, but it also values keeping the standard version reachable for automated readers and for people who do not want the new experience. Until the story is complete, defaulting everyone into a half-built experience is risky.

- **Option A (recommended): keep the standard portfolio as the default landing until [Phase 5](#phase-5) ships, then flip the default to the story.** Protects recruiters and automated readers during the build while still letting you demo the story via a direct link.
- **Option B: make the story the default landing immediately.** Delivers the intended first impression sooner but exposes unfinished chapters.
- **Recommendation:** Option A — flip the default once the narrative is whole.
- **Decision (resolved):** Option A — the standard portfolio stays the default landing until [Phase 5](#phase-5) ships, then the default flips to the story.

### OQ3 — How are the final illustrations produced? {#oq-3}

**Blocks phase(s).** [Phase 8](#phase-8).

The final art needs a distinguishable shadow-character version of you and identifiable scenes for each experience, in a simple, artistic, vector style. The production method (illustration tooling, a commissioned artist, or a generated-then-refined approach) determines how long Phase 8 takes and should be settled while the earlier phases run so the art is ready in time.

- **Recommendation:** Decide the method during [Phase 3](#phase-3) or [Phase 4](#phase-4) and produce art in parallel, so it is ready to swap in at [Phase 8](#phase-8) without stalling the build.
- **Decision (resolved):** Accepted — settle the production method during [Phase 3](#phase-3) or [Phase 4](#phase-4) and produce the art in parallel, ready to swap in at [Phase 8](#phase-8).

### OQ4 — Is a refreshed headshot available? {#oq-4}

**Blocks phase(s).** [Phase 8](#phase-8) (and optionally [Phase 1](#phase-1)).

The concept notes the headshot is not ready yet.

- **Recommendation:** Keep the current headshot (or omit it) through [Phase 1](#phase-1), and add a refreshed one in [Phase 8](#phase-8) if it becomes available. Do not let the headshot block the standard refresh.
- **Decision (resolved):** Keep the current headshot through [Phase 1](#phase-1); revisit in [Phase 8](#phase-8) if a refreshed one becomes available.

### Carry-over notes

- **Logo change timing.** Moving the logo from the leaf to the node-brain is folded into [Phase 8](#phase-8) so the unified identity lands across both experiences at once, rather than changing the standard site's logo before the brain visual exists. No decision is required unless you want the logo changed earlier.
