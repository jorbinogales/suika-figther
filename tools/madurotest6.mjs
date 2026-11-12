import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader','--use-gl=angle','--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5199/#char=maduro&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(5000); await p.mouse.click(640, 300); await sleep(500);
await p.evaluate(() => { const f = window.__arena.player; f.ranks = { p1: 0, p2: 1, p3: 0, ult: 0 }; });
await sleep(2500);
console.log(await p.evaluate(() => { const f = window.__arena.player; return JSON.stringify({ guards: f.guards?.length, gt: f.guardT, cast: f.tryCast('p2') }); }));
await p.screenshot({ path: 'art/review_8dir/_maduro_pas.png' });
// recall: start far from base, then move cancels
await p.evaluate(() => { const f = window.__arena.player; f.x += 1500; f.startRecall(); });
await sleep(600); console.log('recall on', await p.evaluate(() => !!window.__arena.player.recall));
await p.keyboard.down('KeyD'); await sleep(400); await p.keyboard.up('KeyD');
console.log('recall after move', await p.evaluate(() => !!window.__arena.player.recall));
console.log(errs.join('\n') || 'no errors'); await b.close();
