// Screenshots of a champion walking in the 8 directions (and idle): node tools/dir8shot.mjs <char>  -> shot_dir8_<char>.png (contact sheet)
import puppeteer from 'puppeteer-core';
const char = process.argv[2] || 'xeviche';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto(`http://localhost:5173/#char=${char}&train=1&keep=1&noai=1&nofog=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t));
await sleep(2500);
const combos = { e: ['d'], se: ['d', 's'], s: ['s'], sw: ['a', 's'], w: ['a'], nw: ['a', 'w'], n: ['w'], ne: ['d', 'w'] };
const clip = async () => { const pt = await p.evaluate(() => { const a = window.__arena, f = a.player, c = a.cameras.main; return { x: (f.x - c.worldView.x) * c.zoom, y: (f.y - c.worldView.y) * c.zoom }; }); return { x: Math.max(0, pt.x - 110), y: Math.max(0, pt.y - 190), width: 220, height: 250 }; };
const shots = [];
for (const [name, keys] of Object.entries(combos)) {
  for (const k of keys) await p.keyboard.down(k);
  await sleep(650); const r = await p.evaluate(() => ({ dir: window.__arena.player.curD, anim: window.__arena.player.spr.anims.currentAnim?.key }));
  const path = `shot_dir8_${name}.png`; await p.screenshot({ path, clip: await clip() }); shots.push(path); console.log(name, JSON.stringify(r));
  for (const k of keys) await p.keyboard.up(k);
  await sleep(250);
}
await b.close();
