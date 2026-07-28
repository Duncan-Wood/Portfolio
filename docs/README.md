# Portfolio Build — How We Work

This folder holds the plan and process for rebuilding the portfolio. Start here so the build stays consistent round to round.

## The two tracks

Refresh the existing standard site, then build a new interactive node-brain "story" experience. The full plan is in [plans/story-portfolio/build-phase-outline.md](./plans/story-portfolio/build-phase-outline.md) (8 phases).

## Document map

| Doc | What it's for |
|---|---|
| [plans/story-portfolio/build-phase-outline.md](./plans/story-portfolio/build-phase-outline.md) | The phased plan. Each phase has a status (In review / Ready / Planned). |
| [plans/story-portfolio/build-preferences.md](./plans/story-portfolio/build-preferences.md) | Standing preferences (voice, accuracy, design). **Consulted before every phase; updated after every review.** |
| [human-review.md](./human-review.md) | Your round-by-round feedback log. You add to it; Claude reads it. |

## The iteration loop

For each phase (or revision of one):

1. **Plan** (non-trivial phases only) — Claude runs `/plan-implementation` to turn the phase into a concrete build plan.
2. **Build** — Claude implements the phase, first reading `build-preferences.md` + memory so past feedback is respected.
3. **Self-review** — Claude runs `/code-review` on its own changes *before* handing back, to catch issues early and shorten your review.
4. **You review** — you add a dated section to `human-review.md` (see below).
5. **Distill + revise** — Claude lifts any *standing* preference from your feedback into `build-preferences.md` + memory, then revises. One-off fixes stay in the log.
6. Repeat until you accept the phase, then **commit** (Claude asks first).

## Commands (what to run when)

| When | Command |
|---|---|
| Before a big phase | `/plan-implementation` (then optionally `/iterative-plan-review` to harden it) |
| After Claude builds, before you review | `/code-review` (local, free — not `/code-review ultra`, which is the billed cloud review) |
| Formalize the preferences doc | `/coding-standard` |
| Design/visual work | `/frontend-design` |
| Quick cleanup after building | `/simplify` |
| Continue the phased plan | `/han-planning:plan-a-phased-build` (already run; use for re-planning) |

## How to add a review round

After Claude finishes a phase or revision, append a new **dated** section to [human-review.md](./human-review.md):

```markdown
## Review of <phase>, <pass> (<date + time>)
- <file / area>: <what's off, and what you want instead>
- <file / area>: <...>
```

Tips that make the loop work well:
- Name the file or section you're reacting to (`About.jsx`, "skills", "the nav") so feedback maps to a place.
- Say *what you want*, not just what's wrong — "lead with values, not resume bullets" is more actionable than "this is off."
- If a fact is wrong, point at the source of truth (a repo path) so Claude can verify instead of guess.

Claude reads the newest section each round, updates `build-preferences.md` + memory with anything durable, and revises.
