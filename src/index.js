import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom'

/**
 * The portfolio's entry point. Create React App's build injects this into
 * `public/index.html`, which contains the empty `<div id="root">` below.
 *
 * Note this file has nothing to do with the game. `/game` never reaches React
 * at all — in development it is intercepted by `src/setupProxy.js`, and in
 * production it is a separate folder of files served directly.
 */

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  /**
   * StrictMode is a development-only wrapper. It deliberately renders every
   * component TWICE and runs effects twice, to surface side effects that are
   * not safe to repeat. It disappears entirely from production builds, so
   * anything that "only happens twice in dev" is this, not a bug.
   */
  <React.StrictMode>
    {/*
      Provides the routing context `App`'s <Routes> needs. "Browser" router means
      real URLs rather than hash URLs — which is why `public/_redirects` exists:
      a hard refresh would otherwise 404 on the host before React loads. In
      practice the app only ever serves `/`; the nav scrolls rather than routes.
    */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// CRA scaffolding. Called with no argument, so it collects nothing.
reportWebVitals();
