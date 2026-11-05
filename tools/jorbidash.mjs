import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 200)); });
await p.goto('http://localhost:5173/#char=jorbi&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
await new Promise(r => setTimeout(r, 2500));
const sleep = t => new Promise(r => setTimeout(r, t));
await p.evaluate(() => { const f = window.__arena.player; f.level = 18; f.ranks.p2 = 3; f.dashCharges = 3; f.gold = 9999; });
const log = [];
for (let i = 0; i < 4; i++) {
  await p.mouse.move(900 + i * 20, 300 + i * 30); await sleep(100);
  await p.evaluate((i) => { const f = window.__arena.player; f.cds = {}; f.state = 'idle'; const a = [[1,0],[0,1],[-1,0],[0,-1]][i]; f.setAim(a[0], a[1]); f.tryCast('p2'); }, i); await sleep(60);
  log.push(await p.evaluate(() => { const w = window.__arena, f = w.player, c = w.cameras.main; return { st: f.state, anim: f.anim, ch: f.dashCharges, x: Math.round(f.x), y: Math.round(f.y), cam: [Math.round(c.scrollX), Math.round(c.scrollY), c.zoom.toFixed(2), +c.rotation.toFixed(2)], sprA: f.spr.alpha, scale: [f.spr.scaleX.toFixed(2), f.spr.scaleY.toFixed(2)], ang: f.spr.angle, vis: f.spr.visible, tex: f.spr.texture.key, fr: f.spr.frame.name }; }));
  await p.screenshot({ path: `art/review_8dir/_dash${i}.png` });
  await sleep(120);
}
console.log(log.map(l => JSON.stringify(l)).join('\n')); console.log(errs.slice(0, 6).join('\n') || 'no errors'); await b.close();
