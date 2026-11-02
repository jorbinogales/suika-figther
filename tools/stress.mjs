// Stress test for online matches: N rooms x P simulated players (light WebSocket clients that send synthetic inputs / casts / shop ops).
//   node tools/stress.mjs --rooms 3 --players 10 --secs 60                       server-hosted matches (headless host, the default now)
//   node tools/stress.mjs --mode browser --rooms 1 --secs 60                      old architecture: a real browser (puppeteer) is the room host
//   node tools/stress.mjs --base https://suika-production-4e78.up.railway.app --rooms 1 --secs 60 --key <HOST_STATS_KEY>
// Measures per room: host tick rate (fps, sim speed), input->snapshot latency, snapshots/s, wire bytes per client;
// and the CPU / RAM of the server process tree (local Windows: process tree of the node listening on --port; remote: /api/host/stats).
// Users are registered once per base url and cached in tools/.stress-users.json (the register endpoint is rate limited).
import WebSocket from 'ws';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const A = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(s => { const [k, ...v] = s.trim().split(/\s+/); return [k, v.join(' ') || '1']; }));
const BASE = (A.base || 'http://localhost:3001').replace(/\/$/, ''), WS = BASE.replace(/^http/, 'ws') + '/ws';
const ROOMS = +(A.rooms || 1), PLAYERS = +(A.players || 10), SECS = +(A.secs || 60), MODE = A.mode || 'bot', KEY = A.key || process.env.HOST_STATS_KEY || '';
const PAGE = A.page || 'http://localhost:5173/';   // browser mode: where the host browser loads the game
const CHAMPS = ['leandro', 'xeviche', 'jorbi', 'axel', 'julio', 'luis', 'eliud', 'hector', 'yonaiker', 'junior'];
const ABIL = ['p1', 'p2', 'p3', 'ult'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIR = path.dirname(fileURLToPath(import.meta.url)), CACHE = path.join(DIR, '.stress-users.json');
const local = /localhost|127\.0\.0\.1/.test(BASE);

/* ---------- users (cached tokens) ---------- */
async function users(n) {
  const all = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {}, list = (all[BASE] ||= []);
  const tag = Date.now().toString(36).slice(-5);
  while (list.length < n) {
    const i = list.length, name = `st${tag}${i}`.slice(0, 16);
    const r = await fetch(BASE + '/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `${name}@stress.test`, password: 'stress123', name }) });
    if (r.status === 429) { console.log('  register rate limited, waiting 61 s...'); await sleep(61000); continue; }
    const j = await r.json(); if (!r.ok) throw new Error('register: ' + JSON.stringify(j));
    list.push({ id: j.user.id, token: j.token }); fs.writeFileSync(CACHE, JSON.stringify(all));
  }
  return list.slice(0, n);
}

/* ---------- process metrics ---------- */
const cores = os.cpus().length;
function winProcs() {   // { pid: { ppid, cpu (s), mem (MB), name } }
  const out = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,KernelModeTime,UserModeTime,WorkingSetSize | ConvertTo-Json -Compress"', { maxBuffer: 64 << 20 }).toString();
  const m = {}; for (const p of JSON.parse(out)) m[p.ProcessId] = { ppid: p.ParentProcessId, name: p.Name, cpu: (Number(p.KernelModeTime) + Number(p.UserModeTime)) / 1e7, mem: Number(p.WorkingSetSize) / 1048576 };
  return m;
}
function tree(m, root) { const ids = [root]; for (let i = 0; i < ids.length; i++) for (const k in m) if (m[k].ppid === ids[i] && !ids.includes(+k)) ids.push(+k); return ids.filter(i => m[i]); }
function serverPid() { const port = new URL(BASE).port || 80; const l = execSync('netstat -ano').toString().split('\n').find(s => new RegExp(`[:.]${port}\\s.*LISTENING`).test(s)); return l ? +l.trim().split(/\s+/).pop() : null; }
async function sample(extraRoots = []) {   // { t, srvCpu, srvMem, hostCpu, hostMem } (cpu in core-seconds, mem in MB)
  if (local && process.platform === 'win32') {
    const m = winProcs(), sp = serverPid(), node = m[sp], kids = tree(m, sp).filter(i => i !== sp);
    const ext = extraRoots.flatMap(r => tree(m, r));
    const sum = (ids, k) => ids.reduce((s, i) => s + m[i][k], 0);
    return { t: performance.now() / 1000, srvCpu: node?.cpu || 0, srvMem: node?.mem || 0, hostCpu: sum(kids, 'cpu') + sum(ext, 'cpu'), hostMem: sum(kids, 'mem') + sum(ext, 'mem'), hostProcs: kids.length + ext.length };
  }
  const r = await fetch(`${BASE}/api/host/stats?key=${encodeURIComponent(KEY)}`).then(r => r.json()).catch(() => null);
  if (!r?.proc) return null;
  return { t: performance.now() / 1000, srvCpu: r.proc.node.cpu, srvMem: r.proc.node.mem, hostCpu: r.proc.host.cpu, hostMem: r.proc.host.mem, hostProcs: r.proc.host.n, cores: r.proc.cores };
}
async function hostStats() { return fetch(`${BASE}/api/host/stats?key=${encodeURIComponent(KEY)}`).then(r => r.json()).catch(() => null); }

/* ---------- simulated player ---------- */
function player(u) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS}?token=${encodeURIComponent(u.token)}`, { perMessageDeflate: true });
    const c = { u, ws, msgs: 0, snaps: 0, evs: 0, lat: [], probe: null, nid: null, host: null, live: false, gs: [], room: null, bytes0: 0 };
    c.send = m => ws.readyState === 1 && ws.send(JSON.stringify(m));
    c.wait = (pred, ms = 15000) => new Promise((res, rej) => { const t = setTimeout(() => { c.waiters.delete(w); rej(new Error('timeout ' + u.id)); }, ms); const w = m => { if (pred(m)) { clearTimeout(t); c.waiters.delete(w); res(m); } }; c.waiters.add(w); });
    c.waiters = new Set();
    ws.on('message', d => {
      c.msgs++; const m = JSON.parse(d);
      if (m.t === 'room') c.room = m;
      if (m.t === 'start') { c.start = m; c.nid = nidOf(m.players, u.id); c.host = m.host ?? c.room?.host; }
      if (m.t === 'go') c.live = true;
      if (m.t === 'relay' && m.data) {
        if (m.data.k === 'snap') {
          c.snaps++; c.gs.push([performance.now(), m.data.g]);
          if (c.probe && c.nid != null) { const o = m.data.f.find(x => x.i === c.nid); if (o?.v && o.v[0] === c.probe.mx) { c.lat.push(performance.now() - c.probe.t); c.probe = null; } }
        } else if (m.data.k === 'ev') c.evs++;
      }
      for (const w of [...c.waiters]) w(m);
    });
    ws.on('open', () => resolve(c)); ws.on('error', reject);
  });
}
// the roster every client builds (launcher.js buildCfg): per team, humans sorted by id then AI bots; the network id is the roster index
function nidOf(players, id) { const H = t => players.filter(p => p.team === t).sort((a, b) => a.id - b.id), n = Math.max(H(0).length, H(1).length, 1), R = []; for (const t of [0, 1]) { H(t).forEach(p => R.push(p.id)); for (let i = H(t).length; i < n; i++) R.push(null); } const i = R.indexOf(id); return i < 0 ? null : i; }
function drive(c) {   // 30 Hz inputs (like netgame.js), a cast every ~2 s, skill points, basic attacks, and a latency probe every second
  let t = 0, dir = 1, probeAt = 1000 + Math.random() * 1000;
  const iv = setInterval(() => {
    if (!c.live || c.host == null) return; t += 33;
    if (t % 2400 < 33) dir = -dir;
    let mx = dir * 0.8, my = Math.sin(t / 700) * 0.4;
    if (t >= probeAt) { probeAt = t + 1000; const v = c.lastProbe === 0.5 ? -0.5 : 0.5; c.lastProbe = v; c.probe = { mx: v, t: performance.now() }; }
    if (c.probe) { mx = c.probe.mx; my = 0; }
    c.send({ t: 'relay', to: c.host, data: { k: 'in', mx: Math.round(mx * 100) / 100, my: Math.round(my * 100) / 100, run: t % 6000 < 2000 ? 1 : 0, ax: dir, ay: 0, atk: t % 1000 < 300 ? 1 : 0 } });
    if (t % 2000 < 33) c.send({ t: 'relay', to: c.host, data: { k: 'cast', c: ABIL[(Math.random() * 4) | 0], ax: dir, ay: 0, cp: null } });
    if (t % 5000 < 33) c.send({ t: 'relay', to: c.host, data: { k: 'op', op: 'spend', a: ABIL[(Math.random() * 4) | 0] } });
    if (c.probe && performance.now() - c.probe.t > 3000) c.probe = null;   // dead / stunned: no answer
  }, 33);
  return () => clearInterval(iv);
}

/* ---------- one room ---------- */
async function browserHost(browser, u) {
  const ctx = await browser.createBrowserContext(), p = await ctx.newPage();
  p.on('pageerror', e => console.log('  [host pageerror]', e.message));
  await p.goto(PAGE, { waitUntil: 'domcontentloaded' });
  await p.evaluate(t => localStorage.setItem('devbrawl_session', JSON.stringify({ token: t })), u.token);
  await p.goto(PAGE, { waitUntil: 'load' });
  await p.waitForSelector('[data-a=create]', { timeout: 90000 }); await p.waitForSelector('#dot.on', { timeout: 30000 });
  return p;
}
async function room(ix, us, browser) {
  const cs = await Promise.all(us.map(player));
  let leader = cs[0], page = null;
  if (MODE === 'browser') {   // the first user is a real browser and hosts the match; the rest are simulated
    page = await browserHost(browser, us[0]);
    await page.evaluate(`document.querySelector('[data-a=create]').click()`);
    leader = cs.shift(); leader.ws.close();   // the page owns this user's socket now
    await sleep(2500);
    await page.waitForSelector('.code', { timeout: 30000 }); const code = await page.$eval('.code', e => e.textContent.trim());
    for (const c of cs) { c.send({ t: 'join_room', code }); await c.wait(m => m.t === 'room'); }
  } else {
    leader.send({ t: 'create_room', public: false }); const r = await leader.wait(m => m.t === 'room');
    for (const c of cs.slice(1)) { c.send({ t: 'join_room', code: r.code }); await c.wait(m => m.t === 'room'); }
  }
  cs.forEach((c, i) => { c.send({ t: 'pick_champ', key: CHAMPS[(i + 1) % CHAMPS.length] }); c.send({ t: 'set_ready', ready: true }); });
  const t0 = performance.now();
  cs.forEach(c => c.wait(m => m.t === 'start', 30000).then(() => setTimeout(() => c.send({ t: 'loaded' }), 500)).catch(() => {}));
  await sleep(800);
  if (MODE === 'browser') { await page.evaluate(`document.querySelector('.cc[data-k=leandro]')?.click()`); await sleep(1500); await page.evaluate(`document.querySelector('[data-a=start]').click()`); }
  else leader.send({ t: 'start_game' });
  await Promise.all(cs.map(c => c.wait(m => m.t === 'go', 90000)));
  const loadMs = performance.now() - t0;
  const stops = cs.map(drive);
  return { ix, cs, page, loadMs, stop: () => { stops.forEach(f => f()); cs.forEach(c => c.ws.close()); } };
}

/* ---------- run ---------- */
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))]); };
console.log(`stress: ${BASE} mode=${MODE} rooms=${ROOMS} players=${PLAYERS} secs=${SECS}`);
const us = await users(ROOMS * PLAYERS);
let browser = null;
if (MODE === 'browser') {
  const { default: puppeteer } = await import('puppeteer-core');
  browser = await puppeteer.launch({ executablePath: A.chrome || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'], defaultViewport: { width: 1280, height: 720 } });
}
const idle = await sample(browser ? [browser.process().pid] : []);
const rs = [];
for (let i = 0; i < ROOMS; i++) { rs.push(await room(i, us.slice(i * PLAYERS, (i + 1) * PLAYERS), browser)); console.log(`  room ${i + 1}/${ROOMS} live (load ${Math.round(rs[i].loadMs)} ms)`); }
await sleep(3000);
const roots = browser ? [browser.process().pid] : [];
const s0 = await sample(roots), b0 = rs.flatMap(r => r.cs).map(c => c.ws._socket?.bytesRead || 0);
rs.forEach(r => r.cs.forEach(c => { c.lat = []; c.snaps = 0; c.evs = 0; c.gs = []; }));
let peakHost = s0?.hostMem || 0, peakSrv = s0?.srvMem || 0;
const fpsSamples = [];
for (let el = 0; el < SECS; el += 10) {
  await sleep(Math.min(10, SECS - el) * 1000);
  const s = await sample(roots); if (s) { peakHost = Math.max(peakHost, s.hostMem); peakSrv = Math.max(peakSrv, s.srvMem); }
  if (MODE === 'browser') for (const r of rs) fpsSamples.push(await r.page.evaluate(`window.__arena?.game.loop.actualFps || 0`).catch(() => 0));
  else { const h = await hostStats(); if (h?.rooms) fpsSamples.push(...h.rooms.map(x => x.fps)); }
  process.stdout.write(`  t+${el + 10}s\n`);
}
const s1 = await sample(roots), all = rs.flatMap(r => r.cs), b1 = all.map(c => c.ws._socket?.bytesRead || 0);
const wall = s1 && s0 ? s1.t - s0.t : SECS;
const lat = all.flatMap(c => c.lat), speed = all.map(c => { const g = c.gs; return g.length > 2 ? (g.at(-1)[1] - g[0][1]) / ((g.at(-1)[0] - g[0][0]) / 1000) : null; }).filter(x => x != null);
const res = {
  base: BASE, mode: MODE, rooms: ROOMS, players: PLAYERS, secs: SECS,
  loadMs: Math.round(rs.reduce((s, r) => s + r.loadMs, 0) / rs.length),
  hostFps: fpsSamples.length ? +(fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length).toFixed(1) : null, hostFpsMin: fpsSamples.length ? Math.round(Math.min(...fpsSamples)) : null,
  simSpeed: speed.length ? +(speed.reduce((a, b) => a + b, 0) / speed.length).toFixed(2) : null,
  snapsPerSec: +(all.reduce((s, c) => s + c.snaps, 0) / all.length / wall).toFixed(1),
  latP50: pct(lat, 0.5), latP95: pct(lat, 0.95), latP99: pct(lat, 0.99), latN: lat.length,
  kbpsPerClient: +((b1.reduce((s, v, i) => s + v - b0[i], 0) / all.length / wall) / 1024).toFixed(1),
  egressMBperHourAll: +((b1.reduce((s, v, i) => s + v - b0[i], 0) / wall) * 3600 / 1048576).toFixed(0),
  srvCpuPct: s1 && s0 ? +((s1.srvCpu - s0.srvCpu) / wall * 100).toFixed(1) : null,
  hostCpuPct: s1 && s0 ? +((s1.hostCpu - s0.hostCpu) / wall * 100).toFixed(1) : null,
  srvMemMB: Math.round(peakSrv), hostMemMB: Math.round(peakHost), hostProcs: s1?.hostProcs, idleHostMemMB: Math.round(idle?.hostMem || 0), cores: s1?.cores || cores,
};
console.log(JSON.stringify(res));
fs.appendFileSync(path.join(DIR, 'stress-results.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...res }) + '\n');
rs.forEach(r => r.stop());
if (A.check) {   // shutdown check: every host process must be gone shortly after the players leave
  await sleep(+(A.check) > 1 ? +A.check * 1000 : 12000);
  const s = await sample(roots); console.log(JSON.stringify({ afterLeaveHostProcs: s?.hostProcs, afterLeaveHostMemMB: Math.round(s?.hostMem || 0) }));
}
await browser?.close();
process.exit(0);
