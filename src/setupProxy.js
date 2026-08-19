const { createProxyMiddleware } = require("http-proxy-middleware");

/*
 * DEVELOPMENT ONLY. Makes the game, which runs on its own server, appear at
 * `/game` on the portfolio's server.
 *
 * `npm start` launches two separate dev servers: Create React App's on :3000
 * and the game's Vite server on :5173. A browser page has one origin, so
 * something has to make :5173 reachable through :3000 — that is this file.
 *
 * It exists at this exact path because CRA hides its webpack config. If a file
 * named `src/setupProxy.js` exists, CRA loads it and hands over the underlying
 * Express app before installing its own handlers. It is the only supported way
 * to add custom dev-server middleware without ejecting.
 *
 * None of this applies in production. `npm run build` writes the game's files
 * into `build/game`, so the paths line up on disk and no proxy is needed — see
 * the root `build` script.
 */
module.exports = function (app) {
  /**
   * Redirect a bare `/game` to `/game/`.
   *
   * Vite is configured with `base: '/game/'`, so it emits asset URLs relative to
   * that trailing slash. Without the slash the browser treats `/game` as a file
   * and resolves siblings against `/` instead, so every asset 404s.
   */
  app.use((request, response, next) => {
    if (request.url === "/game") {
      return response.redirect("/game/");
    }
    next();
  });

  app.use(
    createProxyMiddleware({
      pathFilter: "/game",
      target: "http://localhost:5173",

      /** Rewrite the Host header so Vite believes the request arrived directly. */
      changeOrigin: true,

      /**
       * Forward WebSocket upgrades as well as plain HTTP.
       *
       * Vite injects a client script that holds a WebSocket open to its dev
       * server; that socket is how the server pushes "this file changed" to the
       * page, since HTTP only lets the client start a conversation. A WebSocket
       * begins life as an HTTP request carrying an `Upgrade` header, and a proxy
       * that only understands plain HTTP passes the request but drops the
       * upgrade. Without this flag the page still loads, but edits stop
       * appearing until you refresh by hand.
       */
      ws: true,
    })
  );
};
