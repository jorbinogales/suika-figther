// Run: node desktop/test-updater.mjs  (needs `npm run build` for the last section). Updater only, no Electron.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createUpdater } from './updater.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'suika-upd-'));
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const put = (dir, rel, data) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), data); };
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel));
const walk = (d, rel = '') => fs.readdirSync(path.join(d, rel), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(d, rel ? rel + '/' + e.name : e.name) : [rel ? rel + '/' + e.name : e.name]));

// ---- fake game server over a mutable tree ----
const tree = path.join(tmp, 'tree');
let hits = [];   // downloaded file paths
let id = 'v1';
function manifest() { return { id, files: walk(tree).sort().map((p) => { const b = read(tree, p); return { path: p, size: b.length, sha256: sha(b) }; }) }; }
const srv = http.createServer((req, res) => {
  if (req.url === '/api/game/manifest') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(manifest())); }
  const rel = decodeURIComponent(req.url.slice(1));
  if (!fs.existsSync(path.join(tree, rel))) { res.statusCode = 404; return res.end(); }
  hits.push(rel); res.end(read(tree, rel));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const server = `http://127.0.0.1:${srv.address().port}`;

put(tree, 'index.html', '<html>v1</html>');
put(tree, 'version.json', '{"id":"v1"}');
put(tree, 'assets/a.js', 'console.log(1)');
put(tree, 'assets/snd/boom with space.wav', crypto.randomBytes(2_000_000));
put(tree, 'assets/img/x.png', crypto.randomBytes(5000));

const events = [];
const mk = (root, extra = {}) => createUpdater({ server, root, onProgress: (s) => events.push(s), backoffMs: 5, ...extra });
const root = path.join(tmp, 'ud');
fs.mkdirSync(root);
const gameDir = path.join(root, 'game');

// 1. first install
let r = await mk(root).update();
assert.deepEqual([r.updated, r.offline, r.id], [true, false, 'v1']);
assert.equal(hits.length, 5);
for (const f of manifest().files) assert.equal(sha(read(gameDir, f.path)), f.sha256);
assert.ok(events.some((e) => e.phase === 'downloading' && e.bytes.total > 0) && events.at(-1).bytes.done === events.at(-1).bytes.total, 'real progress');
assert.ok(!fs.existsSync(path.join(root, 'game.tmp')) && !fs.existsSync(path.join(root, 'game.old')));
console.log('ok 1 first install');

// 2. nothing changed: no downloads
hits = [];
r = await mk(root).update();
assert.deepEqual([r.updated, hits.length], [false, 0]);
console.log('ok 2 up to date');

// 3. corrupt one file (same size) and delete another: only those two are repaired
const wav = 'assets/snd/boom with space.wav', orig = read(tree, wav);
const bad = Buffer.from(read(gameDir, 'assets/a.js')); bad[0] ^= 0xff;
fs.writeFileSync(path.join(gameDir, 'assets/a.js'), bad);
fs.rmSync(path.join(gameDir, 'assets/img/x.png'));
put(gameDir, 'stale.txt', 'not in manifest');
hits = [];
r = await mk(root).update();
assert.equal(r.updated, true);
assert.deepEqual(hits.sort(), ['assets/a.js', 'assets/img/x.png']);
assert.ok(!fs.existsSync(path.join(gameDir, 'stale.txt')), 'stale file removed');
assert.deepEqual(read(gameDir, wav), orig);
console.log('ok 3 selective repair');

// 4. v2 on the server, download dies halfway: installed v1 stays intact
id = 'v2';
put(tree, 'index.html', '<html>v2</html>'); put(tree, 'version.json', '{"id":"v2"}');
fs.rmSync(path.join(tree, 'assets/a.js'));
put(tree, 'assets/b.js', 'console.log(2)');
const before = Object.fromEntries(walk(gameDir).map((p) => [p, sha(read(gameDir, p))]));
const flaky = async (url, o) => {   // b.js: body starts and then errors
  if (String(url).endsWith('/assets/b.js')) return new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array([99, 111])); c.error(new Error('conexion cortada')); } }));
  return fetch(url, o);
};
await assert.rejects(mk(root, { fetch: flaky }).update(), /conexion cortada/);
const after = Object.fromEntries(walk(gameDir).map((p) => [p, sha(read(gameDir, p))]));
assert.deepEqual(after, before, 'installed game untouched');
assert.ok(!fs.existsSync(path.join(root, 'game.old')));
assert.equal(mk(root).installedId(), 'v1');
console.log('ok 4 failed update leaves previous install intact');

