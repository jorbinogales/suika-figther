import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#mode=3&keep=1&noai=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
await p.evaluate(`(() => { const a = window.__arena, f = a.player; a.handleInput = () => {}; f.x = f.spawn.x; f.gold = 3000; const h = a.scene.get('hud'); h.toggleShop(); h.shopCat = 'all'; h.shopStat = null; })()`);
await new Promise(r => setTimeout(r, 500));
const pos = id => p.evaluate(`(() => { const b = window.__arena.scene.get('hud').shopBtns.find(x => x.tip === '${id}'); return b ? [b.x + b.w / 2, b.y + 20] : null; })()`);
for (const id of ['teclado_mecanico', 'b_chip']) { const c = await pos(id); if (!c) { console.log('no cell', id); continue; } await p.mouse.move(c[0], c[1]); await new Promise(r => setTimeout(r, 500)); await p.screenshot({ path: `D:/mycowork/game/shot_tip_${id}.png` }); }
await b.close();
