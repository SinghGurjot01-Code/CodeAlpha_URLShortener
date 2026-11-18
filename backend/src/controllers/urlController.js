const { normalizeUrl } = require('../utils/validateUrl');
const { isValidCode } = require('../utils/shortCode');

// Request context (req.ctx = { urlService, config }) is attached per request by app.js,
// so the same controller works on Node and on Cloudflare Workers (bindings arrive per request).
const toResponse = (row, config) => ({
  code: row.code,
  originalUrl: row.original_url,
  shortUrl: `${config.baseUrl}/${row.code}`,
  createdAt: row.created_at,
});

const sameHost = (url, base) => {
  try {
    return new URL(url).host === new URL(base).host;
  } catch {
    return false;
  }
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const shorten = asyncHandler(async (req, res) => {
  const { urlService, config } = req.ctx;
  const url = normalizeUrl(req.body && req.body.url);
  if (!url) {
    return res.status(400).json({ error: 'Please enter a valid URL (e.g., https://example.com)' });
  }
  if (sameHost(url, config.baseUrl)) {
    return res.status(400).json({ error: 'You cannot shorten a link that points to this service.' });
  }
  const row = await urlService.create(url);
  res.status(201).json(toResponse(row, config));
});

const redirect = asyncHandler(async (req, res, next) => {
  const { code } = req.params;
  const row = isValidCode(code) ? await req.ctx.urlService.findByCode(code) : null;
  if (!row) return next(); // falls through to the 404 handler
  res.redirect(302, row.original_url);
});

module.exports = { shorten, redirect };
