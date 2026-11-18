const test = require('node:test');
const assert = require('node:assert');
const { openDatabase } = require('../src/db/database');
const { createApp } = require('../src/app');

const config = {
  env: 'test', baseUrl: 'http://localhost:3999', corsOrigins: [], codeLength: 7,
  serveFrontend: false, frontendDir: '', trustProxy: false,
};

let server, base, db;
test.before(async () => {
  db = openDatabase(':memory:');
  server = createApp({ db, config }).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { server.close(); db.close(); });

const post = (body, raw) => fetch(`${base}/api/shorten`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ?? JSON.stringify(body),
});

test('health check', async () => {
  const r = await fetch(`${base}/api/health`);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).status, 'ok');
});

test('shortens a valid URL and redirects', async () => {
  const r = await post({ url: 'https://example.com/some/long/path?x=1' });
  assert.equal(r.status, 201);
  const d = await r.json();
  assert.match(d.code, /^[A-Za-z0-9]{7}$/);
  assert.equal(d.shortUrl, `http://localhost:3999/${d.code}`);
  assert.equal(d.originalUrl, 'https://example.com/some/long/path?x=1');
  const red = await fetch(`${base}/${d.code}`, { redirect: 'manual' });
  assert.equal(red.status, 302);
  assert.equal(red.headers.get('location'), d.originalUrl);
});

test('adds https:// when scheme is missing', async () => {
  const d = await (await post({ url: 'example.org' })).json();
  assert.equal(d.originalUrl, 'https://example.org/');
});

test('rejects invalid URLs', async () => {
  for (const url of ['', '   ', 'not a url', 'ftp://example.com', 'javascript:alert(1)', 'http://nodot', 42, null, undefined, 'https://' + 'a'.repeat(3000) + '.com']) {
    const r = await post({ url });
    assert.equal(r.status, 400, `should reject ${String(url).slice(0, 30)}`);
    assert.ok((await r.json()).error);
  }
});

test('rejects malformed JSON and self-referencing links', async () => {
  assert.equal((await post(null, '{bad')).status, 400);
  assert.equal((await post({ url: 'http://localhost:3999/abc1234' })).status, 400);
});

test('unknown short code returns 404 (json and html)', async () => {
  const j = await fetch(`${base}/doesNotExist`, { headers: { Accept: 'application/json' }, redirect: 'manual' });
  assert.equal(j.status, 404);
  assert.ok((await j.json()).error);
  const h = await fetch(`${base}/doesNotExist`, { headers: { Accept: 'text/html' } });
  assert.equal(h.status, 404);
  assert.match(await h.text(), /Link not found/);
});

test('generated codes are unique', async () => {
  const codes = new Set();
  for (let i = 0; i < 300; i++) codes.add((await (await post({ url: 'https://example.com/' + i })).json()).code);
  assert.equal(codes.size, 300);
});

test('collisions are retried', async () => {
  const { createUrlService } = require('../src/services/urlService');
  const mem = openDatabase(':memory:');
  // Length-1 alphabet space is impossible, so force collisions by pre-filling every 1-char... use length 4 + stub.
  const svc = createUrlService(mem, { codeLength: 4 });
  const shortCode = require('../src/utils/shortCode');
  const original = shortCode.generateCode;
  mem.prepare('INSERT INTO urls (code, original_url) VALUES (?, ?)').run('AAAA', 'https://taken.example.com');
  let calls = 0;
  require.cache[require.resolve('../src/utils/shortCode')].exports.generateCode = () => (++calls < 3 ? 'AAAA' : 'BBBB');
  delete require.cache[require.resolve('../src/services/urlService')];
  const svc2 = require('../src/services/urlService').createUrlService(mem, { codeLength: 4 });
  const row = svc2.create('https://new.example.com');
  require.cache[require.resolve('../src/utils/shortCode')].exports.generateCode = original;
  assert.equal(row.code, 'BBBB');
  assert.equal(calls, 3);
  assert.ok(svc);
  mem.close();
});
