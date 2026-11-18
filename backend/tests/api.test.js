// Integration tests: boot the real Worker (Express on workerd) with a throwaway LOCAL D1 database
// via Wrangler, then exercise the HTTP API. Nothing touches Cloudflare's network or your real data.
const test = require('node:test');
const assert = require('node:assert');
const { spawn, execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 8799;
const base = `http://127.0.0.1:${PORT}`;
const cwd = path.join(__dirname, '..');
const persist = fs.mkdtempSync(path.join(os.tmpdir(), 'urlshort-d1-'));
let proc;

function startWorker() {
  return new Promise((resolve, reject) => {
    proc = spawn('npx', ['wrangler', 'dev', '--local', '--port', String(PORT), '--persist-to', persist, '--var', 'BASE_URL:', '--var', 'SHORT_CODE_LENGTH:7'],
      { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => reject(new Error('wrangler dev did not become ready')), 90000);
    const onData = (d) => { if (/Ready on/.test(d.toString())) { clearTimeout(timer); resolve(); } };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('exit', (c) => { clearTimeout(timer); reject(new Error('wrangler exited early: ' + c)); });
  });
}
function stopWorker() {
  return new Promise((resolve) => {
    if (!proc) return resolve();
    proc.removeAllListeners('exit');
    proc.once('exit', resolve);
    if (process.platform === 'win32') {
      try { execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' }); } catch {}
    } else proc.kill('SIGTERM');
    setTimeout(resolve, 3000);
  });
}

test.before(async () => {
  execSync(`npx wrangler d1 migrations apply codealpha-urlshortener-db --local --persist-to "${persist}"`,
    { cwd, stdio: 'ignore' });
  await startWorker();
});
test.after(async () => {
  await stopWorker();
  fs.rmSync(persist, { recursive: true, force: true });
});

const post = (body, raw) => fetch(`${base}/api/shorten`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ?? JSON.stringify(body),
});

test('health check', async () => {
  const r = await fetch(`${base}/api/health`);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).status, 'ok');
});

test('serves the frontend', async () => {
  const r = await fetch(`${base}/`);
  assert.equal(r.status, 200);
  assert.match(await r.text(), /Shorten Your Long URLs/);
  assert.equal((await fetch(`${base}/config.js`)).status, 200);
});

let saved;
test('shortens a valid URL and redirects', async () => {
  const r = await post({ url: 'https://example.com/some/long/path?x=1' });
  assert.equal(r.status, 201);
  saved = await r.json();
  assert.match(saved.code, /^[A-Za-z0-9]{7}$/);
  assert.equal(saved.shortUrl, `${base}/${saved.code}`);
  assert.equal(saved.originalUrl, 'https://example.com/some/long/path?x=1');
  const red = await fetch(`${base}/${saved.code}`, { redirect: 'manual' });
  assert.equal(red.status, 302);
  assert.equal(red.headers.get('location'), saved.originalUrl);
});

test('adds https:// when the scheme is missing', async () => {
  assert.equal((await (await post({ url: 'example.org' })).json()).originalUrl, 'https://example.org/');
});

test('rejects invalid URLs, bad JSON and self-links', async () => {
  for (const url of ['', 'not a url', 'ftp://example.com', 'javascript:alert(1)', 'http://nodot', 42, null]) {
    const r = await post({ url });
    assert.equal(r.status, 400, `should reject ${url}`);
    assert.ok((await r.json()).error);
  }
  assert.equal((await post(null, '{bad')).status, 400);
  assert.equal((await post({ url: `${base}/abc1234` })).status, 400);
});

test('unknown short code returns 404 (json and html)', async () => {
  const j = await fetch(`${base}/doesNotExist`, { headers: { Accept: 'application/json' } });
  assert.equal(j.status, 404);
  assert.ok((await j.json()).error);
  const h = await fetch(`${base}/doesNotExist`, { headers: { Accept: 'text/html' } });
  assert.equal(h.status, 404);
  assert.match(await h.text(), /Link not found/);
});

test('generated codes are unique', async () => {
  const codes = new Set();
  for (let i = 0; i < 100; i++) codes.add((await (await post({ url: 'https://example.com/' + i })).json()).code);
  assert.equal(codes.size, 100);
});

test('data persists across a worker restart', async () => {
  await stopWorker();
  await startWorker();
  const red = await fetch(`${base}/${saved.code}`, { redirect: 'manual' });
  assert.equal(red.status, 302);
  assert.equal(red.headers.get('location'), saved.originalUrl);
});