// 5. retry works, resumes what was already staged, removes deleted files
hits = [];
r = await mk(root).update();
assert.deepEqual([r.updated, r.id], [true, 'v2']);
assert.ok(!fs.existsSync(path.join(gameDir, 'assets/a.js')) && read(gameDir, 'assets/b.js').toString() === 'console.log(2)');
assert.equal(mk(root).installedId(), 'v2');
assert.ok(!hits.includes(wav), 'unchanged big file not downloaded again');
console.log('ok 5 update applied, unchanged files reused');

// 6. a transient failure is retried
let n = 0;
put(tree, 'assets/c.js', 'console.log(3)'); id = 'v3'; put(tree, 'version.json', '{"id":"v3"}');
r = await mk(root, { fetch: async (u, o) => (String(u).endsWith('/assets/c.js') && n++ < 2 ? Promise.reject(new Error('reset')) : fetch(u, o)) }).update();
assert.deepEqual([r.updated, n], [true, 3]);
console.log('ok 6 retry with backoff');

// 7. offline: installed game still launches; with nothing installed it errors
await new Promise((res) => { srv.close(res); srv.closeAllConnections(); });
r = await mk(root).update();
assert.deepEqual([r.offline, r.id], [true, 'v3']);
await assert.rejects(mk(path.join(tmp, 'empty')).update(), /No se pudo conectar/);
console.log('ok 7 offline mode');

// 8. manifest with path traversal is rejected
const evil = http.createServer((q, s) => s.end(JSON.stringify({ id: 'x', files: [{ path: '../evil.txt', size: 1, sha256: 'a'.repeat(64) }, { path: 'index.html', size: 1, sha256: 'a'.repeat(64) }] })));
await new Promise((res) => evil.listen(0, '127.0.0.1', res));
await assert.rejects(createUpdater({ server: `http://127.0.0.1:${evil.address().port}`, root: path.join(tmp, 'evil'), backoffMs: 1, retries: 1 }).update(), /No se pudo conectar.*Manifest no válido/);
evil.close();
console.log('ok 8 unsafe manifest rejected');

// 9. real server + real dist/
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.log('skip 9 (run npm run build first)'); } else {
  Object.assign(process.env, { DB_PATH: path.join(tmp, 't.db'), JWT_SECRET: 'test' });
  const { start, stop } = await import('../server/index.js');
  const real = await start(0);
  const base = `http://127.0.0.1:${real.address().port}`;
  const m = await (await fetch(base + '/api/game/manifest')).json();
  assert.equal(m.id, JSON.parse(fs.readFileSync(path.join(DIST, 'version.json'), 'utf8')).id);
  const root2 = path.join(tmp, 'real');
  const t0 = Date.now(); let last;
  r = await createUpdater({ server: base, root: root2, onProgress: (s) => { last = s; } }).update();
  console.log(`   ${m.files.length} files, ${(last.bytes.total / 1048576).toFixed(1)} MB in ${Date.now() - t0} ms`);
  assert.equal(r.updated, true);
  for (const f of m.files) assert.equal(sha(read(path.join(root2, 'game'), f.path)), f.sha256, f.path);
  const t1 = Date.now();
  r = await createUpdater({ server: base, root: root2 }).update();
  assert.equal(r.updated, false);
  console.log(`   re-verify of ${m.files.length} files: ${Date.now() - t1} ms`);
  await stop();
  console.log('ok 9 real server + dist');
}
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* sqlite file may still be open on Windows */ }
console.log('ALL OK');
process.exit(0);
