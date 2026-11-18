const express = require('express');

function createRouter({ urlController }) {
  const router = express.Router();

  router.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
  router.post('/api/shorten', urlController.shorten);
  router.get('/:code', urlController.redirect);

  return router;
}

module.exports = { createRouter };
