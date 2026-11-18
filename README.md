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

## Project structure

```
CodeAlpha_URLShortener/
├── frontend/
│   ├── index.html          # existing UI (only API-base wiring added)
│   └── config.js           # runtime config: API_BASE_URL
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
│   ├── migrations/         # D1 SQL migrations
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

```bash
cd backend
npm run db:migrate:local   # creates the local D1 database (stored in backend/.wrangler/, git-ignored)
npm run dev                # wrangler dev --local -> http://localhost:8787
```

Open <http://localhost:8787>. The Worker serves the frontend (`../frontend`) as static assets and handles `/api/*` and `/:code`, so UI and API share one origin and the frontend needs no extra configuration.

## Configuration

Non-secret settings live in `backend/wrangler.jsonc` under `vars` (this app uses no secrets):

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | _(empty)_ | Public origin used in short links, e.g. `https://codealpha-urlshortener.<you>.workers.dev`. Empty = derive from the request (OK locally). **Set it in production.** |
| `CORS_ORIGIN` | _(empty)_ | Comma-separated origins allowed to call the API from a separately hosted frontend. Empty = same-origin only. |
| `SHORT_CODE_LENGTH` | `7` | Length of generated codes. |

Bindings: `DB` → D1 database `codealpha-urlshortener-db`. For local overrides copy `backend/.dev.vars.example` to `backend/.dev.vars` (git-ignored).

**Frontend API URL:** `frontend/config.js` sets `API_BASE_URL`. Leave it empty when the Worker serves the frontend (default). If you host the frontend elsewhere, set it to the Worker's URL and add the frontend's origin to `CORS_ORIGIN`.

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
npm test            # unit + integration (boots the Worker with a throwaway local D1)
npm run test:unit   # unit tests only (fast)
```

Integration tests cover health, frontend serving, shortening, redirects, invalid input, unknown codes, uniqueness and persistence across a Worker restart. You can also exercise the API manually with curl or Postman against `http://localhost:8787`, and inspect stored rows with:

```bash
npx wrangler d1 execute codealpha-urlshortener-db --local --command "SELECT * FROM urls"
```

## Deployment (Vercel + Cloudflare)

- **Vercel (`https://ca-urls.vercel.app`)** hosts the frontend and proxies `/api/*` and `/:code` rewrites via [`frontend/vercel.json`](frontend/vercel.json) directly to the Cloudflare Worker so short links use the short `https://ca-urls.vercel.app/<code>` domain.
- **Cloudflare Workers + D1 (`https://codealpha-urlshortener.singhgurjotpal84.workers.dev`)** runs the Express.js API and stores links in D1 database `codealpha-urlshortener-db` (`be32112a-ab78-4cdc-98fe-f5fcc85489aa`).

To deploy your own instance or push updates:

```bash
# 1. Backend (Cloudflare Workers + D1)
cd backend
npx wrangler login
npx wrangler d1 create codealpha-urlshortener-db   # first-time only
npm run db:migrate:remote
npm run deploy

# 2. Frontend & short-domain proxy (Vercel)
cd ../frontend
vercel deploy --prod
```

D1 data lives in Cloudflare's managed storage, so records persist across deployments. Future schema changes are added as new numbered files in `backend/migrations/` and applied with `npm run db:migrate:remote`.

## License

MIT
