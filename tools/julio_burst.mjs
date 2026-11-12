import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader','--use-gl=angle','--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5199/#char=julio&train=1&keep=1&noai=1&nofog=1&br=1000', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500); await p.mouse.click(640, 300);
await p.evaluate(() => { const f = window.__arena.player; f.ranks = { p1: 1, p2: 0, p3: 0, ult: 0 }; f.mana = 999; f.setAim(1, 0); console.log('v', f.def.abilities.p1.v, f.tryCast('p1')); window.__f = f; });
p.on('console', m => console.log('page:', m.text()));
for (let i = 0; i < 9; i++) { await sleep(450); console.log(await p.evaluate(() => { const f = window.__arena.player; return [f.state, f.curName, f.spr.anims.isPlaying, !!f.burst].join(' '); })); }
console.log(errs.join('\n') || 'no errors'); await b.close();
