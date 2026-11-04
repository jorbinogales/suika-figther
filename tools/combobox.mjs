import puppeteer from 'puppeteer-core';
const char = process.argv[2] || 'xeviche';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:5173/#char=${char}&train=1&keep=1&noai=1&nofog=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
await p.evaluate(() => { const a = window.__arena, f = a.player, e = a.enemy; e.ai = false; e.maxHp = e.hp = 99999; e.x = f.x + 200; e.y = f.y; f.setAim(1, 0); });
const clip = async () => { const pt = await p.evaluate(() => { const a = window.__arena, f = a.player, c = a.cameras.main; return { x: (f.x - c.worldView.x) * c.zoom, y: (f.y - c.worldView.y) * c.zoom }; }); return { x: Math.max(0, pt.x - 120), y: Math.max(0, pt.y - 200), width: 300, height: 130 }; };
const shots = [];
for (let i = 1; i <= 3; i++) { await p.evaluate(() => { const f = window.__arena.player; f.cds.basic = 0; f.tryBasic(); }); await sleep(120); await p.screenshot({ path: `shot_cmb${i}.png`, clip: await clip() }); await sleep(250); }
await sleep(1500); await p.screenshot({ path: 'shot_cmb4.png', clip: await clip() });
console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
