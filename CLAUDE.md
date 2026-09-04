# System Context & Constraints

## Repository Structure
This mono-repo contains two independent Vite applications joined only by root scripts and a dev proxy:
- `/` — React Portfolio (Stable, default landing page, crawlable).
- `/game` — Phaser 4 + TypeScript Game (Active development workspace).

## Critical Rules & Working Style
- **Velocity:** Move slow. Focus on high quality and deep understanding over speed. One stage at a time. Do not build ahead.
- **Workflow:** Always write the engine unit test *before* implementing the feature.
- **Game Dev Context:** User is an experienced engineer but new to game dev. Explicitly explain game-specific math/mechanics (e.g., lock delays, DAS/ARR, tween easing).
- **Communication:** Proactively ask either/or questions (provide 2-4 choices with your recommendation) before building features dependent on design decisions.
- **Code Comments:** Maximum 1–2 sentences. Only document traps or cross-file invariants. No histories, post-mortems, or legacy references.

## Non-Negotiable Architecture (`/game/src/`)
- `engine/` — Pure game logic only. **CRITICAL: Zero Phaser imports.** Grid, pieces, physics, gravity, chains, scoring. 100% covered via Vitest.
- `scenes/` — Phaser rendering, audio, particles, and hardware input detection. No core business logic.
- `input/` — Pure TypeScript DAS/ARR and key latching rules. **Phaser-free** to ensure game feel is fully testable.
- `fixed-timestep.ts` — Frame delta clamping and discrete step returns.
- `tuning.ts` — Game feel dials (exposed via `window.tuning` in development).
- **Performance Budget:** Build for 60fps and low input latency on low-end hardware. Favor computationally cheaper rendering techniques.

## Git & Deployment Protocol
- **Commits:** NEVER commit or stage code without explicit user approval for that exact diff. Author commits as the user with zero AI attribution. Split large tasks into reviewable chunks.
- **Root Commands:** 
  - `npm start` (Runs both dev environments at `:3000` and `:3000/game/`).
  - `npm run build` (Builds both into `build/`).
  - Preview production build using `npx serve build`. **NEVER use `serve -s build`** (breaks the `/game` routing asset catching).
- **Sub-package Commands:** Run `npm test`, `npm run typecheck`, and `npm run dev` strictly from inside `/game`. Root tests intentionally ignore the game directory.

## Known Traps & Quirks
- **Hidden Tabs:** Chrome pauses `requestAnimationFrame` when the tab is hidden. Do not trust or debug execution metrics unless the window is focused and visible.
- **Fatal Crashes:** Any unhandled exception escaping `BoardScene.update` halts Phaser's rAF chain permanently. If the FPS frozen display reads alive but `game.loop.frame` stalls, an exception was thrown (frequently via `Board.place` on an occupied tile).
- **Routing Overrides:** If Netlify directory resolution forces `/game` requests back to the portfolio home index, place `/game/* /game/:splat 200` directly above the `/* /index.html 200` catch-all directive in `public/_redirects`.
