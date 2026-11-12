import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader','--use-gl=angle','--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.stack || e.message));
await p.goto('http://localhost:5199/#char=luis&noai=1&nofog=1&keep=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
await p.evaluate(() => { const w = window.__arena, f = w.player, t = w.fighters.find(q => q.isTower && !q.isNexus && q.alive && q.team !== f.team); f.hp = f.maxHp = 99999; f.x = t.x - 250; f.y = t.y + 30; w.camTarget.x = t.x - 120; w.camTarget.y = t.y; });
for (let i = 0; i < 12; i++) { await sleep(250); if (await p.evaluate(() => window.__arena.projs.some(q => q.showPath))) break; } await p.screenshot({ path: 'art/review_8dir/_tower_path.png' });
console.log('errors:', [...new Set(errs)].join('\n') || 'none'); await b.close();
