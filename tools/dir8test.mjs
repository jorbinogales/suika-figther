// 8-direction sprite engine check: node tools/dir8test.mjs <char>   (needs public/assets/sprites/<char>/walk_<dir>.png + manifest entries)
import puppeteer from 'puppeteer-core';
const char = process.argv[2] || 'xeviche';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto(`http://localhost:5173/#char=${char}&train=1&keep=1&noai=1&nofog=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t));
await sleep(2500);
const read = () => p.evaluate(() => { const f = window.__arena.player, a = f.spr.anims.currentAnim; return { dir: f.curD, anim: a?.key, flip: f.spr.flipX, art: f.dirArt, state: f.state, x: Math.round(f.x), y: Math.round(f.y) }; });
const out = [];
// walking in 8 directions with the keyboard (aim stays east)
const combos = { e: ['d'], se: ['d', 's'], s: ['s'], sw: ['a', 's'], w: ['a'], nw: ['a', 'w'], n: ['w'], ne: ['d', 'w'] };
for (const [name, keys] of Object.entries(combos)) {
  for (const k of keys) await p.keyboard.down(k);
  await sleep(700); const r = await read(); out.push({ want: name, ...r });
  for (const k of keys) await p.keyboard.up(k);
  await sleep(300);
}
// idle facing the cursor direction (aim): set the aim vector directly
for (const [name, v] of Object.entries({ e: [1, 0], s: [0, 1], n: [0, -1], sw: [-0.7, 0.7], ne: [0.7, -0.7] })) {
  await p.evaluate(v => { const f = window.__arena.player; f.ax = v[0]; f.ay = v[1]; }, v); await sleep(250);
  out.push({ want: 'idle-' + name, ...(await read()) });
}
console.log(out.map(o => JSON.stringify(o)).join('\n'));
await b.close();
