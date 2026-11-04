// Which directional sheet each ability plays when aimed in the 8 directions: node tools/dir8cast.mjs <char>
import puppeteer from 'puppeteer-core';
const char = process.argv[2] || 'xeviche';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:5173/#char=${char}&train=1&keep=1&noai=1&nofog=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t));
await sleep(2500);
const V = { e: [1, 0], se: [0.7, 0.7], s: [0, 1], sw: [-0.7, 0.7], w: [-1, 0], nw: [-0.7, -0.7], n: [0, -1], ne: [0.7, -0.7] };
const res = {};
for (const k of ['p1', 'p2', 'p3', 'ult']) {
  res[k] = {};
  for (const [d, v] of Object.entries(V)) {
    const r = await p.evaluate(async ([k, v]) => {
      const a = window.__arena, f = a.player, e = a.enemy; if (e) { e.ai = false; e.maxHp = e.hp = 99999; e.x = f.x + v[0] * 250; e.y = f.y + v[1] * 250; }
      ['p1', 'p2', 'p3', 'ult'].forEach(x => { f.ranks[x] = 1; f.cds[x] = 0; }); f.mana = f.maxMana; f.stunT = 0; f.state = 'idle'; f.ax = v[0]; f.ay = v[1]; f.castPoint = { x: f.x + v[0] * 250, y: f.y + v[1] * 250 };
      const ok = f.tryCast(k); await new Promise(r => setTimeout(r, 120)); const key = f.spr.anims.currentAnim?.key, fl = f.spr.flipX;
      await new Promise(r => setTimeout(r, 1800)); return { ok, key, fl };
    }, [k, v]);
    res[k][d] = `${r.key?.replace(char + '_', '')}${r.fl ? ' (flip)' : ''}${r.ok ? '' : ' !nocast'}`;
  }
}
for (const k in res) console.log(k, JSON.stringify(res[k]));
console.log('errors:', errs.length ? errs.join(' | ') : 'none'); await b.close();
