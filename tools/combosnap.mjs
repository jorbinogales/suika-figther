// Screenshots of a champion's 3-hit combo in the game: node tools/combosnap.mjs <char> <aimX> <aimY> -> shot_combo_<n>.png + shot_combo_sheet.png
import puppeteer from 'puppeteer-core';
const char = process.argv[2] || 'xeviche', ax = +(process.argv[3] ?? 1), ay = +(process.argv[4] ?? 0);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto(`http://localhost:5173/#char=${char}&train=1&keep=1&noai=1&nofog=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t));
await sleep(2500);
await p.evaluate(([ax, ay]) => { const a = window.__arena, f = a.player, e = a.enemy; e.ai = false; e.maxHp = e.hp = 99999; e.x = f.x + ax * 200; e.y = f.y + ay * 200; f.setAim(ax, ay); f.in = { mx: 0, my: 0, run: false }; }, [ax, ay]);
const clip = async () => { const pt = await p.evaluate(() => { const a = window.__arena, f = a.player, c = a.cameras.main; return { x: (f.x - c.worldView.x) * c.zoom, y: (f.y - c.worldView.y) * c.zoom }; }); return { x: Math.max(0, pt.x - 170), y: Math.max(0, pt.y - 190), width: 340, height: 260 }; };
const shots = [];
for (let i = 0; i < 4; i++) {
  await p.evaluate(() => { const f = window.__arena.player; f.cds.basic = 0; f.state = 'idle'; f.tryBasic(); });
  for (const [k, dt] of [['a', 110], ['b', 120]]) { await sleep(dt); const path = `shot_combo_${i}${k}.png`; await p.screenshot({ path, clip: await clip() }); shots.push(path); }
  console.log(i + 1, await p.evaluate(() => { const f = window.__arena.player; return f.cstepN + ' ' + f.spr.anims.currentAnim?.key; }));
  await sleep(650);
}
await b.close();
