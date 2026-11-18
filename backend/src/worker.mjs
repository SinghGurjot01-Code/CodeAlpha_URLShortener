// Cloudflare Workers entry point: runs the Express app via Workers' Node.js HTTP server compatibility.
import { httpServerHandler } from 'cloudflare:node';
import { env } from 'cloudflare:workers';
import http from 'node:http';
import { createApp } from './app.js';
import { createD1Repository } from './repositories/d1Repository.js';
import { createUrlService } from './services/urlService.js';

const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);

let cached;
function context(req) {
  // Bindings (env.DB, env.BASE_URL, ...) are supplied by the runtime; build once per isolate.
  if (!cached) {
    const codeLength = Number(env.SHORT_CODE_LENGTH) || 7;
    cached = {
      urlService: createUrlService(createD1Repository(env.DB), { codeLength }),
      corsOrigins: list(env.CORS_ORIGIN),
      configuredBase: (env.BASE_URL || '').replace(/\/+$/, ''),
    };
  }
  // Prefer the configured public URL; fall back to the request's own origin (handy for local dev).
  const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  const baseUrl = cached.configuredBase || `${proto}://${req.headers.host}`;
  return {
    urlService: cached.urlService,
    config: { baseUrl, corsOrigins: cached.corsOrigins },
  };
}

const app = createApp(context);
http.createServer(app).listen(8080);

export default httpServerHandler({ port: 8080 });
