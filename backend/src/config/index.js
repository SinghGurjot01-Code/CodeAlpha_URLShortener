const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';
const port = Number(process.env.PORT) || 3000;

const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);

const config = {
  env,
  isProduction,
  port,
  // Public origin used to build short links, e.g. https://sho.rt (no trailing slash).
  baseUrl: (process.env.BASE_URL || `http://localhost:${port}`).replace(/\/+$/, ''),
  // Allowed browser origins when the frontend is hosted separately. Empty = same-origin only.
  corsOrigins: list(process.env.CORS_ORIGIN),
  // SQLite file. In production point this at a persistent disk / volume.
  databasePath: path.resolve(
    path.join(__dirname, '..', '..'),
    process.env.DATABASE_PATH || './data/urls.db'
  ),
  // Serve ../frontend from this server (convenient locally; optional in production).
  serveFrontend: (process.env.SERVE_FRONTEND || 'true').toLowerCase() !== 'false',
  frontendDir: path.resolve(__dirname, '..', '..', '..', 'frontend'),
  codeLength: Number(process.env.SHORT_CODE_LENGTH) || 7,
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY : false,
};

if (isProduction && !process.env.BASE_URL) {
  throw new Error('BASE_URL must be set in production (public URL used in short links).');
}
if (isProduction && !process.env.DATABASE_PATH) {
  throw new Error('DATABASE_PATH must be set in production (point it at persistent storage).');
}

module.exports = config;
