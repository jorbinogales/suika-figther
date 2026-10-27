// measures forward vs backward walking speed and reverse playback (mouse to the right of the player)
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], defaultViewport: { width: 1600, height: 900 } });
const p = await b.newPage();
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#px=1500&gap=2000&noai=1&wave=999', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 3500));
await p.mouse.move(1100, 410); await new Promise(r => setTimeout(r, 200));
const st = () => p.evaluate(() => { const f = window.__arena.player; return { x: Math.round(f.x), state: f.state, rev: f.spr.anims.inReverse, back: f.backing }; });
for (const [k, label] of [['d', 'forward'], ['a', 'backward']]) {
  const a = await st(); await p.keyboard.down(k); await new Promise(r => setTimeout(r, 1000)); const mid = await st(); await p.keyboard.up(k);
  await new Promise(r => setTimeout(r, 300));
  console.log(label, 'dx =', mid.x - a.x, JSON.stringify(mid));
}
await b.close();
