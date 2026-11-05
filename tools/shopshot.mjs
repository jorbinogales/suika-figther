// Opens the shop (RECOMENDADO tab) in a match and screenshots it: node tools/shopshot.mjs <char> <enemies csv> [gold] [buyId]
import puppeteer from 'puppeteer-core';
const char = process.argv[2] || 'hector', enemies = process.argv[3] || 'leandro,xeviche,julio', gold = +(process.argv[4] || 900), buy = process.argv[5];
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:5173/#char=${char}&mode=4&enemies=${enemies}&noai=1&nofog=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t));
await sleep(3000);
await p.evaluate(g => { const a = window.__arena; a.player.gold = g; a.scene.get('hud').toggleShop(); }, gold);
await sleep(800);
if (process.env.ALL) { await p.evaluate(() => { const h = window.__arena.scene.get('hud'); h.shopCat = 'all'; }); await sleep(500); }
if (buy) { await p.evaluate(id => { const a = window.__arena, h = a.scene.get('hud'); h.shopSel = id; h.recIds = h.recIds || []; const rec = h.recIds.includes(id); a.player.buyItem(id); a.player.recChain = rec ? { from: id } : null; }, buy); await sleep(800); }
await p.screenshot({ path: `shot_shop_${char}${buy ? '_after' : ''}.png` });
console.log(await p.evaluate(() => { const h = window.__arena.scene.get('hud'); return JSON.stringify({ open: h.shopOpen, cat: h.shopCat, recs: h.recIds }); }));
console.log('errors:', errs.length ? errs.join(' | ') : 'none');
await b.close();
