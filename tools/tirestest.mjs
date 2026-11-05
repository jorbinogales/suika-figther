import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const sleep = t => new Promise(r => setTimeout(r, t)), out = [];
for (const ch of ['junior', 'jorbi', 'julio']) {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:5173/#char=${ch}&train=1&keep=1&noai=1&nofog=1`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
  await sleep(2000);
  out.push(ch + ' ' + JSON.stringify(await p.evaluate(async () => {
    const w = window.__arena, f = w.player, sleep = t => new Promise(r => setTimeout(r, t)), r = {};
    f.level = 18; f.ranks.p2 = 3; f.dashCharges = 3; f.cds = {}; f.mana = f.maxMana = 999;
    f.y = 700; f.x = 1000; f.setAim(1, 0); w.tires(f, 1150, 700, 20);   // column of 4 tires at x=1150, y 568..832
    const x0 = f.x; f.setAim(1, 0); f.tryCast('p2'); await sleep(700);
    r.dashX = Math.round(f.x - x0); r.tireX = 150; r.passed = f.x > 1150;
    // diagonal around the end of the wall is allowed only if there is room; straight at the middle must stop
    return r;
  })), errs[0] || '');
  await p.close();
}
console.log(out.join('\n')); await b.close();
