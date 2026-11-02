// 3D view (#3d=1): abilities, aim guides and effects. node tools/r3dfx.mjs [--gpu] [--prefix=fx3d] [champ,champ...]
// Writes shot_<prefix>_<champ>_<step>.png (default prefix fx) in the game folder (one page at a time to keep memory low).
import puppeteer from 'puppeteer-core';
const GPU = process.argv.includes('--gpu');
const args = GPU ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] : ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'];
const only = (process.argv.find(a => /^[a-z,]+$/.test(a)) || '').split(',').filter(Boolean);
const PREFIX = (process.argv.find(a => a.startsWith('--prefix=')) || '--prefix=fx').slice(9);   // e.g. --prefix=fx3d
const sleep = t => new Promise(r => setTimeout(r, t));
// per champion: [step name, key to press (null = none), click on the enemy?, wait ms before the shot]
const PLAN = {
  xeviche: [['aimQ', 'KeyQ', false, 400], ['castQ', null, true, 450], ['castR', 'KeyR', true, 900]],
  junior: [['aimR', 'KeyR', false, 400], ['castR', null, true, 1400], ['castE', 'KeyE', true, 900]],   // R first: with E active he cannot cast anything else
  yonaiker: [['castF', 'KeyF', true, 1300], ['fly', 'charge', false, 4200], ['missiles', null, true, 1500]],
  hector: [['castR', 'KeyR', true, 1100], ['castQ', 'KeyQ', true, 700]],
  jorbi: [['castQ', 'KeyQ', true, 600], ['castR', 'KeyR', true, 900]],
  eliud: [['castQ', 'KeyQ', true, 700], ['castR', 'KeyR', true, 1600]],
  axel: [['aimR', 'KeyR', false, 400], ['castR', null, true, 1200]],
  leandro: [['castE', 'KeyE', true, 900], ['castR', 'KeyR', true, 1200]],
  luis: [['castQ', 'KeyQ', true, 900], ['castE', 'KeyE', true, 900]],
};
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args, defaultViewport: { width: 1280, height: 720 } });
const out = {}; let errors = 0;
for (const [ch, steps] of Object.entries(PLAN)) {
  if (only.length && !only.includes(ch)) continue;
  const p = await b.newPage();
  p.on('pageerror', e => { errors++; console.log('[pageerror]', ch, e.message, (e.stack || '').split('\n')[1]); });
  await p.goto(`http://localhost:5173/#char=${ch}&train=1&keep=1&noai=1&nofog=1&3d=1`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__arena?.r3d?.forestCount > 0, { timeout: 90000 });
  await sleep(1500);
  await p.evaluate(() => { const a = window.__arena, x = a.player, e = a.enemy; ['p1', 'p2', 'p3', 'ult'].forEach(k => { x.ranks[k] = 3; }); e.x = x.x + 300; e.y = x.y + 40; e.maxHp; });
  const res = [];
  for (const [name, key, click, wait] of steps) {
    const es = await p.evaluate(() => { const a = window.__arena, e = a.enemy, s = a.r3d.toScreen(e.x, 0, e.y); return { x: s.x, y: s.y }; });
    await p.mouse.move(es.x, es.y);
    if (key === 'charge') await p.evaluate(() => { window.__arena.player.charge = 99.5; });
    else if (key) { await p.keyboard.down(key); await sleep(110); await p.keyboard.up(key); await sleep(120); }   // a press shorter than a frame is missed by the game
    if (click) { await p.mouse.down(); await sleep(90); await p.mouse.up(); }
    await sleep(wait);
    await p.screenshot({ path: `shot_${PREFIX}_${ch}_${name}.png` });
    res.push(name + ':' + (await p.evaluate(() => { const a = window.__arena, r = a.r3d; return `ground=${r.groundCount},up=${r.upCount}`; })));
  }
  out[ch] = res.join(' ');
  await p.close();
}
out.pageerrors = errors;
console.log(JSON.stringify(out, null, 1));
await b.close();
