// Moto eléctrica static charge with real keys + ice/fire ground marks + status icons: node tools/motoslow.mjs
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=jorbi&mode=5&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(3500);
await p.evaluate(() => { const a = window.__arena, f = a.player, en = a.champs.filter(c => c.baseTeam !== f.baseTeam); a.aiOn = false; a.fighters.forEach(x => { if (x !== f && !en.slice(0, 3).includes(x)) { x.x = 300; x.y = 140; } }); f.x = 1500; f.y = 800;
  f.inv = [{ id: 'moto_electrica', cd: 0, charges: 0 }, null, null, null, null, null]; f.recomputeItems(); window.__bonus = 0; const od = a.damage.bind(a); a.damage = (s, t, r, ty, d) => { const v = od(s, t, r, ty, d); if (d && ty === 'magic' && s === f) window.__bonus += v; return v; };
  en.slice(0, 3).forEach((c, i) => { c.x = 1700 + i * 120; c.y = 800; c.ai = false; c.maxHp = c.hp = 99999; c.stunT = 0; });
  en[0].slow(0.4, 30); en[1].burn(10, 30, f); en[2].slow(0.4, 30); en[2].burn(10, 30, f); en[2].poison(5, 30, f); window.__en = en; });
await p.keyboard.down('d'); await sleep(2600);
await p.evaluate(() => { const f = window.__arena.player, e = window.__en[0]; e.x = f.x + 70; e.y = f.y; f.setAim(1, 0); f.cds.basic = 0; f.tryBasic(); }); await sleep(900); await p.keyboard.up('d');
console.log('moto bonus damage:', Math.round(await p.evaluate(() => window.__bonus)));
await p.evaluate(() => { const a = window.__arena, f = a.player; f.x = 1500; f.y = 800; window.__en.forEach((c, i) => { c.x = 1500 + i * 130; c.y = 760; c.stunT = 99; }); a.zoom = 1.6; a.snapZoom = true; }); await sleep(700);
await p.screenshot({ path: 'shot_slowburn.png', clip: { x: 330, y: 60, width: 620, height: 300 } });
console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
