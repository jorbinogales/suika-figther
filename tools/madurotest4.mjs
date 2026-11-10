import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5199/#char=maduro&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
await p.evaluate(async () => { const w = window.__arena, f = w.player, e = w.enemy; f.level = 18; f.mana = f.maxMana = 999; for (const k of ['p1','p2','p3','ult']) f.ranks[k] = 3; e.ai = false; e.x = f.x + 260; e.y = f.y + 40; e.maxHp = e.hp = 99999;
  f.cds = { p1: 0, p2: 0, p3: 0, ult: 0, basic: 0 }; f.tryCast('p2'); await new Promise(r => setTimeout(r, 800)); f.cds.p3 = 0; f.castPoint = { x: f.x + 200, y: f.y + 40 }; f.tryCast('p3'); });
await sleep(9000); await p.screenshot({ path: 'art/review_8dir/_maduro4.png' }); console.log(errs.slice(0,3).join('\n') || 'no errors'); await b.close();
