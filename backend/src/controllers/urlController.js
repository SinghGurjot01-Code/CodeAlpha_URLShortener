const { normalizeUrl } = require('../utils/validateUrl');
const { isValidCode } = require('../utils/shortCode');

function createUrlController({ urlService, config }) {
  const toResponse = (row) => ({
    code: row.code,
    originalUrl: row.original_url,
    shortUrl: `${config.baseUrl}/${row.code}`,
    createdAt: row.created_at,
  });

  const sameHostAsService = (url) => {
    try {
      return new URL(url).host === new URL(config.baseUrl).host;
    } catch {
      return false;
    }
  };

  return {
    // POST /api/shorten
    shorten(req, res) {
      const url = normalizeUrl(req.body && req.body.url);
      if (!url) {
        return res.status(400).json({ error: 'Please enter a valid URL (e.g., https://example.com)' });
      }
      if (sameHostAsService(url)) {
        return res.status(400).json({ error: 'You cannot shorten a link that points to this service.' });
      }
      const row = urlService.create(url);
      res.status(201).json(toResponse(row));
    },

    // GET /:code
    redirect(req, res, next) {
      const { code } = req.params;
      const row = isValidCode(code) ? urlService.findByCode(code) : null;
      if (!row) return next(); // falls through to the 404 handler
      res.redirect(302, row.original_url);
    },
  };
}

module.exports = { createUrlController };
