# Portfolio Build Preferences

Durable preferences and conventions for this portfolio build. **Consult this before starting or revising any phase, and update it after every human-review round.** It is the standing "how Duncan wants this done" that the phase outline and per-phase work must respect.

Companion docs: [build-phase-outline.md](./build-phase-outline.md) (the plan) · [../human-review.md](../human-review.md) (the running review log).

## Two versions — keep them separate (scope)

The portfolio has two distinct experiences, and work for one must **not** bleed into the other:

- **The standard version** is the existing conventional site (Home · About · Experience · Projects · Skills · Contact). Its job is to be **functional, scannable, and professional** — the version recruiters, web scrapers, and people who don't want the new experience use. Phase 1 **refreshes** it: update content, prune, modest modernization **within the current format**. Do **not** redesign it from scratch or replace the existing design, and do **not** put personal-life / life-story content on it (no high-school-onward journey, theatre, kickball, dogs, etc.).
- **The node-brain alternate** (the story experience, Phases 2–8) is where the **warm, handmade, whole-person, expressive** material lives — the life journey, the drawings, the immersion, the distinctive art direction.

Design reinvention and personality-forward art direction belong to the **alternate**, not the standard version. (Lesson learned: a `/frontend-design` pass produced new concepts and a life-story layout for the standard version — both wrong; that energy is for the alternate.)

## The iteration loop

1. Claude implements or revises a phase.
2. Duncan reviews and records feedback in `docs/human-review.md` (one section per round, dated).
3. Claude distills the durable preferences from that feedback into **this file** (and into persistent memory), then revises the work.
4. Repeat until the phase is accepted.

Feedback that is one-off ("fix this typo") stays in the review log. Feedback that reveals a *standing preference* ("never describe me this way") is lifted into this file so it applies to every future phase.

## Voice & content

- **Lead with who Duncan is and what he cares about**, not resume bullets. The throughline is *using technology to improve society and be part of something bigger than himself.* Role specifics come after that framing, not before it.
- **No negative or "shady"-sounding backstory.** Avoid framing like "during an abrupt organizational transition." If context isn't flattering and isn't relevant to who he is today, cut it.
- **No vague-but-intense phrasing.** Phrases like "resolving severe state-desync issues" sound intense but say little — either make them concrete and accurate or drop them.
- **No empty clichés.** E.g., "finding the real root cause rather than the first fix that compiles" — cut.
- **Accurate and fair beats impressive.** Never inflate. If a metric wasn't actually proven, don't state it as fact.

## Accuracy & sourcing

Verify every specific work claim against the source repos before writing it — don't paraphrase the resume.

| Topic | Source repo | Notes |
|---|---|---|
| State Scorecard modules; AI-Summarizable concern | `/Users/duncanecomap.tech/Desktop/Programming/EcoMap/remington` | More than two modules; "analytics" is arguable. The AI-Summarizable concern was a **joint effort** where Duncan did much of the refining — not sole authorship. |
| "Update Detector" (was mislabeled "Internal Data-Review Tool") | `/Users/duncanecomap.tech/Desktop/Programming/EcoMap/update-detector` | Use the real project name. Investigate for an accurate description. |

Known corrections to carry forward:
- The **"~5x inference cost cut"** claim was about something else and was **never really proven** — do not use it.
- **RAG embedding-migration / "three modules"** figures need verification against `remington` before reuse.

## Identity & titles

- **Avoid "frontend", "backend", and "full-stack" as identity labels.** Duncan is a generalist programmer; his official title never used those words, and he considers the frontend/backend split outdated. Prefer "software engineer" / "generalist" framing.

## Projects curation

- **Separate professional and personal projects into distinct, clearly-labeled sections.** Mixing them in one grid is confusing (they aren't the same kind of thing) and in the Phase-1 build it broke the layout — the "Show All / Load More" button appeared too early and the hidden content didn't display properly. Each group should own its section and its own show-more behavior.
- Some personal/bootcamp projects aren't compelling enough to feature or keep: **Tick-iT, Amazon Clone, Fake Twitter** are candidates to cut or drop entirely.
- Professional projects should use their **real names** (e.g., Update Detector) and accurate, verified descriptions.

## Skills presentation

- **Don't group skills by frontend/backend** — it's limiting and Ruby on Rails alone spans both.
- The plain text badges felt **soulless and uglier** than the previous logo version — but the logo grid also may not be the answer. This needs a better-designed treatment with more character, not just a list.

## Design & responsiveness

- **Standing goal: modernize the visual design — within the current format for the standard version.** The standard site should feel current, with more soul than a default template, but **evolve the existing design rather than replace it** (see *Two versions* above). Personality-forward reinvention belongs to the node-brain alternate.
- **Responsiveness must be automatic, not hand-tuned per breakpoint.** The nav currently overflows at some widths — solve it so layouts adapt on their own rather than requiring manual tweaks for each screen size.

## Open design questions

- What's the right skills treatment that has character but stays accurate and non-categorized-by-layer?
- How far to take the standard-site redesign now vs. as a later dedicated pass?
