// Two real browsers in a server-hosted match (node tools/netserver.mjs [base]): both must be clients, see the same world,
// move / cast, and one of them reloads mid-match (rejoin). Run tools/stress.mjs at the same time for "reconnection under load".
// Also measures, on B: how smooth A's champion moves (interpolation), how far B's own prediction is off (reconciliation), and the
// same again with simulated jitter + lost snapshots / inputs (window.__sim, a WebSocket wrapper injected before the game loads).
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://localhost:5173/', SHOT = process.argv[3] || '';
// small viewport: two swiftshader pages at 1280x720 run at ~6 fps, where the game's dt clamp (50 ms) slows their simulation down
const VW = +(process.env.VW || 640);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio', '--autoplay-policy=no-user-gesture-required'], defaultViewport: { width: VW, height: Math.round(VW * 9 / 16) } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
// network simulator: incoming messages delayed by base + random(jit) ms (order kept, like TCP), snapshots dropped with p = drop, our inputs with p = dropOut
const SIM = () => {
  const NW = window.WebSocket; window.__sim = { base: 0, jit: 0, drop: 0, dropOut: 0, dropped: 0 };
  window.WebSocket = class extends NW {
    set onmessage(fn) { let last = 0; super.onmessage = e => { const S = window.__sim; if (!S.base && !S.jit && !S.drop) return fn(e); if (S.drop && e.data.includes('"k":"snap"') && Math.random() < S.drop) { S.dropped++; return; } const t = Math.max(last, performance.now() + S.base + Math.random() * S.jit); last = t; setTimeout(() => fn(e), t - performance.now()); }; }
    send(d) { const S = window.__sim; if (S.dropOut && typeof d === 'string' && d.includes('"k":"in"') && Math.random() < S.dropOut) return; super.send(d); }
  };
};
const mk = async name => { const c = await b.createBrowserContext(); const p = await c.newPage(); p.on('pageerror', e => errs.push(`[${name}] ${e.message}`)); await p.evaluateOnNewDocument(SIM); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForSelector('[data-tab=register]', { timeout: 120000 });
  await p.waitForFunction(() => { const r = document.querySelector('[data-tab=register]').getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[data-tab]'); }, { timeout: 60000 });   // the boot screen is gone
  return p; };
const uid = Date.now().toString(36).slice(-5);
const A = await mk('A'), B = await mk('B');
const reg = async (p, n) => { await p.click('[data-tab=register]'); await p.waitForSelector('input[name=name]'); await p.type('input[name=name]', n); await p.type('input[name=email]', `${n}@t.com`); await p.type('input[name=password]', 'secreto1'); await p.click('button[type=submit]'); await p.waitForSelector('[data-a=create]', { timeout: 30000 }); };
await reg(A, 'sa' + uid); await reg(B, 'sb' + uid);
await A.click('[data-a=create]'); await A.waitForSelector('.code'); const code = await A.$eval('.code', e => e.textContent.trim());
await B.click('[data-a=joinbox]'); await sleep(300); await B.type('#code', code); await B.keyboard.press('Enter'); await sleep(1500);
const jc = (p, q) => p.evaluate(`document.querySelector('${q}')?.click()`);
await jc(A, '.cc[data-k=leandro]'); await sleep(500); await jc(B, '.cc[data-k=luis]'); await sleep(800); await jc(B, '[data-a=ready]'); await sleep(500);
await jc(A, '[data-a=start]');
const waitLive = p => p.waitForFunction('window.__arena?.net?.live === true', { timeout: 120000 });
await Promise.all([waitLive(A), waitLive(B)]); await sleep(4000);
const st = p => p.evaluate(`(() => { const a = window.__arena; return { role: a.net.role, host: a.net.hostId, me: a.player.key, x: Math.round(a.player.x), units: a.fighters.length, t: Math.round(a.gameT) }; })()`);
const out = { A: await st(A), B: await st(B) };
// both clients see the same units at (nearly) the same place: everything comes from the server host
const dump = p => p.evaluate(`window.__arena.fighters.map(f => [f.nid, Math.round(f.x), Math.round(f.y), f.alive ? 1 : 0])`);
const cmp = async () => { const a = await dump(A), m = new Map((await dump(B)).map(r => [r[0], r])); let miss = 0, mx = 0, al = 0, worst = null; for (const r of a) { const o = m.get(r[0]); if (!o) { miss++; continue; } const d = Math.hypot(r[1] - o[1], r[2] - o[2]); if (d > mx) { mx = d; worst = { nid: r[0], A: r.slice(1), B: o.slice(1) }; } if (r[3] !== o[3]) al++; } return { units: a.length, missingOnB: miss, maxPosDiff: Math.round(mx), aliveMismatch: al, worst: mx > 40 ? worst : undefined }; };
out.sync = await cmp();
// per-frame recorder on B: A's champion (remote, interpolated) and B's own champion (predicted). jumps = frames moving > 3x the median step
await B.evaluate(`(() => { const a = window.__arena; window.__rec = { on: false, r: [], l: [] }; const R = window.__rec; let last = performance.now();
  const tick = () => { const now = performance.now(), dt = now - last; last = now;
    if (!R.nan) { const f = a.fighters.find(f => !Number.isFinite(f.x) || !Number.isFinite(f.y)); if (f) { const n = a.net; R.nan = { nid: f.nid, key: f.key, alive: f.alive, pc: f === a.pc, nb: (f.nb || []).slice(-3), rt: n.rt, delay: n.delay, clk: n.clk, fix: n.fix, ne: f.ne, rx: f.rx, gameT: a.gameT }; } }
    if (R.on) { const e = a.champs.find(c => c.key === 'leandro'), p = a.player; R.r.push([dt, e.x, e.y, e.state]); R.l.push([dt, p.x, p.y]); } requestAnimationFrame(tick); }; requestAnimationFrame(tick); })()`);
const smooth = (rows) => {   // speed per frame (px/s); a jump is a frame whose step is far from the steps around it (a teleport / snap / stall)
  const v = rows.slice(1).map((r, i) => Math.hypot(r[1] - rows[i][1], r[2] - rows[i][2]) / Math.max(1, r[0]) * 1000);
  const moving = v.filter(x => x > 5), med = moving.length ? [...moving].sort((x, y) => x - y)[moving.length >> 1] : 0;
  let jumps = 0, stalls = 0; for (let i = 1; i < v.length - 1; i++) { if (med && v[i] > med * 2.5 && v[i] > 60) jumps++; if (med && v[i] < med * 0.25 && v[i - 1] > med * 0.7 && v[i + 1] > med * 0.7) stalls++; }
  const dts = rows.map(r => r[0]).sort((x, y) => x - y);
  return { frames: rows.length, fpsMed: Math.round(1000 / dts[dts.length >> 1]), speedMed: Math.round(med), speedMax: Math.round(Math.max(0, ...v)), jumps, stalls };
};
const rec = async (ms, fn) => { await B.evaluate(`window.__rec.r = []; window.__rec.l = []; window.__rec.on = true; window.__arena.net.rs = null`); await fn?.(); await sleep(ms); return B.evaluate(`(() => { window.__rec.on = false; return { r: window.__rec.r, l: window.__rec.l, rs: window.__arena.net.rs, delay: Math.round(window.__arena.net.delay), dropped: window.__sim.dropped }; })()`); };
const anim = rows => { const s = {}; rows.forEach(r => { s[r[3]] = (s[r[3]] || 0) + 1; }); return s; };
// A walks right for 3 s: B must see A's champion move, smoothly, with the walk / run animation
const ax0 = await B.evaluate(`Math.round(window.__arena.champs.find(c => c.key === 'leandro').x)`);
await A.evaluate(`(() => { const a = window.__arena; a.handleInput = () => {}; a.player.in = { mx: 1, my: 0, run: true }; })()`);
let R = await rec(3000);
out.moveSeenByB = { from: ax0, to: await B.evaluate(`Math.round(window.__arena.champs.find(c => c.key === 'leandro').x)`), remote: smooth(R.r), anim: anim(R.r), delayMs: R.delay };
// B walks (zig-zag) while A walks back: B's own prediction vs the host (reconciliation error per acknowledged input)
const zig = (p, ms) => p.evaluate(`(() => { const a = window.__arena; a.handleInput = () => {}; let k = 0; window.__zig = setInterval(() => { k++; a.player.in = { mx: k % 40 < 20 ? 1 : -1, my: k % 60 < 30 ? 0.5 : -0.5, run: k % 100 < 50 }; }, 50); setTimeout(() => { clearInterval(window.__zig); a.player.in = { mx: 0, my: 0, run: false }; }, ${ms}); })()`);
await A.evaluate(`window.__arena.player.in = { mx: -1, my: 0, run: false }`);
R = await rec(4000, () => zig(B, 4000));
out.clean = { remote: smooth(R.r), local: smooth(R.l), recon: R.rs, delayMs: R.delay };
await sleep(1200);
const drift = async () => { const bx = await B.evaluate(`(() => { const p = window.__arena.player; return [p.x, p.y]; })()`), ax = await A.evaluate(`(() => { const p = window.__arena.champs.find(c => c.key === 'luis'); return [p.x, p.y]; })()`); return Math.round(Math.hypot(bx[0] - ax[0], bx[1] - ax[1]) * 10) / 10; };
out.clean.driftAfterStop = await drift();
// same with a bad network on B: +20..100 ms random delay on everything it receives (TCP: loss shows up as delay) and 10 % of its inputs lost
await B.evaluate(`Object.assign(window.__sim, { base: 20, jit: 80, drop: 0, dropOut: 0.1, dropped: 0 })`);
await A.evaluate(`window.__arena.player.in = { mx: 1, my: 0, run: true }`);
await sleep(1500);   // the interpolation delay adapts
R = await rec(5000, () => zig(B, 5000));
out.jitter = { remote: smooth(R.r), anim: anim(R.r), local: smooth(R.l), recon: R.rs, delayMs: R.delay, snapsDropped: R.dropped };
// lost snapshots (5 %): every loss breaks the delta chain -> keyframe request -> resync
await B.evaluate(`Object.assign(window.__sim, { base: 20, jit: 30, drop: 0.05, dropOut: 0, dropped: 0 })`);
await A.evaluate(`window.__arena.player.in = { mx: -1, my: 0, run: true }`);
R = await rec(4000, () => zig(B, 4000));
out.loss = { remote: smooth(R.r), local: smooth(R.l), recon: R.rs, delayMs: R.delay, snapsDropped: R.dropped };
await A.evaluate(`window.__arena.player.in = { mx: 0, my: 0, run: false }`);
await sleep(1500);
out.loss.driftAfterStop = await drift();
await B.evaluate(`Object.assign(window.__sim, { base: 0, jit: 0, drop: 0, dropOut: 0 })`);
await sleep(1500);
out.syncAfterJitter = await cmp();
// B casts (prediction + host echo)
await B.evaluate(`(() => { const a = window.__arena; a.player.ranks.p1 ||= 0; a.player.spend('p1'); })()`); await sleep(500);
await B.evaluate(`window.__arena.player.tryCast('p1')`); await sleep(1500);
out.castCd = await A.evaluate(`Math.round(window.__arena.champs.find(c => c.key === 'luis').cds.p1 * 10) / 10`);
out.nanOnB = await B.evaluate(`window.__rec.nan || null`);
if (SHOT) { await B.evaluate(`window.__arena.handleInput = window.__arena.constructor.prototype.handleInput`); await sleep(500); await B.screenshot({ path: SHOT }); }
// B reloads the page: it must land back in the running match as a client
await B.reload({ waitUntil: 'load' }); const t0 = Date.now();
await B.waitForFunction('window.__arena?.net?.live === true && window.__arena.gameT > 5', { timeout: 120000 }).catch(() => {});
out.rejoin = { ms: Date.now() - t0, ...(await st(B).catch(e => ({ err: e.message }))) }; await sleep(3000);
out.syncAfterRejoin = await cmp();
out.syncAfterRejoin.nonFinite = await B.evaluate(`window.__arena.fighters.filter(f => !Number.isFinite(f.x) || !Number.isFinite(f.y)).map(f => f.nid)`);
out.syncAfterRejoin.bad = await B.evaluate(`window.__arena.net.bad || null`);
if (out.syncAfterRejoin.nonFinite.length) out.syncAfterRejoin.netState = await B.evaluate(`(() => { const n = window.__arena.net, f = window.__arena.fighters.find(f => !Number.isFinite(f.x)); return { clk: n.clk, delay: n.delay, rt: n.rt, iv: n.iv, sn: n.sn, ts: n.ts, base: n.base?.size, offs: n.offs.slice(-3), nb: f.nb?.slice(-2), ne: f.ne, rx: f.rx, fx: f.x, alive: f.alive }; })()`);
console.log(JSON.stringify(out, null, 1)); if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 10));
// both leave: the server must close the host page
await A.evaluate(`window.__arena.scene.get('hud').leave()`); await B.evaluate(`window.__arena.scene.get('hud').leave()`);
await b.close();
