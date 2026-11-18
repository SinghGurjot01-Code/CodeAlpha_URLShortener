const express = require('express');
const cors = require('cors');
const { createUrlService } = require('./services/urlService');
const { createUrlController } = require('./controllers/urlController');
const { createRouter } = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

/** Build the Express app. `db` and `config` are injected so tests can use an in-memory DB. */
function createApp({ db, config }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  if (config.corsOrigins.length) {
    app.use(cors({ origin: config.corsOrigins.includes('*') ? true : config.corsOrigins, methods: ['GET', 'POST'] }));
  }
  app.use(express.json({ limit: '10kb' }));

  if (config.serveFrontend) app.use(express.static(config.frontendDir));

  const urlService = createUrlService(db, config);
  const urlController = createUrlController({ urlService, config });
  app.use(createRouter({ urlController }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
