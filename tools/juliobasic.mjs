import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader','--use-gl=angle','--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await p.goto('http://localhost:5199/#char=julio&train=1&nofog=1&keep=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
for (let i = 0; i < 8; i++) { await p.evaluate(() => { const w = window.__arena, f = w.player; const e = w.fighters.find(q => q.alive && q.team !== f.team && !q.isTower); if (e) { f.x = e.x - 90; f.y = e.y; f.setAim(1, 0); } f.tryBasic?.(); }); await sleep(700); }
console.log('errors:', [...new Set(errs)].join('\n') || 'none'); await b.close();
