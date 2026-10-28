// Run: node desktop/test-gameserver.mjs  (starts server/index.js on a random port with a temp DB, no Electron).
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import { createGameServer } from './gameserver.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'suika-gs-'));
Object.assign(process.env, { DB_PATH: path.join(tmp, 't.db'), JWT_SECRET: 'test', RATE_MAX: '1000' });
const { start, stop } = await import('../server/index.js');
const real = await start(0);
const remote = `http://localhost:${real.address().port}`;

const game = path.join(tmp, 'game');
fs.mkdirSync(path.join(game, 'assets'), { recursive: true });
fs.writeFileSync(path.join(game, 'index.html'), '<html>local game</html>');
fs.writeFileSync(path.join(game, 'assets/app.js'), 'console.log(1)');
fs.writeFileSync(path.join(game, 'assets/s o.wav'), 'RIFF');
fs.writeFileSync(path.join(game, 'manifest.json'), JSON.stringify({ id: 'installed-42', files: [] }));
fs.writeFileSync(path.join(tmp, 'secret.txt'), 'top secret');

const gs = createGameServer({ gameDir: game, remote });
const origin = await gs.listen();
const port = new URL(origin).port;
const get = async (p, o) => { const r = await fetch(origin + p, o); return { r, text: await r.text() }; };

// static
let x = await get('/');
assert.equal(x.text, '<html>local game</html>'); assert.equal(x.r.headers.get('cache-control'), 'no-cache');
x = await get('/assets/app.js'); assert.match(x.r.headers.get('content-type'), /javascript/);
x = await get('/assets/s%20o.wav'); assert.equal(x.r.headers.get('content-type'), 'audio/wav');
x = await get('/lobby/algo'); assert.equal(x.text, '<html>local game</html>', 'SPA fallback');
x = await get('/assets/missing.png'); assert.equal(x.r.status, 404);
x = await get('/..%2fsecret.txt'); assert.ok(x.r.status >= 400 && !x.text.includes('top secret'), 'no traversal');
x = await get('/%2e%2e/secret.txt'); assert.ok(!x.text.includes('top secret'));
console.log('ok static');

// Host check (DNS rebinding)
const bad = await new Promise((res) => http.get({ host: '127.0.0.1', port, path: '/', headers: { host: 'evil.example' } }, (r) => { r.resume(); res(r.statusCode); }));
assert.equal(bad, 421);
console.log('ok host check');

// /api/version answers with the INSTALLED id, everything else is proxied
x = await get('/api/version'); assert.deepEqual(JSON.parse(x.text), { id: 'installed-42' });
assert.notEqual(JSON.parse((await (await fetch(remote + '/api/version')).text())).id, 'installed-42');
const news = await (await fetch(remote + '/api/news')).text();
x = await get('/api/news'); assert.equal(x.text, news); assert.equal(x.r.status, 200);
x = await get('/api/nope'); assert.equal(x.r.status, 404);
const reg = await get('/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'a@b.co', password: 'secret1', name: 'Tester' }) });
assert.equal(reg.r.status, 200);
const { token } = JSON.parse(reg.text);
x = await get('/api/me', { headers: { authorization: 'Bearer ' + token } }); assert.equal(JSON.parse(x.text).user.name, 'Tester');
x = await get('/api/me'); assert.equal(x.r.status, 401);
console.log('ok http proxy (GET/POST/auth header/status codes)');

// WebSocket
const wsOpen = (query, headers = { origin }) => new Promise((resolve, reject) => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws${query}`, { headers });
  ws.msgs = []; ws.on('message', (d) => ws.msgs.push(JSON.parse(d.toString())));
  ws.once('open', () => resolve(ws)); ws.once('error', reject);
});
const until = async (f) => { for (let i = 0; i < 100; i++) { if (f()) return; await new Promise((r) => setTimeout(r, 20)); } throw new Error('timeout'); };

const a = await wsOpen('?token=' + encodeURIComponent(token));
await until(() => a.msgs.some((m) => m.t === 'hello'));
assert.equal(a.msgs.find((m) => m.t === 'hello').user.name, 'Tester');
a.send(JSON.stringify({ t: 'nonsense' }));   // client -> server -> client
await until(() => a.msgs.some((m) => m.t === 'error' && /desconocido/.test(m.msg || '')));
console.log('ok ws both directions');

// second connection with the same token: the server closes the first one with 4000 and the code must reach the browser
const closed = new Promise((res) => a.once('close', (code) => res(code)));
const b = await wsOpen('?token=' + encodeURIComponent(token));
assert.equal(await closed, 4000);
await until(() => b.msgs.some((m) => m.t === 'hello'));
// client closes -> upstream socket released (a new connection is not "replaced" afterwards)
b.close(1000);
await new Promise((r) => b.once('close', r));
console.log('ok ws close codes propagate');

await assert.rejects(wsOpen('?token=garbage'), /401/);
await assert.rejects(wsOpen('?token=' + token, { origin: 'http://evil.example' }), /403/);
console.log('ok ws bad token -> 401, foreign origin -> 403');

// remote down -> 502, not a crash
await gs.close(); await stop();
const dead = createGameServer({ gameDir: game, remote });
const o2 = await dead.listen();
const r502 = await fetch(o2 + '/api/news'); assert.equal(r502.status, 502);
await dead.close();
console.log('ok remote down -> 502');

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* sqlite may still hold the file on Windows */ }
console.log('ALL OK');
process.exit(0);
