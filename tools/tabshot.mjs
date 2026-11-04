// Holds TAB in a 5v5 match and screenshots the scoreboard: node tools/tabshot.mjs
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=xeviche&mode=5&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
await new Promise(r => setTimeout(r, 4000));
await p.evaluate(() => { const a = window.__arena, ids = ['punio_acero', 'nucleo_ia', 'botas_hipersonicas', 'chaleco_antibalas', 'b_pesa', 'pocion_vida_peq']; a.champs.forEach((c, i) => { c.kills = (i * 3) % 7; c.deaths = i % 4; c.assists = (i * 2) % 9; c.gold = 300 + i * 450; c.level = 1 + (i % 9); c.inv = ids.map((id, k) => (k < (i % 6) + 1 ? { id, cd: 0, charges: id.startsWith('poc') ? 2 : 0 } : null)); }); a.champs[3].alive = false; });
await p.keyboard.down('Tab'); await new Promise(r => setTimeout(r, 600));
await p.screenshot({ path: 'shot_tab.png' });
const open = await p.evaluate(() => window.__arena.k.tab.isDown);
await p.keyboard.up('Tab'); await new Promise(r => setTimeout(r, 400)); await p.screenshot({ path: 'shot_tab_off.png', clip: { x: 300, y: 100, width: 700, height: 300 } });
console.log('tab down:', open, 'errors:', errs.length ? errs.join('|') : 'none'); await b.close();
