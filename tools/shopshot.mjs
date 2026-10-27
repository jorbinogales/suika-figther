import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#mode=3&keep=1&noai=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
await p.evaluate(`(() => { const a = window.__arena, f = a.player; a.handleInput = () => {}; f.x = f.spawn.x; f.gold = 900; f.inv.fill(null); ['b_chip', 'b_reloj', 'b_cargador'].forEach(i => f.buyItem(i)); f.buyItem('libro_algoritmos'); const h = a.scene.get('hud'); h.toggleShop(); h.shopSel = 'nucleo_ia'; })()`);
await new Promise(r => setTimeout(r, 800)); await p.screenshot({ path: 'D:/mycowork/game/shot_shop.png' }); await b.close();
