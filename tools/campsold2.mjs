import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader','--use-gl=angle','--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.stack || e.message));
await p.goto('http://localhost:5199/#char=luis&noai=1&nofog=1&keep=1&boss=captain&bt=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.bosses, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
const g0 = () => p.evaluate(() => { const w = window.__arena; return JSON.stringify(w.fighters.filter(q => q.campGuard).map(q => [q.x | 0, q.y | 0, q.def.name.slice(0, 5), q.alive])); });
console.log('spawn', await g0());
await p.evaluate(() => { const w = window.__arena, f = w.player; f.hp = f.maxHp = 99999; f.x = 4455 - 160; f.y = 1235; });
for (let i = 0; i < 3; i++) { await sleep(1000); console.log(i, await g0()); }
await p.evaluate(() => { const w = window.__arena, f = w.player, g = w.fighters.find(q => q.campGuard && q.alive); w.damage(f, g, 5, 'physical'); });
for (let i = 0; i < 4; i++) { await sleep(700); console.log('hit', i, await g0(), await p.evaluate(() => Math.round(window.__arena.player.hp))); }
console.log(errs.join('\n') || 'none'); await b.close();
