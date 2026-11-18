# CodeAlpha URL Shortener

A simple URL shortener built for the **CodeAlpha Backend Development Internship – Task 1**. Paste a long URL, get a short link, and anyone visiting the short link is redirected to the original address.

## Tech stack

| Layer      | Technology |
|------------|------------|
| Frontend   | HTML, CSS, vanilla JavaScript (no framework) |
| Backend    | Node.js, Express.js |
| Database   | SQLite (via `better-sqlite3`) |
| Testing    | Node's built-in test runner (`node --test`), curl / Postman |
| VCS        | Git & GitHub |

## Features

- `POST /api/shorten` – validates a URL and returns a unique short link
- `GET /:code` – redirects (HTTP 302) to the original URL
- `GET /api/health` – health check
- Server-side URL validation (http/https only, length limit, scheme auto-added when omitted)
- Collision-safe short codes: 7-character random base62 codes, enforced by a `UNIQUE` DB constraint with automatic retry
- Clear errors for invalid URLs (400), malformed JSON (400) and unknown codes (404, JSON or HTML page)
- Data persists in a SQLite file across restarts
- Configurable via environment variables (CORS, base URL, DB path), with stricter production checks

## Project structure

```
CodeAlpha_URLShortener/
├── frontend/
│   ├── index.html        # existing UI (only API-base wiring added)
│   └── config.js         # runtime config: API_BASE_URL
├── backend/
│   ├── src/
│   │   ├── config/       # env handling
│   │   ├── controllers/  # request handling
│   │   ├── db/           # SQLite connection + schema
│   │   ├── middleware/   # 404 + error handlers
│   │   ├── routes/       # route table
│   │   ├── services/     # data access / short-code creation
│   │   ├── utils/        # URL validation, code generation
│   │   ├── app.js        # Express app factory
│   │   └── server.js     # entry point
│   ├── tests/            # automated API tests
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## Installation

Requirements: **Node.js 18+** and npm.

```bash
git clone https://github.com/<your-username>/CodeAlpha_URLShortener.git
cd CodeAlpha_URLShortener/backend
npm install
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
```

## Local development

```bash
cd backend
npm run dev     # auto-restarts on file changes
# or
npm start
```

Open <http://localhost:3000>. The backend serves the frontend from `../frontend`, so the UI and API share one origin and no extra setup is needed. The SQLite database is created automatically at `backend/data/urls.db`.

## Environment variables

Defined in `backend/.env` (see [`backend/.env.example`](backend/.env.example)).

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Set to `production` in deployment. Enables strict checks below. |
| `PORT` | `3000` | Port the server listens on. |
| `BASE_URL` | `http://localhost:<PORT>` | Public origin used to build short links. **Required in production.** |
| `DATABASE_PATH` | `./data/urls.db` | SQLite file location. **Required in production** – point it at persistent storage (e.g. a mounted volume at `/var/data/urls.db`). |
| `CORS_ORIGIN` | _(empty)_ | Comma-separated origins allowed to call the API when the frontend is hosted separately. Empty = same-origin only. |
| `SERVE_FRONTEND` | `true` | Serve `../frontend` from the backend. Set `false` if the frontend is hosted elsewhere. |
| `SHORT_CODE_LENGTH` | `7` | Length of generated codes. |
| `TRUST_PROXY` | _(empty)_ | Set to `1` behind a reverse proxy / PaaS. |

**Frontend config:** `frontend/config.js` sets `API_BASE_URL`. Leave it empty when the backend serves the frontend; set it to the backend's public URL (e.g. `https://my-api.example.com`) when the frontend is hosted separately, and add the frontend's origin to `CORS_ORIGIN`.

## API

### `POST /api/shorten`

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.wikipedia.org/"}'
```

`201 Created`
```json
{
  "code": "mrjrloW",
  "originalUrl": "https://www.wikipedia.org/",
  "shortUrl": "http://localhost:3000/mrjrloW",
  "createdAt": "2026-11-18T16:08:15.257Z"
}
```

`400 Bad Request` (invalid URL / body)
```json
{ "error": "Please enter a valid URL (e.g., https://example.com)" }
```

### `GET /:code`

```bash
curl -i http://localhost:3000/mrjrloW
# HTTP/1.1 302 Found
# Location: https://www.wikipedia.org/
```

Unknown code → `404` (`{"error":"Short link not found."}` for API clients, a simple HTML page for browsers).

### `GET /api/health`

```json
{ "status": "ok", "uptime": 12.34 }
```

## Testing

Automated tests (in-memory SQLite, no server needed):

```bash
cd backend
npm test
```

They cover health, shortening, redirects, invalid input, unknown codes, code uniqueness and collision retry.

Manual / Postman: start the server and import the requests from the [API](#api) section (`POST /api/shorten`, `GET /:code`, `GET /api/health`). To check persistence, create a link, stop and restart the server, and visit the same short URL again.

## Production notes

- Set `NODE_ENV=production`, `BASE_URL` and `DATABASE_PATH` (the app refuses to start without them).
- Mount a persistent disk/volume and point `DATABASE_PATH` at it – SQLite files on ephemeral filesystems are lost on redeploy.
- Run a single instance (SQLite is a single-writer, file-based database).
- No secrets are required or hardcoded; `.env` is git-ignored.

## License

MIT
