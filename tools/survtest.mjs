import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader','--use-gl=angle','--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await p.goto('http://localhost:5199/#surv=1&char=' + (process.argv[2] || 'luis'), { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.sv, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(3000);
const st = () => p.evaluate(() => { const w = window.__arena, s = w.sv; return JSON.stringify({ wave: s.wave, phase: s.phase, alive: s.alive, q: s.queue.length, kills: s.kills, picks: s.picks, pick: !!s.pick, cards: s.pick?.cards.map(c => c.type + ':' + (c.id || c.k + c.b)), lvl: w.player.level, hp: Math.round(w.player.hp), over: !!w.over }); });
console.log('start', await st());
await p.screenshot({ path: 'art/review_8dir/_surv_pick.png' });
// pick first card with key 1
await p.mouse.move(400,400); await sleep(200); await p.keyboard.down('Digit1'); await sleep(150); await p.keyboard.up('Digit1'); await sleep(400); console.log('after pick', await st());
for (let i = 0; i < 6; i++) { await sleep(4000); console.log(await st()); if (await p.evaluate(() => !!window.__arena.sv.pick)) { await p.keyboard.press('Digit2'); await sleep(300); } }
await p.screenshot({ path: 'art/review_8dir/_surv_fight.png' });
console.log('errors:', [...new Set(errs)].slice(0, 8).join('\n') || 'none'); await b.close();
