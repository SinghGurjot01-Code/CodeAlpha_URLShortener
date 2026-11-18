/**
 * URL storage on Cloudflare D1. All SQL is parameterised (bind()), never string-built.
 * Table/column names match migrations/0001_create_urls.sql.
 */
function createD1Repository(db) {
  return {
    /** @returns {Promise<boolean>} true if inserted, false if the short_code already exists. */
    async insert(code, originalUrl) {
      try {
        await db
          .prepare('INSERT INTO urls (short_code, original_url) VALUES (?1, ?2)')
          .bind(code, originalUrl)
          .run();
        return true;
      } catch (err) {
        if (/UNIQUE constraint failed/i.test(String(err && (err.message || err.cause?.message)))) return false;
        throw err;
      }
    },

    async findByCode(code) {
      return (
        (await db
          .prepare('SELECT short_code AS code, original_url, created_at FROM urls WHERE short_code = ?1')
          .bind(code)
          .first()) || null
      );
    },
  };
}

module.exports = { createD1Repository };
