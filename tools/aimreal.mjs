// real mouse + hotkeys: node tools/aimreal.mjs champ
import puppeteer from 'puppeteer-core';
const ch = process.argv[2] || 'leandro';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:5173/#char=${ch}&train=1&keep=1&noai=1&nofog=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
await new Promise(r => setTimeout(r, 2500));
await p.evaluate(() => { const f = window.__arena.player; f.level = 18; for (const k of ['p1', 'p2', 'p3']) f.ranks[k] = Math.max(1, f.ranks[k]); f.gold = 9999; });
const sleep = t => new Promise(r => setTimeout(r, t));
const res = [];
for (const [mx, my, label] of [[640, 40, 'top'], [640, 690, 'bottom-HUD'], [640, 560, 'low'], [1270, 360, 'right edge'], [5, 360, 'left edge']]) {
  for (const key of ['q', 'f', 'e']) {
    await p.evaluate(() => { const f = window.__arena.player; f.cds = {}; f.mana = f.maxMana = 9999; f.state = 'idle'; f.stunT = 0; window.__arena.cancelAim?.(); });
    await p.mouse.move(mx, my); await sleep(120);
    const pre = await p.evaluate(() => { const f = window.__arena.player; return { ax: f.ax, ay: f.ay, y: f.y }; });
    await p.keyboard.press(key); await sleep(150);
    await p.mouse.click(mx, my); await sleep(250);
    const post = await p.evaluate(() => { const f = window.__arena.player; return { ax: f.ax, ay: f.ay, cast: f.state }; });
    res.push(`${label.padEnd(10)} ${key} pre=(${pre.ax.toFixed(2)},${pre.ay.toFixed(2)}) post=(${post.ax.toFixed(2)},${post.ay.toFixed(2)}) ${post.cast}`);
    await sleep(700);
  }
}
console.log(res.join('\n'), '\n', errs.length ? 'ERR ' + errs[0] : 'no errors'); await b.close();
