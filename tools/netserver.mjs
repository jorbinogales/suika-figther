// Two real browsers in a server-hosted match (node tools/netserver.mjs [base]): both must be clients, see the same world,
// move / cast, and one of them reloads mid-match (rejoin). Run tools/stress.mjs at the same time for "reconnection under load".
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://localhost:5173/';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio', '--autoplay-policy=no-user-gesture-required'], defaultViewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errs = [];
const mk = async name => { const c = await b.createBrowserContext(); const p = await c.newPage(); p.on('pageerror', e => errs.push(`[${name}] ${e.message}`)); await p.goto(BASE, { waitUntil: 'load' }); await p.waitForSelector('[data-tab=register]', { timeout: 120000 }); return p; };
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
const cmp = async () => { const a = await dump(A), m = new Map((await dump(B)).map(r => [r[0], r])); let miss = 0, mx = 0, al = 0; for (const r of a) { const o = m.get(r[0]); if (!o) { miss++; continue; } mx = Math.max(mx, Math.hypot(r[1] - o[1], r[2] - o[2])); if (r[3] !== o[3]) al++; } return { units: a.length, missingOnB: miss, maxPosDiff: Math.round(mx), aliveMismatch: al }; };
out.sync = await cmp();
// A walks right for 3 s: B must see A's champion move
const ax0 = await B.evaluate(`Math.round(window.__arena.champs.find(c => c.key === 'leandro').x)`);
await A.evaluate(`(() => { const a = window.__arena; a.handleInput = () => {}; a.player.in = { mx: 1, my: 0, run: true }; })()`); await sleep(3000);
out.moveSeenByB = { from: ax0, to: await B.evaluate(`Math.round(window.__arena.champs.find(c => c.key === 'leandro').x)`) };
// B casts (prediction + host echo)
await B.evaluate(`(() => { const a = window.__arena; a.player.ranks.p1 ||= 0; a.player.spend('p1'); })()`); await sleep(500);
await B.evaluate(`window.__arena.player.tryCast('p1')`); await sleep(1500);
out.castCd = await A.evaluate(`Math.round(window.__arena.champs.find(c => c.key === 'luis').cds.p1 * 10) / 10`);
// B reloads the page: it must land back in the running match as a client
await B.reload({ waitUntil: 'load' }); const t0 = Date.now();
await B.waitForFunction('window.__arena?.net?.live === true && window.__arena.gameT > 5', { timeout: 120000 }).catch(() => {});
out.rejoin = { ms: Date.now() - t0, ...(await st(B).catch(e => ({ err: e.message }))) }; await sleep(3000);
out.syncAfterRejoin = await cmp();
console.log(JSON.stringify(out, null, 1)); if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 10));
// both leave: the server must close the host page
await A.evaluate(`window.__arena.scene.get('hud').leave()`); await B.evaluate(`window.__arena.scene.get('hud').leave()`);
await b.close();
