// Health bar ticks for different max-HP values: node tools/hpticks.mjs
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=hector&mode=5&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
await new Promise(r => setTimeout(r, 3500));
await p.evaluate(() => { const a = window.__arena, me = a.player, en = a.champs.filter(c => c.baseTeam !== me.baseTeam), extra = [0, 400, 1000, 2000, 3800];
  a.fighters.forEach(f => { if (f !== me && !en.includes(f)) { f.x = 300; f.y = 140; } }); me.x = 1250; me.y = 700; a.aiOn = false;
  en.forEach((c, i) => { c.it.hp = extra[i]; c.hp = c.maxHp * 0.85; c.x = 1000 + (i % 3) * 260; c.y = 640 + Math.floor(i / 3) * 90; c.ai = false; c.stunT = 99; });
  a.zoom = 1.7; a.snapZoom = true; window.__m = en.map(c => Math.round(c.maxHp)); });
await new Promise(r => setTimeout(r, 600));
console.log(await p.evaluate(() => JSON.stringify(window.__m))); await p.screenshot({ path: 'shot_hpticks.png' });
console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
