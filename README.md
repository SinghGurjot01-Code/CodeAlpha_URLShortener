# CodeAlpha URL Shortener

**Live Application (Vercel):** <https://ca-urls.vercel.app>  
**Backend API (Cloudflare Workers + D1):** <https://codealpha-urlshortener.singhgurjotpal84.workers.dev>  
**GitHub Repository:** <https://github.com/SinghGurjot01-Code/CodeAlpha_URLShortener>

A simple URL shortener built for the **CodeAlpha Backend Development Internship – Task 1**. Paste a long URL, get a short link, and anyone visiting the short link is redirected to the original address.

## Tech stack

| Layer      | Technology |
|------------|------------|
| Frontend   | HTML, CSS, vanilla JavaScript (hosted on **Vercel** at `ca-urls.vercel.app`) |
| Backend    | Node.js + **Express.js**, running on **Cloudflare Workers** (`nodejs_compat` + `httpServerHandler`) |
| Database   | **Cloudflare D1** (SQLite-compatible) |
| Tooling    | Cloudflare **Wrangler** & **Vercel CLI** |
| Testing    | Node's built-in test runner, curl / Postman |
| VCS        | Git & GitHub |

## Features

- `POST /api/shorten` – validates a URL and returns a unique short link
- `GET /:code` – redirects (HTTP 302) to the original URL
- `GET /api/health` – health check
- Server-side URL validation (http/https only, length limit, scheme auto-added when omitted)
- Collision-safe short codes: 7-character random base62 codes, guaranteed unique by a `UNIQUE` constraint on `short_code` with automatic retry
- Parameterised SQL only (D1 `bind()`)
- Clear errors for invalid URLs (400), malformed JSON (400) and unknown codes (404, JSON or HTML page)
- Local development with a local D1 database (no Cloudflare account or resources needed)

## Project workflow

1. **Shortening a URL**:
   - The user submits a long URL in the frontend form (`index.html`), which sends `POST /api/shorten` with `{"url": "..."}`.
   - In production on `https://ca-urls.vercel.app`, Vercel's edge proxy (`frontend/vercel.json`) forwards `/api/shorten` to the Express.js Worker on Cloudflare (`https://codealpha-urlshortener.singhgurjotpal84.workers.dev/api/shorten`). Locally (`wrangler dev`), the Worker handles both static assets and API routes directly on `http://localhost:8787`.
   - The Express controller normalizes and validates the URL, generates a 7-character random base62 code (`SHORT_CODE_LENGTH = 7`), inserts the mapping into the Cloudflare D1 `urls` table via a parameterized query (`?1, ?2`), and retries automatically if a `UNIQUE` constraint collision occurs.
   - The API returns `201 Created` with `{ code, originalUrl, shortUrl, createdAt }`, and the frontend displays the ready-to-share short link and saves it to browser history (`localStorage`).
2. **Visiting a short link**:
   - A visitor opens `https://ca-urls.vercel.app/<code>` (or `http://localhost:8787/<code>` locally).
   - Vercel's edge rewrite (`/:code([A-Za-z0-9]{4,32})`) transparently forwards the request to the Cloudflare Worker, which looks up `short_code` in D1 and responds with `302 Found` and `Location: <originalUrl>` (or `404 Not Found` if the code does not exist).

## Project structure

```
CodeAlpha_URLShortener/
├── frontend/
│   ├── index.html          # existing UI (only API-base wiring added)
│   ├── config.js           # runtime config: API_BASE_URL
│   └── vercel.json         # Vercel static hosting + edge rewrites to Cloudflare Worker
├── backend/
│   ├── src/
│   │   ├── worker.mjs      # Workers entry: Express via httpServerHandler + D1 binding
│   │   ├── app.js          # Express app factory (runtime-agnostic)
│   │   ├── routes/         # route table
│   │   ├── controllers/    # request handling
│   │   ├── services/       # short-code creation + collision retry
│   │   ├── repositories/   # D1 queries (parameterised)
│   │   ├── middleware/     # 404 + error handlers
│   │   └── utils/          # URL validation, code generation
│   ├── migrations/         # D1 SQL migrations (0001_create_urls.sql)
│   ├── tests/              # unit + integration tests
│   ├── wrangler.jsonc      # Worker, assets, D1 binding, vars
│   └── .dev.vars.example
├── .gitignore
└── README.md
```

## Installation

Requirements: **Node.js 20+** and npm. No Cloudflare account is needed for local development.

```bash
git clone https://github.com/SinghGurjot01-Code/CodeAlpha_URLShortener.git
cd CodeAlpha_URLShortener/backend
npm install
```

## Local development

Local development runs entirely offline using Wrangler's local workerd runtime and a local SQLite-backed D1 instance under `backend/.wrangler/` (completely separate from the remote production D1 database):

```bash
cd backend
npm run db:migrate:local   # applies migrations/0001_create_urls.sql to local D1
npm run dev                # runs `wrangler dev --local` at http://localhost:8787
```

Open <http://localhost:8787>. Because `backend/wrangler.jsonc` configures `BASE_URL` for production (`https://ca-urls.vercel.app`), if you want locally generated `shortUrl` values to use `http://localhost:8787` instead, copy `.dev.vars.example` to `.dev.vars` and set `BASE_URL=http://localhost:8787` (or `BASE_URL=`).

## Configuration

Non-secret settings live in `backend/wrangler.jsonc` under `vars` (this app uses no secrets):

