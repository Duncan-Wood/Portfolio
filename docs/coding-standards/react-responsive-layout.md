---
paths:
  - "src/**/*.jsx"
  - "src/**/*.js"
---
# React Responsive Layout: Adapt Automatically, Don't Hand-Tune Breakpoints

**Status:** proposed
**Applies To:** Layout markup in the portfolio's React components — the Tailwind utility classes that control how elements arrange, wrap, and size across viewports.
**Date Created:** 2026-07-26
**Last Updated:** 2026-07-26

## Introduction

The portfolio must look right on any screen without someone returning to nudge values for a specific width. This standard exists because a layout was made to fit by hand-tuning it to one width (the navigation bar: spacing was tightened and a breakpoint bumped so a fixed number of items squeezed in), which broke again the moment an item was added. The fix is to prefer layouts that reflow on their own.

## Purpose

- **Primary — layouts adapt on their own.** A layout should reflow correctly across the whole viewport range because of *how it is built*, not because values were tuned to specific widths. This is the rule; everything below serves it.
- **Secondary — changes stay cheap.** Content-driven layouts survive new items, longer text, and new sections without a fresh round of width-tuning.
- **Side effect — fewer overflow bugs.** Intrinsic reflow removes the narrow-window overflow class of bug entirely, rather than patching each width where it appears.

## When to apply this pattern

1. **Q1 — Are you writing or changing markup that arranges multiple elements (a row, grid, nav, list, or card set)?** No → this standard does not apply. Yes → Q2.
2. **Q2 — Must it hold up across screen sizes (essentially all user-facing layout)?** No (a fixed-size, non-responsive element by design) → see *When NOT to apply*. Yes → Q3.
3. **Q3 — Can the arrangement be expressed with a content-driven primitive** (`flex-wrap`, an auto-reflowing grid, `min/max` sizing, fluid units) **plus at most a couple of semantic breakpoints?** Yes → do that (*Correct usage*). No, you find yourself adding a numeric value to make one specific width fit → stop; that is the anti-pattern (*What to avoid*).

## When NOT to apply

- **A genuinely fixed-size element by design** — an icon, a logo lockup, a fixed-aspect media embed. Hard-coding its size is correct; don't force a responsive primitive onto something that shouldn't reflow.
- **A one-off within a single already-responsive parent** where the parent's flex/grid already handles reflow — adding more responsive machinery to the child is redundant. The simpler choice (let the parent reflow, write the child plainly) is the right one; not every element needs its own breakpoints.
- **A single deliberate, semantic breakpoint** (e.g., stack on phones, row on desktop via `flex-col sm:flex-row`) is *not* hand-tuning and is encouraged. The anti-pattern is tuning numeric values to a *specific pixel width to make a fixed count fit*, not using breakpoints at all.

## Correct usage

A grid that reflows its column count on its own — add or remove cards freely, no width-tuning (`src/components/Projects.jsx`, the shared `cardGrid` constant):

```jsx
const cardGrid =
  "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 justify-items-center";
```

Content-driven wrapping — the badges wrap to as many rows as needed at any width (`src/components/Skills.jsx`):

```jsx
<div className="flex flex-wrap gap-2 justify-center sm:justify-start">
  {group.skills.map((skill) => (
    <span key={skill} className="...px-4 py-2 rounded-lg">{skill}</span>
  ))}
</div>
```

One semantic breakpoint: stack on phones, row on wider screens — no per-width tuning (`src/components/Experience.jsx`):

```jsx
<div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-3">
```

## What to avoid

Tuning numeric values so a fixed number of items fits one width. In `src/components/nav.jsx` the row holds a fixed set of links; making them fit by shrinking spacing and moving the collapse breakpoint is tuning-to-a-width — it fits *today's* item count and breaks when the next link is added:

```jsx
{/* AVOID: spacing tightened and breakpoint chosen so N items fit a specific width */}
<div className="hidden md:block md:ml-6">
  <div className="flex flex-row space-x-2 items-center">
    {/* seven links that must all fit on one line */}
```

Prefer a layout that reflows regardless of item count — let the row wrap, or collapse to a menu based on available space rather than a width picked to fit the current number of links. A magic offset that nudges one element into place at one width is the same anti-pattern in miniature.

## Rationale

Hand-tuned values encode a snapshot: they are correct only for the exact content and viewport they were tuned against, and every content change silently invalidates them, so the same overflow bug returns and someone re-tunes. Content-driven primitives (`flex-wrap`, auto-reflow grids, fluid sizing) push the arrangement decision to the browser at render time, which is the only place that actually knows the current width and content. Inconsistency here already cost one real defect and two review findings on a single nav bar; the cost compounds as the interactive story adds motion-heavy, multi-element scenes.

## Verification

Resize the browser continuously from ~320px to ~1920px on the changed view. The layout must reflow with no width where content overflows, clips, or forces horizontal scroll. Objective trigger for the anti-pattern: **if you added or changed a numeric value (a breakpoint, a spacing step, a fixed width, an offset) specifically to make one width fit, you are hand-tuning** — replace it with a content-driven primitive. `git diff` the change and check whether any numeric value exists only to fix a single width.

## Additional Resources

- [build-preferences.md](../plans/story-portfolio/build-preferences.md) — the standing "Design & responsiveness" preference this standard formalizes.
- Deferred companion: an accessibility-per-slice standard, to be written when the first interactive story component lands (per the story build plan).
