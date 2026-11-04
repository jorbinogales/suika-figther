import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=jorbi&mode=4&enemies=hector,junior,luis&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player, { timeout: 90000 });
await new Promise(r => setTimeout(r, 3000));
await p.evaluate(() => { const a = window.__arena; a.player.gold = 5000; a.scene.get('hud').toggleShop(); });
await new Promise(r => setTimeout(r, 600));
await p.mouse.click(571, 137); await new Promise(r => setTimeout(r, 700));   // TODOS tab
await p.screenshot({ path: 'shot_shop_all.png' });
console.log(await p.evaluate(() => { const h = window.__arena.scene.get('hud'); return h.shopCat; }), 'errors:', errs.length ? errs.join('|') : 'none');
await b.close();
