// Shop recipe tree for a selected item: node tools/treeshot.mjs <itemId> [gold] [tab]
import puppeteer from 'puppeteer-core';
const id = process.argv[2] || 'antivirus_portatil', gold = +(process.argv[3] || 500), tab = process.argv[4] || 'all';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=hector&mode=4&enemies=leandro,xeviche,julio&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player, { timeout: 90000 });
await new Promise(r => setTimeout(r, 3000));
await p.evaluate(([id, g, tab]) => { const a = window.__arena, h = a.scene.get('hud'); a.player.gold = g; h.shopCat = tab; h.toggleShop(); h.shopAuto = false; h.shopSel = id; h.shopSlot = null; }, [id, gold, tab]);
await new Promise(r => setTimeout(r, 700));
await p.screenshot({ path: `shot_tree_${id}.png` });
console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
