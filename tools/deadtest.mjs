// kills the player, screenshots the red screen + countdown, then checks cooldowns survive the respawn
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], defaultViewport: { width: 1600, height: 900 } });
const p = await b.newPage();
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#px=420&gap=2500&noai=1&wave=999&lvl=3&rank=1', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 3500));
const cds = await p.evaluate(() => { const a = window.__arena, f = a.player; f.cds.p1 = 8; f.cds.ult = 30; a.damage(null, f, 99999, 'true'); return { ...f.cds }; });
await new Promise(r => setTimeout(r, 1500));
await p.screenshot({ path: process.argv[2] });
const during = await p.evaluate(() => ({ ...window.__arena.player.cds, alive: window.__arena.player.alive, t: window.__arena.player.respawnTime }));
await p.evaluate(() => { const f = window.__arena.player; f.deadT = f.respawnTime - 0.05; });
await new Promise(r => setTimeout(r, 1500));
const after = await p.evaluate(() => ({ ...window.__arena.player.cds, alive: window.__arena.player.alive }));
console.log('at death', JSON.stringify(cds), '\nwhile dead', JSON.stringify(during), '\nafter respawn', JSON.stringify(after));
await b.close();