| Variable | Configured Value | Description |
|----------|------------------|-------------|
| `BASE_URL` | `https://ca-urls.vercel.app` | Public origin used in generated `shortUrl` fields. Override locally in `backend/.dev.vars` (e.g. `BASE_URL=http://localhost:8787`) or pass `--var BASE_URL:` to derive from the request host. |
| `CORS_ORIGIN` | `https://ca-urls.vercel.app` | Comma-separated origins allowed to call the API cross-origin. Empty = same-origin only. |
| `SHORT_CODE_LENGTH` | `7` | Default length of generated base62 short codes (`7` characters). |

Bindings: `DB` → D1 database `codealpha-urlshortener-db`. For local overrides copy `backend/.dev.vars.example` to `backend/.dev.vars` (git-ignored).

**Frontend API URL & Vercel Proxy:**
- `frontend/config.js` defines `window.APP_CONFIG = { API_BASE_URL: '' }`.
- Leave `API_BASE_URL` empty (`''`) both in local development (`wrangler dev` serves the frontend and API on the same origin) and on Vercel (`frontend/vercel.json` proxies `/api/:path*` and `/:code([A-Za-z0-9]{4,32})` on `https://ca-urls.vercel.app` directly to `https://codealpha-urlshortener.singhgurjotpal84.workers.dev`).
- If you host the frontend on a static host without proxy rewrites, set `API_BASE_URL` in `frontend/config.js` to `"https://codealpha-urlshortener.singhgurjotpal84.workers.dev"` and add that frontend origin to `CORS_ORIGIN`.

## API

### `POST /api/shorten`

```bash
curl -X POST http://localhost:8787/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.wikipedia.org/"}'
```

`201 Created`
```json
{
  "code": "jt1Yfpw",
  "originalUrl": "https://www.wikipedia.org/",
  "shortUrl": "http://localhost:8787/jt1Yfpw",
  "createdAt": "2026-11-18T16:12:53.372Z"
}
```

`400 Bad Request`
```json
{ "error": "Please enter a valid URL (e.g., https://example.com)" }
```

### `GET /:code`

```bash
curl -i http://localhost:8787/jt1Yfpw
# HTTP/1.1 302 Found
# Location: https://www.wikipedia.org/
```

Unknown code → `404` (`{"error":"Short link not found."}` for API clients, a simple HTML page for browsers).

### `GET /api/health`

```json
{ "status": "ok" }
```

## Testing

```bash
cd backend
npm test            # runs all unit + integration tests (boots Worker + temporary local D1)
npm run test:unit   # runs unit tests only (URL validation, 7-char code generation, collision retry)
```

Integration tests (`backend/tests/api.test.js`) apply `migrations/0001_create_urls.sql` to an isolated temporary local D1 directory, boot the real Worker via `wrangler dev --local`, and verify:
- `GET /api/health` (`200 OK`)
- Static frontend serving (`GET /` and `GET /config.js`)
- `POST /api/shorten` (7-character base62 code generation) and `GET /:code` (`302` redirect)
- Automatic `https://` prefix when scheme is omitted
- Rejection of invalid URLs, malformed JSON and self-referencing links (`400 Bad Request`)
- `404 Not Found` for nonexistent codes (both JSON and HTML responses)
- Uniqueness across 100 generated codes
- Data persistence across a full Worker process restart

You can also inspect stored rows in local or remote D1 with:

```bash
# Local D1
npx wrangler d1 execute codealpha-urlshortener-db --local --command "SELECT * FROM urls"

# Remote production D1
npx wrangler d1 execute codealpha-urlshortener-db --remote --command "SELECT * FROM urls"
```

## Deployment (Vercel + Cloudflare)

### Architecture Overview: Local vs. Production

| Aspect | Local Development (`npm run dev`) | Production (`ca-urls.vercel.app`) |
|--------|-----------------------------------|-----------------------------------|
| **Frontend Hosting** | Served by Wrangler static assets (`../frontend`) at `http://localhost:8787` | Served by **Vercel** at `https://ca-urls.vercel.app` |
| **API & Redirect Routing** | Handled directly by local Express Worker on `http://localhost:8787` | `frontend/vercel.json` rewrites `/api/:path*` and `/:code([A-Za-z0-9]{4,32})` to `https://codealpha-urlshortener.singhgurjotpal84.workers.dev` |
| **Backend Runtime** | Local `workerd` via `wrangler dev --local` | **Cloudflare Workers** (`codealpha-urlshortener`) |
| **Database** | Local SQLite file inside `backend/.wrangler/state/v3/d1` (`--local`) | Managed **Cloudflare D1** (`codealpha-urlshortener-db`, ID `be32112a-ab78-4cdc-98fe-f5fcc85489aa`) |

### Deploying or Updating

```bash
# 1. Backend & D1 migrations (Cloudflare Workers + D1)
cd backend
npx wrangler login
npx wrangler d1 create codealpha-urlshortener-db   # first-time setup only
npm run db:migrate:remote                          # applies migrations/ to remote D1 (--remote)
npm run deploy                                     # runs `wrangler deploy`

# 2. Frontend & short-domain edge rewrites (Vercel)
cd ../frontend
vercel deploy --prod
```

D1 data lives in Cloudflare's managed storage, so records persist across deployments. Future schema changes are added as new numbered files in `backend/migrations/` and applied locally with `npm run db:migrate:local` and in production with `npm run db:migrate:remote`.

## License

MIT
