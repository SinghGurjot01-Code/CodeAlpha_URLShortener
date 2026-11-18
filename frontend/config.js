// Runtime frontend configuration.
// Leave API_BASE_URL empty when served from the same origin (e.g. local `wrangler dev`, or Vercel proxy at ca-urls.vercel.app).
// When the frontend is hosted separately without a reverse-proxy rewrite, set it to the Cloudflare Workers backend URL,
// e.g. "https://codealpha-urlshortener.singhgurjotpal84.workers.dev" (no trailing slash).
window.APP_CONFIG = {
  API_BASE_URL: ''
};
