# Portfolio

## Project Discovery

Single-project repository: a personal portfolio single-page app.

### Stack
- **Language:** JavaScript (JSX), React 18
- **Frameworks/libraries:** Create React App (`react-scripts` 5.0.1), Tailwind CSS 3 (with PostCSS + Autoprefixer), `react-router-dom` 6, `react-scroll`, `emailjs-com` (contact form), `react-icons` / `react-bootstrap-icons`
- **Package manager:** npm (`package-lock.json`)
- **Testing:** Jest via `react-scripts test`, React Testing Library

### Commands
- Install: `npm install`
- Dev server: `npm start`
- Build: `npm run build`
- Test: `npm test`

### Layout
- `src/` — application source; entry `src/index.js`, root `src/App.js`
- `src/components/` — page sections (`Main`, `About`, `Projects`, `Skills`, `Contact`, `home`, `nav`)
- `src/assets/` — images
- `public/` — static shell (`index.html`, `manifest.json`); `_redirects` present for SPA redirect hosting
- `tailwind.config.js`, `postcss.config.js` — styling config
