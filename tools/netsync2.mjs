// two real clients in one room: host simulates, client sees it; client moves, casts and buys
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio', '--autoplay-policy=no-user-gesture-required'], defaultViewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mk = async name => { const c = await b.createBrowserContext(); const p = await c.newPage(); p.on('pageerror', e => console.log(`[${name} pageerror]`, e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) console.log(`[${name} console]`, m.text()); }); await p.goto('http://localhost:5173/', { waitUntil: 'load' }); await sleep(9000); return p; };
const uid = Date.now().toString(36).slice(-4);
const A = await mk('A'), B = await mk('B');
const reg = async (p, n) => { await p.click('[data-tab=register]'); await p.type('input[name=name]', n); await p.type('input[name=email]', `${n}@t.com`); await p.type('input[name=password]', 'secreto1'); await p.click('button[type=submit]'); await sleep(1500); };
await reg(A, 'ana' + uid); await reg(B, 'beto' + uid);
await A.click('[data-a=create]'); await sleep(1200);
const code = await A.$eval('.code', e => e.textContent);
await B.click('[data-a=joinbox]'); await sleep(300); await B.type('#code', code); await B.keyboard.press('Enter'); await sleep(1500);
const jc = (p, q) => p.evaluate(`document.querySelector('${q}').click()`);
await sleep(800); await jc(A, '.cc[data-k=leandro]'); await sleep(600); await jc(B, '.cc[data-k=luis]'); await sleep(800);
await jc(B, '[data-a=ready]'); await sleep(600);
await jc(A, '[data-a=start]'); await sleep(9000);
const info = p => p.evaluate(`(() => { const a = window.__arena; if (!a) return 'no arena'; return JSON.stringify({ role: a.net?.role, live: a.net?.live, me: a.player.key + '@' + Math.round(a.player.x) + ',' + Math.round(a.player.y), n: a.fighters.length, minions: a.fighters.filter(f => f.isMinion && f.alive).length, champs: a.champs.map(c => c.key + c.team + ':' + Math.round(c.x) + ',' + Math.round(c.y) + ' hp' + Math.round(c.hp) + ' g' + Math.round(c.gold)), t: Math.round(a.gameT) }); })()`);
console.log('A', await info(A)); console.log('B', await info(B));
const dump = p => p.evaluate(`JSON.stringify(window.__arena.fighters.map(f => [f.nid, f.key, Math.round(f.x), Math.round(f.y), Math.round(f.hp), f.alive ? 1 : 0, f.level]))`).then(JSON.parse);
const cmp = async () => { const a = await dump(A), bb = new Map((await dump(B)).map(r => [r[0], r])); let miss = 0, mx = 0, mh = 0, dead = 0; for (const r of a) { const o = bb.get(r[0]); if (!o) { miss++; continue; } mx = Math.max(mx, Math.hypot(r[2] - o[2], r[3] - o[3])); mh = Math.max(mh, Math.abs(r[4] - o[4])); if (r[5] !== o[5]) dead++; } return { hostN: a.length, clientN: bb.size, missingOnClient: miss, maxPosDiff: Math.round(mx), maxHpDiff: mh, aliveMismatch: dead }; };
const who = process.argv[2] || 'client';
if (who === 'client') {
  await B.evaluate(`window.__arena.scene.get('hud').leave()`); await sleep(2500);
  console.log('host after client left:', await A.evaluate(`(() => { const a = window.__arena, l = a.champs.find(c => c.key === 'luis'); return JSON.stringify({ ai: l.ai, remote: a.net.remote.size }); })()`));
  console.log('B back at launcher:', await B.evaluate(`!!document.querySelector('#ui')`));
} else {
  await A.evaluate(`window.__arena.scene.get('hud').leave()`); await sleep(4500);
  console.log('client after host left:', await B.evaluate(`JSON.stringify({ banner: window.__arena?.banner?.title, ui: !!document.querySelector('#ui .home') })`)); await sleep(3500);
  console.log('client later:', await B.evaluate(`JSON.stringify({ ui: !!document.querySelector('#ui') })`));
}
await b.close();
