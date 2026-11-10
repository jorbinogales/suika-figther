import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('response', r => r.status() === 404 && errs.push(r.url()));
await p.goto('http://localhost:5199/#char=maduro&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
const res = await p.evaluate(async () => {
  const w = window.__arena, f = w.player, e = w.enemy, sleep = t => new Promise(r => setTimeout(r, t)), r = {};
  f.level = 18; f.mana = f.maxMana = 999; e.ai = false; e.maxHp = e.hp = 9000;
  for (const rank of [1, 2, 3]) {
    for (const k of ['p1', 'p2', 'p3', 'ult']) f.ranks[k] = rank;
    f.setSB?.(0); f.cds = { p1: 0, p2: 0, p3: 0, ult: 0, basic: 0 }; f.state = 'idle'; f.stunT = 0; e.hp = 9000; e.x = f.x + 100; e.y = f.y; const x0 = e.x;
    const ok = f.tryCast('ult'); await sleep(1200); r[rank] = { ok, pushed: Math.round(e.x - x0), dmg: Math.round(9000 - e.hp), sb: !!f.sb, alive: e.alive };
  }
  return r;
});
console.log(JSON.stringify(res)); console.log(errs.slice(0, 5).join('\n')); await p.screenshot({ path: 'art/review_8dir/_maduro3.png' }); await b.close();
