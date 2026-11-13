// Josué online (server-hosted match): A plays Josué, B plays Leandro. Both see the partner, R swaps on every screen,
// the trap is only visible to Josué's team, the hunt hides the dog + Josué from B, the charge / zoom stays on A.
// At level 1 there is one skill point: run it once per slot.   node tools/josuenet.mjs [p1|p2|p3] [base] [shot prefix]
import puppeteer from 'puppeteer-core';
const SLOT = process.argv[2] || 'p2', BASE = process.argv[3] || 'http://localhost:3011/', SHOT = process.argv[4] || '';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio', '--autoplay-policy=no-user-gesture-required'], defaultViewport: { width: 800, height: 450 } });
const sleep = ms => new Promise(r => setTimeout(r, ms)), errs = [];
const mk = async name => { const c = await b.createBrowserContext(); const p = await c.newPage(); p.on('pageerror', e => errs.push(`[${name}] ${e.message}`)); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push(`[${name} console] ${m.text()}`); });
  await p.goto(BASE, { waitUntil: 'load' });
  await p.waitForFunction(() => { const t = document.querySelector('[data-tab=register]'); if (!t) return false; const r = t.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[data-tab]'); }, { timeout: 90000 });
  return p; };
const uid = Date.now().toString(36).slice(-5);
const A = await mk('A'), B = await mk('B');
const reg = async (p, n) => { await p.click('[data-tab=register]'); await p.waitForSelector('input[name=name]'); await p.type('input[name=name]', n); await p.type('input[name=email]', `${n}@t.com`); await p.type('input[name=password]', 'secreto1'); await p.click('button[type=submit]'); await sleep(1500); };
await reg(A, 'ja' + uid); await reg(B, 'jb' + uid);
await A.click('[data-a=create]'); await A.waitForSelector('.code'); const code = await A.$eval('.code', e => e.textContent.trim());
await B.click('[data-a=joinbox]'); await sleep(300); await B.type('#code', code); await B.keyboard.press('Enter'); await sleep(1500);
const tap = async (p, key) => { await p.keyboard.down(key); await sleep(90); await p.keyboard.up(key); };   // a human tap (press() is down+up in one tick: a 5-fps headless page can miss it)
const jc = (p, q) => p.evaluate(`document.querySelector('${q}')?.click()`);
await jc(A, `.cc[data-k=${process.env.CH_A || 'josue'}]`); await sleep(400); await jc(A, '[data-a=lock]'); await sleep(500);
await jc(B, '.cc[data-k=leandro]'); await sleep(400); await jc(B, '[data-a=lock]'); await sleep(800);
await jc(A, '[data-a=start]');
const waitLive = p => p.waitForFunction('window.__arena?.net?.live === true', { timeout: 150000 });
await Promise.all([waitLive(A), waitLive(B)]); await sleep(3000);
const st = (p, extra = '') => p.evaluate(`(() => { const a = window.__arena, j = a.champs.find(c => c.key === 'josue'), pal = a.fighters.find(f => f.def.pal && f.owner === j && f.alive);
  return { role: a.net.role, me: a.player.key, jDog: !!j.dogForm, jSkin: j.skin, jHp: Math.round(j.hp), jHidden: j.hiddenFor(a.player), pal: !!pal, palDog: pal?.palDog, palAway: !!pal?.away, palHidden: pal ? pal.hiddenFor(a.player) : null, palHp: pal && Math.round(pal.hp), palMax: pal && Math.round(pal.maxHp),
    jx: Math.round(j.x), palx: pal && Math.round(pal.x), ranks: j.ranks, traps: (a.traps || []).filter(t => t.kind === 'bear').map(t => ({ team: t.team, shut: t.shut, shown: !!t.img?.visible })), zoom: +a.zoom.toFixed(3), charging: !!a.jCharge, cdUlt: +j.cds.ult.toFixed(1), jState: j.state, free: j.free ${extra} }; })()`);
const out = { slot: SLOT, A0: await st(A), B0: await st(B) };
// Josué walks next to Leandro (so the abilities have a target) and learns the slot
await A.evaluate(`window.__arena.net.op('spend', '${SLOT}')`); await sleep(800);
const toward = async () => { for (let i = 0; i < 40; i++) { const d = await A.evaluate(`(() => { const a = window.__arena, e = a.enemies[0]; return Math.round(e.x - a.player.x); })()`); if (Math.abs(d) < 330) break; const ka = d > 0 ? 'KeyD' : 'KeyA', kb = d > 0 ? 'KeyA' : 'KeyD'; await Promise.all([A.keyboard.down(ka), B.keyboard.down(kb)]); await sleep(250); await Promise.all([A.keyboard.up(ka), B.keyboard.up(kb)]); } };   // both walk to meet in the middle (away from the towers)
const aimAtEnemy = () => A.evaluate(`(() => { const a = window.__arena, e = a.enemies[0], c = a.cameras.main, s = c.zoom; return [Math.round((e.x - c.worldView.x) * s), Math.round((e.y - e.def.height * 0.6 - c.worldView.y) * s)]; })()`);
await A.evaluate(`(() => { const a = window.__arena; a.enemies[0]; })()`);
await A.evaluate(`(() => { const n = window.__arena.net, s0 = n.send.bind(n); window.__sent = []; const a = window.__arena, b0 = a.beginAim.bind(a); a.beginAim = k => { window.__sent.push('begin:' + k + ':free=' + a.pc.free + ':st=' + a.pc.state + ':pal=' + !!a.pc.pal?.alive + ':away=' + !!a.pc.pal?.away); return b0(k); }; const t0 = a.pc._tryCast.bind(a.pc); a.pc._tryCast = k => { const r = t0(k); window.__sent.push('try:' + k + '=' + r); return r; }; n.send = (to, d) => { if (d.k === 'cast') window.__sent.push(d.c + (d.cp ? ':' + d.cp : '')); return s0(to, d); }; })()`);
await toward(); await sleep(500);
let [mx, my] = await aimAtEnemy(); await A.mouse.move(mx, my);
if (SLOT === 'p1') {   // trap under Leandro: only A's team sees it; it arms and stuns him on the host; then the closed trap is visible to both
  await tap(A, 'KeyQ'); await sleep(200); await A.mouse.move(mx, my); await A.mouse.down(); await sleep(90); await A.mouse.up(); await sleep(250);
  out.trapA = await st(A); out.trapB = await st(B);
  for (let i = 0; i < 16; i++) { const d = await B.evaluate(`(() => { const a = window.__arena, t = (a.traps || []).find(q => q.kind === 'bear'); return t ? [Math.round(t.x - a.player.x), Math.round(t.y - a.player.y), t.shut ? 1 : 0] : [0, 0, 1]; })()`); if (d[2] || Math.hypot(d[0], d[1]) < 12) break; const ks = [d[0] > 8 ? 'KeyD' : d[0] < -8 ? 'KeyA' : null, d[1] > 8 ? 'KeyS' : d[1] < -8 ? 'KeyW' : null].filter(Boolean); for (const k of ks) await B.keyboard.down(k); await sleep(Math.min(400, 40 + Math.hypot(d[0], d[1]) * 3)); for (const k of ks) await B.keyboard.up(k); }   // Leandro walks onto the (invisible to him) trap
  out.bDist = await B.evaluate(`(() => { const a = window.__arena, t = (a.traps || []).find(q => q.kind === 'bear'); return t && [Math.round(t.x - a.player.x), Math.round(t.y - a.player.y), a.player.stunT, t.shut]; })()`);
  await sleep(300); out.afterA = await st(A, `, eStun: a.enemies[0].stunT > 0 || a.enemies[0].state === 'stun'`); out.afterB = await st(B, `, meStunned: a.player.stunT > 0`);
} else if (SLOT === 'p2') {   // archer F: jump back shooting; R; dog F: the hunt hides the dog AND Josué from B; attack -> pounce, both visible again
  await tap(A, 'KeyF'); await sleep(700); out.dashA = await st(A);
  await tap(A, 'KeyR'); await sleep(900); out.swapA = await st(A); out.swapB = await st(B);
  await toward(); await tap(A, 'KeyF'); await sleep(900); out.huntA = await st(A); out.huntB = await st(B);
  await toward(); [mx, my] = await aimAtEnemy(); await A.mouse.move(mx, my); await A.mouse.down(); await sleep(90); await A.mouse.up(); await sleep(900); out.pounceA = await st(A); out.pounceB = await st(B);
} else {   // archer E held: zoom + charge only on A; release fires; R and dog E (bloodthirst, red tint) seen by B
  await A.keyboard.down('KeyE'); await sleep(1100); out.chargeA = await st(A); out.chargeB = await st(B);
  if (SHOT) await A.screenshot({ path: SHOT + '_charge.png' });
  await A.keyboard.up('KeyE'); await sleep(600); out.fireA = await st(A, `, cd: +a.player.cds.p3.toFixed(1)`);
  await tap(A, 'KeyR'); await sleep(900); await tap(A, 'KeyE'); await sleep(700); out.bloodB = await st(B, `, blood: j.bloodT > 0`); out.bloodA = await st(A, `, blood: j.bloodT > 0`);
}
if (SHOT) { await A.screenshot({ path: SHOT + '_A.png' }); await B.screenshot({ path: SHOT + '_B.png' }); }
out.sent = await A.evaluate('window.__sent'); out.keys = await A.evaluate(`(() => { const k = window.__arena.k; return { r: k.ult.isDown, e: k.p3.isDown, aim: window.__arena.aimKey, jc: !!window.__arena.jCharge }; })()`);
console.log(JSON.stringify(out));
console.log('errors', errs.length ? errs.slice(0, 10) : 'none');
await b.close();
