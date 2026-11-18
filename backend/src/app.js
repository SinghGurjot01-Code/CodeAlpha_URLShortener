const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

/**
 * Build the Express app (runtime-agnostic: no filesystem, no process.env).
 * @param {(req) => { urlService, config }} resolveContext  supplies per-request dependencies
 *        (on Workers, built from the env bindings: D1 database + vars).
 */
function createApp(resolveContext) {
  const app = express();
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    try {
      req.ctx = resolveContext(req);
      next();
    } catch (err) {
      next(err);
    }
  });

  app.use((req, res, next) => {
    const { corsOrigins } = req.ctx.config;
    if (!corsOrigins.length) return next();
    return cors({ origin: corsOrigins.includes('*') ? true : corsOrigins, methods: ['GET', 'POST'] })(req, res, next);
  });

  app.use(express.json({ limit: '10kb' }));
  app.use(routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
