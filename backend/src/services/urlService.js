const { generateCode } = require('../utils/shortCode');

const MAX_ATTEMPTS = 10;

function createUrlService(db, { codeLength }) {
  const insert = db.prepare('INSERT INTO urls (code, original_url) VALUES (?, ?)');
  const byCode = db.prepare('SELECT code, original_url, created_at FROM urls WHERE code = ?');

  return {
    /**
     * Store a URL under a fresh unique code. Uniqueness is enforced by the DB's
     * UNIQUE constraint; on a collision we simply retry with a new code, and grow
     * the code length if we keep colliding.
     */
    create(originalUrl) {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const code = generateCode(codeLength + Math.floor(attempt / 3));
        try {
          insert.run(code, originalUrl);
          return this.findByCode(code);
        } catch (err) {
          if (err.code !== 'SQLITE_CONSTRAINT_UNIQUE') throw err;
        }
      }
      throw new Error('Could not generate a unique short code');
    },

    findByCode(code) {
      return byCode.get(code) || null;
    },
  };
}

module.exports = { createUrlService };
