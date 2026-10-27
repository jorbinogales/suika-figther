// Run: node server/test.mjs  (starts its own server on a random port with a temp DB)
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import WebSocket from 'ws';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'devbrawl-'));
Object.assign(process.env, { DB_PATH: path.join(tmp, 't.db'), RATE_MAX: '1000', GRACE_MS: '300', LOAD_MS: '600', JWT_SECRET: 'test-secret' });
const { start, stop } = await import('./index.js');
const srv = await start(0);
const base = `http://localhost:${srv.address().port}`;
const wsBase = `ws://localhost:${srv.address().port}`;

const post = async (url, body, token) => {
  const r = await fetch(base + url, { method: 'POST', headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// WS client that records every message; wait(pred) resolves on first (past or future) match after mark().
function client(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsBase}/ws?token=${token}`);
    const c = { ws, msgs: [], cursor: 0 };
    ws.on('message', (d) => c.msgs.push(JSON.parse(d)));
    c.send = (m) => ws.send(JSON.stringify(m));
    c.mark = () => { c.cursor = c.msgs.length; };
    c.wait = async (pred, ms = 2000) => {
      const end = Date.now() + ms;
      for (;;) {
        const i = c.msgs.findIndex((m, k) => k >= c.cursor && pred(m));
        if (i >= 0) { c.cursor = i + 1; return c.msgs[i]; }
        if (Date.now() > end) throw new Error('timeout waiting for message; got ' + JSON.stringify(c.msgs.slice(c.cursor)));
        await sleep(10);
      }
    };
    c.t = (t, ms) => c.wait((m) => m.t === t, ms);
    c.room = (pred = () => true) => c.wait((m) => m.t === 'room' && pred(m));
    ws.on('open', () => resolve(c));
    ws.on('error', reject);
  });
}

let passed = 0;
const ok = (name) => { passed++; console.log('ok -', name); };

try {
  // ---- REST ----
  const users = [];
  for (let i = 0; i < 11; i++) {
    const r = await post('/api/register', { email: `u${i}@test.com`, password: 'secret1', name: `Player${i}` });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(r.body.token && r.body.user.id && r.body.user.email === `u${i}@test.com` && r.body.user.name === `Player${i}`);
    users.push({ ...r.body.user, token: r.body.token });
  }
  ok('register 11 users');

  assert.equal((await post('/api/register', { email: 'u0@test.com', password: 'secret1', name: 'Dupe' })).status, 409);
  assert.equal((await post('/api/register', { email: 'bad', password: 'secret1', name: 'Nombre' })).status, 400);
  assert.equal((await post('/api/register', { email: 'a@b.com', password: '123', name: 'Nombre' })).status, 400);
  assert.equal((await post('/api/register', { email: 'a@b.com', password: 'secret1', name: 'ab' })).status, 400);
  const bad = await post('/api/register', { email: 'a@b.com', password: 'secret1', name: 'x'.repeat(17) });
  assert.equal(bad.status, 400); assert.ok(bad.body.error);
  ok('register validation');

  const l = await post('/api/login', { email: 'u1@test.com', password: 'secret1' });
  assert.equal(l.status, 200); assert.equal(l.body.user.id, users[1].id);
  assert.equal((await post('/api/login', { email: 'u1@test.com', password: 'nope123' })).status, 401);
  ok('login');

  const me = await (await fetch(base + '/api/me', { headers: { authorization: `Bearer ${l.body.token}` } })).json();
  assert.equal(me.user.email, 'u1@test.com');
  assert.equal((await fetch(base + '/api/me')).status, 401);
  ok('me');

  const news = await (await fetch(base + '/api/news')).json();
  assert.ok(Array.isArray(news));
  ok('news');

  // ---- WS auth ----
  await assert.rejects(client('garbage'));
  ok('ws rejects invalid token');

  // ---- Room flow ----
  const c = await Promise.all(users.map((u) => client(u.token)));
  assert.equal((await c[0].t('hello')).user.id, users[0].id);

  c[0].send({ t: 'create_room', public: false });
  const r1 = await c[0].room();
  assert.match(r1.code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(r1.host, users[0].id); assert.equal(r1.state, 'lobby'); assert.equal(r1.public, false);
  ok('create_room');

  c[0].mark(); c[0].send({ t: 'create_room' });
  assert.match((await c[0].t('error')).msg, /sala/);
  c[1].send({ t: 'join_room', code: 'ZZZZZZ' });
  assert.match((await c[1].t('error')).msg, /código/);
  c[1].send({ t: 'join_room', code: r1.code.toLowerCase() });
  c[2].send({ t: 'join_room', code: r1.code });
  const r2 = await c[2].room((m) => m.players.length === 3);
  assert.deepEqual(r2.players.map((p) => p.team), [0, 1, 0]);
  assert.equal(r2.players.filter((p) => p.host).length, 1);
  ok('join_room + balanced teams + errors');

  c[1].send({ t: 'pick_champ', key: 'mage' });
  c[2].send({ t: 'pick_champ', key: 'mage' }); // repeats allowed
  c[1].send({ t: 'set_ready', ready: true });
  const r3 = await c[0].room((m) => m.players.find((p) => p.id === users[1].id)?.ready && m.players.every((p) => p.id === users[0].id || p.champ === 'mage'));
  assert.equal(r3.players.find((p) => p.id === users[1].id).champ, 'mage');
  ok('pick_champ + set_ready');

  c[1].send({ t: 'set_team', team: 0 });
  await c[0].room((m) => m.players.find((p) => p.id === users[1].id).team === 0);
  ok('set_team');

  // start / loaded / go
  c[1].mark(); c[1].send({ t: 'start_game' });
  assert.match((await c[1].t('error')).msg, /anfitri/);
  for (const k of [0, 1, 2]) c[k].mark();
  c[0].send({ t: 'start_game' });
  const st = await c[2].t('start');
  assert.ok(Number.isInteger(st.seed)); assert.equal(st.players.length, 3);
  await c[1].t('start');
  assert.equal((await c[0].room((m) => m.state === 'loading')).state, 'loading');
  for (const k of [0, 1]) c[k].send({ t: 'loaded' });
  await sleep(100);
  assert.ok(!c[2].msgs.some((m, i) => i >= c[2].cursor && m.t === 'go'), 'go must wait for everyone');
  c[2].send({ t: 'loaded' });
  for (const k of [0, 1, 2]) await c[k].t('go');
  await c[0].room((m) => m.state === 'playing');
  ok('start_game / loaded / go');

  // relay
  for (const k of [0, 1, 2]) c[k].mark();
  c[0].send({ t: 'relay', data: { hello: 1 } });
  const rl = await c[1].t('relay');
  assert.deepEqual(rl.data, { hello: 1 }); assert.equal(rl.from, users[0].id);
  await c[2].t('relay');
  c[1].send({ t: 'relay', to: users[0].id, data: 'direct' });
  assert.equal((await c[0].t('relay')).data, 'direct');
  await sleep(100);
  assert.ok(!c[2].msgs.slice(c[2].cursor).some((m) => m.t === 'relay'), 'targeted relay must not reach others');
  assert.ok(!c[0].msgs.slice(0).some((m) => m.t === 'relay' && m.data && m.data.hello), 'sender must not get own relay');
  c[0].mark(); c[1].mark();
  c[0].send({ t: 'relay', data: 'x'.repeat(70000) });
  assert.match((await c[0].t('error')).msg, /grande/);
  ok('relay (broadcast, targeted, size limit)');

  c[1].mark(); c[0].send({ t: 'chat', text: 'hola' });
  const ch = await c[1].t('chat');
  assert.equal(ch.text, 'hola'); assert.equal(ch.name, 'Player0');
  c[0].mark(); c[0].send({ t: 'chat', text: 'x'.repeat(201) });
  await c[0].t('error');
  ok('chat');

  // loading timeout: new room, one player never reports loaded
  for (const k of [0, 1, 2]) { c[k].send({ t: 'leave_room' }); }
  await sleep(100);
  c[0].mark(); c[1].mark();
  c[0].send({ t: 'create_room', public: false });
  const rt = await c[0].room();
  c[1].send({ t: 'join_room', code: rt.code });
  await c[1].room();
  c[0].send({ t: 'start_game' });
  c[0].send({ t: 'loaded' });
  await c[1].t('start');
  await c[1].t('go'); // arrives via LOAD_MS (600ms) timeout
  ok('go after load timeout');
  c[0].send({ t: 'leave_room' }); c[1].send({ t: 'leave_room' });
  await sleep(100);

  // ---- Full room (10 max) ----
  c[0].mark(); c[0].send({ t: 'create_room', public: false });
  const rf = await c[0].room();
  for (let k = 1; k < 10; k++) { c[k].mark(); c[k].send({ t: 'join_room', code: rf.code }); await c[k].room(); }
  c[10].mark(); c[10].send({ t: 'join_room', code: rf.code });
  assert.match((await c[10].t('error')).msg, /llena/);
  const full = await c[0].room((m) => m.players.length === 10);
  assert.equal(full.players.filter((p) => p.team === 0).length, 5);
  assert.equal(full.players.filter((p) => p.team === 1).length, 5);
  c[1].mark(); c[1].send({ t: 'set_team', team: full.players.find((p) => p.id === users[1].id).team ^ 1 });
  assert.match((await c[1].t('error')).msg, /lleno/);
  ok('room full: 11th rejected, 5v5, team full');

  // ---- Reconnect within grace ----
  c[5].ws.close();
  await c[0].room((m) => m.players.find((p) => p.id === users[5].id).connected === false);
  const re = await client(users[5].token);
  const rr = await re.room();
  assert.equal(rr.code, rf.code); assert.equal(rr.players.length, 10);
  assert.ok(rr.players.find((p) => p.id === users[5].id).connected);
  c[5] = re;
  await sleep(500);
  assert.equal(rooms_count(c[0]), 10, 'reconnected player must survive grace period');
  ok('reconnect within grace');

  // ---- Disconnect past grace + host handover ----
  c[9].ws.close();
  const gone = await c[0].room((m) => m.players.length === 9);
  assert.ok(!gone.players.some((p) => p.id === users[9].id));
  c[0].ws.close();
  const ho = await c[1].room((m) => m.host !== users[0].id && m.players.length === 8 && m.players.every((p) => p.id !== users[0].id));
  assert.equal(ho.players.filter((p) => p.host).length, 1);
  assert.ok(ho.players.find((p) => p.host).connected);
  ok('removal after grace + host handover');

  // ---- Socket replacement ----
  const dup = await client(users[1].token);
  const dr = await dup.room();
  assert.equal(dr.code, rf.code);
  await c[1].wait((m) => m.t === 'error');
  await sleep(100);
  assert.ok(dup.ws.readyState === WebSocket.OPEN);
  assert.ok(dr.players.find((p) => p.id === users[1].id).connected);
  c[1] = dup;
  ok('second socket replaces first');

  // ---- Empty room deleted + quick_join ----
  for (const k of [1, 2, 3, 4, 5, 6, 7, 8]) c[k].send({ t: 'leave_room' });
  await sleep(150);
  c[2].mark(); c[2].send({ t: 'join_room', code: rf.code });
  assert.match((await c[2].t('error')).msg, /código/);
  c[2].mark(); c[3].mark();
  c[2].send({ t: 'quick_join' });
  const q1 = await c[2].room(); assert.equal(q1.public, true);
  c[3].send({ t: 'quick_join' });
  const q2 = await c[3].room();
  assert.equal(q2.code, q1.code); assert.equal(q2.players.length, 2);
  ok('empty room deleted + quick_join');

  console.log(`\nAll ${passed} checks passed`);
  await stop();
  process.exit(0);
} catch (e) {
  console.error('\nFAILED:', e);
  process.exit(1);
}

function rooms_count(client) {
  const last = [...client.msgs].reverse().find((m) => m.t === 'room');
  return last.players.length;
}
