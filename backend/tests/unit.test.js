const test = require('node:test');
const assert = require('node:assert');
const { normalizeUrl } = require('../src/utils/validateUrl');
const { generateCode, isValidCode } = require('../src/utils/shortCode');
const { createUrlService } = require('../src/services/urlService');

test('normalizeUrl accepts and normalises valid URLs', () => {
  assert.equal(normalizeUrl('https://example.com/a?b=1'), 'https://example.com/a?b=1');
  assert.equal(normalizeUrl('example.org'), 'https://example.org/');
  assert.equal(normalizeUrl('  http://localhost:3000/x '), 'http://localhost:3000/x');
});

test('normalizeUrl rejects invalid URLs', () => {
  for (const v of ['', '   ', 'not a url', 'ftp://example.com', 'javascript:alert(1)', 'http://nodot',
    'https://user:pw@example.com', 42, null, undefined, 'https://' + 'a'.repeat(3000) + '.com']) {
    assert.equal(normalizeUrl(v), null, String(v).slice(0, 30));
  }
});

test('generateCode produces valid base62 codes of the requested length', () => {
  const code = generateCode(7);
  assert.equal(code.length, 7);
  assert.ok(isValidCode(code));
  assert.ok(!isValidCode('api/x') && !isValidCode('ab'));
});

test('service retries on short-code collisions', async () => {
  const taken = new Set(Array.from({ length: 5 }, () => null)); // 5 forced collisions
  let inserts = 0;
  const stored = new Map();
  const repo = {
    async insert(code, url) {
      inserts++;
      if (inserts <= 5) return false; // simulate UNIQUE violation
      stored.set(code, url);
      return true;
    },
    async findByCode(code) { return { code, original_url: stored.get(code) }; },
  };
  const row = await createUrlService(repo, { codeLength: 7 }).create('https://example.com/');
  assert.equal(inserts, 6);
  assert.equal(row.original_url, 'https://example.com/');
  assert.ok(taken);
});

test('service gives up after repeated collisions', async () => {
  const repo = { async insert() { return false; }, async findByCode() { return null; } };
  await assert.rejects(createUrlService(repo, { codeLength: 7 }).create('https://example.com/'), /unique short code/);
});
