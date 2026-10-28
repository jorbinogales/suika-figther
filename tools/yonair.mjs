import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message, (e.stack || '').split('\n')[1]));
await p.goto('http://localhost:5173/#char=yonaiker&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 20000));
const w = t => new Promise(r => setTimeout(r, t));
await p.evaluate(`(() => { const a = window.__arena, x = a.player; ['p1','p2','p3','ult'].forEach(k => { x.ranks[k] = 3; x.cds[k] = 0; }); a.enemy.ai = false; a.enemy.x = x.x + 300; a.enemy.y = x.y; x.charge = 99.9; })()`);
await w(2300); await p.screenshot({ path: 'shot_ya1.png' });   // boarding: ship leaving, screen darkening
await w(900); await p.screenshot({ path: 'shot_ya2.png' });    // black
await w(1800); await p.screenshot({ path: 'shot_ya3.png' });   // global view fading in
console.log(await p.evaluate(`(async () => { const a = window.__arena, x = a.player, e = a.enemy; const out = { phase: x.bomber?.phase, ship: !!x.bomber?.ship };
  a.input.activePointer.positionToCamera = () => ({ x: e.x, y: e.y });
  out.cast = [x.tryCast('p3'), x.tryCast('p2')]; await new Promise(r => setTimeout(r, 1000)); x.cds.ult = 0; out.ult = x.tryCast('ult'); await new Promise(r => setTimeout(r, 1500));
  out.crates = (a.crates || []).length; out.silenced = e.silenceT > 1; out.blind = e.blindT > 1; return JSON.stringify(out); })()`));
await w(500); await p.screenshot({ path: 'shot_ya4.png' }); await b.close();
