import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader','--use-gl=angle','--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5199/#char=julio&train=1&keep=1&noai=1&nofog=1&br=0000', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500); await p.mouse.click(640, 300);
await p.evaluate(() => { const f = window.__arena.player; f.ranks = { p1: 1, p2: 3, p3: 1, ult: 1 }; f.mana = 999; f.setAim(1, 0); f.tryCast('p2'); });
for (let i = 0; i < 5; i++) { await sleep(450); console.log(await p.evaluate(() => { const f = window.__arena.player; return [Math.round(f.x), f.state, f.anim, !!f.inkFree].join(' '); })); }
console.log(errs.join('\n') || 'no errors'); await b.close();
