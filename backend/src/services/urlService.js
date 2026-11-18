const { generateCode } = require('../utils/shortCode');

const MAX_ATTEMPTS = 10;

/**
 * @param repo   storage with async insert(code, url) -> boolean and findByCode(code)
 * @param opts   { codeLength }
 */
function createUrlService(repo, { codeLength }) {
  return {
    /**
     * Store a URL under a fresh unique code. Uniqueness is enforced by the database's
     * UNIQUE constraint; on a collision we retry with a new code (growing the length
     * if collisions keep happening).
     */
    async create(originalUrl) {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const code = generateCode(codeLength + Math.floor(attempt / 3));
        if (await repo.insert(code, originalUrl)) return repo.findByCode(code);
      }
      throw new Error('Could not generate a unique short code');
    },

    findByCode(code) {
      return repo.findByCode(code);
    },
  };
}

module.exports = { createUrlService };
