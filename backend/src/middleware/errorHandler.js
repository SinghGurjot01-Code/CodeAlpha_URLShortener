const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Link not found</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#222;text-align:center}
a{color:#2563eb}</style></head>
<body><div><h1>404 &mdash; Link not found</h1><p>This short link doesn&rsquo;t exist or may have been removed.</p><p><a href="/">Create a new short link</a></p></div></body></html>`;

function notFound(req, res) {
  if (req.path.startsWith('/api/') || !req.accepts(['html', 'json'])?.includes('html')) {
    return res.status(404).json({ error: 'Short link not found.' });
  }
  res.status(404).type('html').send(NOT_FOUND_HTML);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

module.exports = { notFound, errorHandler };
