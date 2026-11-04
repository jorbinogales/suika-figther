// Selected champion panel: node tools/selshot.mjs
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=hector&mode=5&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
await new Promise(r => setTimeout(r, 3500));
await p.evaluate(() => { const a = window.__arena, me = a.player, en = a.champs.find(c => c.baseTeam !== me.baseTeam && c.key === 'yonaiker') || a.champs.find(c => c.baseTeam !== me.baseTeam); en.hp = en.maxHp * 0.55; en.inv = ['punio_acero', 'nucleo_ia', 'botas_hipersonicas', 'chaleco_antibalas', 'b_pesa', 'pocion_vida_peq'].map((id, k) => (k < 5 ? { id, cd: 0, charges: 0 } : null)); a.selected = en; });
await new Promise(r => setTimeout(r, 600));
await p.screenshot({ path: 'shot_sel.png', clip: { x: 640, y: 0, width: 640, height: 220 } });
await p.evaluate(() => { const a = window.__arena; a.selected = a.champs.find(c => c.baseTeam === a.player.baseTeam && c !== a.player); }); await new Promise(r => setTimeout(r, 500));
await p.screenshot({ path: 'shot_sel_ally.png', clip: { x: 640, y: 0, width: 640, height: 220 } });
console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
