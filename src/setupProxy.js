const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
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
      changeOrigin: true,
      ws: true,
    })
  );
};
