-- Migration: create the urls table.
-- Applied with: wrangler d1 migrations apply <DB> [--local | --remote]
CREATE TABLE IF NOT EXISTS urls (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  short_code   TEXT    NOT NULL UNIQUE,   -- UNIQUE also creates the lookup index used by redirects
  original_url TEXT    NOT NULL,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
