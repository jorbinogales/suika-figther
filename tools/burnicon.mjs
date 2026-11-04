// Burn (red flame) vs poison (green drop) icons on the bars and in the status list: node tools/burnicon.mjs
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=junior&mode=5&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(3500);
const info = await p.evaluate(() => { const a = window.__arena, me = a.player, en = a.champs.filter(c => c.baseTeam !== me.baseTeam); a.fighters.forEach(f => { if (f !== me && !en.slice(0, 3).includes(f)) { f.x = 300; f.y = 140; } }); a.aiOn = false;
  me.x = 1500; me.y = 800; en.slice(0, 3).forEach((c, i) => { c.x = 1400 + i * 120; c.y = 700; c.ai = false; c.stunT = 99; });
  en[0].burn(30, 20, me); en[1].poison(20, 20, me); en[2].burn(30, 20, me); en[2].poison(20, 20, me); me.burn(20, 20, en[0]); me.poison(10, 20, en[0]);
  return en.slice(0, 3).map(c => `${c.def.name}: burning=${c.burning} poisoned=${c.poisoned}`); });
console.log(info.join(' | ')); await sleep(600);
await p.screenshot({ path: 'shot_burn.png' });
console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
