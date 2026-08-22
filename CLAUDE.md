# Portfolio

## Project Discovery

Single-project repository: a personal portfolio single-page app.

### Stack
- **Language:** JavaScript (JSX), React 18
- **Frameworks/libraries:** Vite 8 (`vite.config.mjs`), Tailwind CSS 3 (with PostCSS + Autoprefixer), `react-router-dom` 6, `react-scroll`, `emailjs-com` (contact form)
- **Package manager:** npm (`package-lock.json`). Node >= 22.12, which Vite 8 requires — see `.nvmrc`
- **Testing:** Vitest (jsdom), React Testing Library

### Commands
- Install: `npm install`
- Dev server: `npm start`
- Build: `npm run build`
- Test: `npm test`

### Layout
- `index.html` — the entry point Vite starts from; it names `src/index.jsx` directly
- `src/` — application source; entry `src/index.jsx`, root `src/App.jsx`
- `src/components/` — page sections (`Main`, `About`, `Projects`, `Skills`, `Contact`, `home`, `nav`)
- `src/assets/` — images
- `public/` — files copied to the build root untouched (`manifest.json`, `favicon.ico`, `resume.pdf`); `_redirects` present for SPA redirect hosting
- `tailwind.config.js`, `postcss.config.js` — styling config

## Build workflow

This portfolio is being rebuilt in phases with a human-review loop. Before working on it, read:
- `docs/README.md` — the process (loop + which command to run when).
- `docs/plans/story-portfolio/build-preferences.md` — standing voice/design preferences; respect these every phase.
- `docs/plans/story-portfolio/build-phase-outline.md` — the phased plan and current status.
- `docs/human-review.md` — Duncan's round-by-round feedback; read the newest section each round.

## Coding Standards

Coding standards live in `docs/coding-standards/`. They are exposed to Claude Code through a small set of per-file-type index files under `.claude/rules/coding-standards/`. Each index file is a path-scoped rule that lists the standards relevant to one file type, with a short description of each. When Claude reads a file matching an index's `paths:` glob, Claude loads only the index and then decides which (if any) standards to open. The full text of a standard is never loaded automatically. Standards do not appear in the available-skills picker. Humans continue to browse `docs/coding-standards/` for the canonical readable form.
