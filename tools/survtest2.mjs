import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader','--use-gl=angle','--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5199/#surv=1&char=' + (process.argv[2] || 'luis'), { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.sv, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
await p.evaluate(() => { const w = window.__arena; w.survChoose(0); });
// bot: god mode + chase the nearest mob and attack it
await p.evaluate(() => { window.__bot = setInterval(() => { const w = window.__arena, f = w.player; if (!f.alive || w.over) return; if (w.sv.pick) { w.survChoose(0); return; }
  f.hp = Math.max(f.hp, f.maxHp * 0.6); const m = w.mobs.slice().sort((a, c) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(c.x - f.x, c.y - f.y))[0];
  if (m) { const dx = m.x - f.x, dy = m.y - f.y; f.setAim(dx, dy); f.in = { mx: Hypot(dx) > 90 ? dx : 0, my: Hypot(dx) > 90 ? dy : 0, run: false }; f.cds.basic = 0; f.tryBasic?.(); } }, 100); function Hypot(x){return Math.abs(x);} });
const st = () => p.evaluate(() => { const w = window.__arena, s = w.sv; return JSON.stringify({ wave: s.wave, phase: s.phase, alive: s.alive, q: s.queue.length, kills: s.kills, lvl: w.player.level, xp: w.player.xp, inv: w.player.inv.filter(Boolean).map(i => i.id), ranks: w.player.ranks, over: !!w.over }); });
for (let i = 0; i < 8; i++) { await sleep(6000); console.log(await st()); if (i === 3) await p.screenshot({ path: 'art/review_8dir/_surv_fight.png' }); }
console.log('errors:', [...new Set(errs)].slice(0, 8).join('\n') || 'none'); await b.close();
