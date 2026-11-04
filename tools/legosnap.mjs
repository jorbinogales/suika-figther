// Xeviche's lego projectiles in flight, one screenshot per hit: node tools/legosnap.mjs
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#char=xeviche&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t));
await sleep(2500);
await p.evaluate(() => { const a = window.__arena, f = a.player, e = a.enemy; e.ai = false; e.maxHp = e.hp = 99999; e.x = f.x + 330; e.y = f.y; f.setAim(1, 0); });
const names = [];
for (let i = 0; i < 3; i++) {
  await p.evaluate(() => { const f = window.__arena.player; f.cds.basic = 0; f.state = 'idle'; f.tryBasic(); });
  await sleep(330); const n = `shot_lego_${i}.png`; await p.screenshot({ path: n, clip: { x: 380, y: 190, width: 560, height: 260 } }); names.push(n);
  await sleep(420);
}
await b.close();
