// aim past the edge: node tools/aimedge.mjs [champ]
import puppeteer from 'puppeteer-core';
const ch = process.argv[2] || 'leandro';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:5173/#char=${ch}&train=1&keep=1&noai=1&nofog=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
await new Promise(r => setTimeout(r, 2000));
const out = await p.evaluate(async () => {
  const w = window.__arena, f = w.player, sleep = t => new Promise(r => setTimeout(r, t)), res = [];
  f.level = 18; f.gold = 99999;
  for (const k of ['p1', 'p2', 'p3', 'ult']) { f.ranks[k] = Math.max(f.ranks[k], 1); }
  for (const dir of [[0, 1], [0, -1], [1, 0]]) for (const edge of ['edge', 'mid']) {
    for (const k of ['p1', 'p2', 'p3']) {
      f.cds = {}; f.mana = f.maxMana = 9999; f.state = 'idle'; f.stunT = 0; f.silenceT = 0;
      const ys = edge === 'edge' ? (dir[1] > 0 ? 1e9 : -1e9) : 0;
      if (edge === 'edge') { f.y = dir[1] > 0 ? 1425 : 90; } else f.y = 500; f.dashV = null;
      w.cursorWorld = () => ({ x: f.x + dir[0] * 700, y: f.y + dir[1] * 700 - f.def.height * 0.6 });
      f.castPoint = null; w.aimKey = null;
      try { w.beginAim(k); } catch (e) { res.push(k + ' beginAim err ' + e.message); continue; }
      const had = !!w.aimKey; if (had) w.confirmAim();
      res.push(`${k} dir=${dir} ${edge} aim=${f.ax.toFixed(2)},${f.ay.toFixed(2)} pt=${f.castPoint ? Math.round(f.castPoint.x - f.x) + ',' + Math.round(f.castPoint.y - f.y) : '-'} y=${Math.round(f.y)}`);
      await sleep(400);
    }
  }
  return res;
});
console.log(out.join('\n'), '\n', errs.length ? 'ERR ' + errs[0] : 'no errors'); await b.close();
