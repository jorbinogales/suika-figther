// Real mouse click spam: node tools/clickspam.mjs <char> [interval_ms] [seconds]  -> timeline of started combo hits
import puppeteer from 'puppeteer-core';
const char = process.argv[2] || 'junior', gap = +(process.argv[3] || 120), secs = +(process.argv[4] || 3);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto(`http://localhost:5173/#char=${char}&train=1&keep=1&noai=1&nofog=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t));
await sleep(2500);
await p.evaluate(() => { const a = window.__arena, f = a.player, e = a.enemy; e.ai = false; e.maxHp = e.hp = 999999; e.x = f.x + 70; e.y = f.y; f.setAim(1, 0); window.__log = []; let last = -1;
  const orig = f.startAction.bind(f); f.startAction = (anim, w, d, fn) => { window.__log.push({ t: Math.round(performance.now()), step: f.cstepN, anim, cd: +f.cds.basic.toFixed(2) }); return orig(anim, w, d, fn); }; });
// the mouse over the enemy so the aim stays on it (cursor in world coords)
const pos = await p.evaluate(() => { const a = window.__arena, e = a.enemy, c = a.cameras.main; return { x: (e.x - c.worldView.x) * c.zoom, y: (e.y - c.worldView.y) * c.zoom }; });
await p.mouse.move(pos.x, pos.y);
const t0 = Date.now(); let clicks = 0;
while (Date.now() - t0 < secs * 1000) { await p.mouse.down(); await sleep(35); await p.mouse.up(); clicks++; await sleep(gap); }
await sleep(800);
const log = await p.evaluate(() => window.__log); const base = log[0]?.t || 0;
console.log(`clicks sent: ${clicks} in ${secs}s | hits started: ${log.length}`);
console.log(log.map(l => `${l.t - base}ms s${l.step}:${l.anim}`).join('  '));
await b.close();
