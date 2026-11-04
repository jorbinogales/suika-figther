// Junior Q in training with REAL input (Q, move the mouse over the enemy, click) at the default positions
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=junior&enemy=xeviche&train=1&keep=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(3000);
const st = await p.evaluate(() => { const a = window.__arena, f = a.player, e = a.enemy; f.ranks.p1 = 1; f.cds.p1 = 0; f.mana = f.maxMana; e.ranks.p2 = 0; return { me: [Math.round(f.x), Math.round(f.y)], en: [Math.round(e.x), Math.round(e.y)], ai: e.ai, dist: Math.round(Math.hypot(e.x - f.x, e.y - f.y)) }; });
console.log(JSON.stringify(st));
const sc = await p.evaluate(() => { const a = window.__arena, e = a.enemy, c = a.cameras.main; return { x: (e.x - c.worldView.x) * c.zoom, y: (e.y - 40 - c.worldView.y) * c.zoom }; });
await p.mouse.move(sc.x, sc.y); await sleep(200); await p.keyboard.down('q'); await sleep(120); await p.keyboard.up('q'); await sleep(200); console.log('aimKey', await p.evaluate(() => window.__arena.aimKey), 'cd', await p.evaluate(() => window.__arena.player.cds.p1)); await p.mouse.down(); await sleep(60); await p.mouse.up(); await sleep(60); console.log('after click aimKey', await p.evaluate(() => [window.__arena.aimKey, window.__arena.player.state, window.__arena.player.cds.p1]));
const rows = [];
for (let i = 0; i < 16; i++) { await sleep(100); rows.push(await p.evaluate(i => { const a = window.__arena, f = a.player, e = a.enemy; return `${(i + 1) * 100}ms me.x=${Math.round(f.x)} enemy x=${Math.round(e.x)} y=${Math.round(e.y)} key=${e.key} arepa=${e.arepaUp ? 1 : 0}/${(e.arepaGrace||0).toFixed(1)} stunT=${e.stunT.toFixed(2)} carried=${(e.carriedT||0).toFixed(2)} state=${e.state} grabbed=${(a.lunges || []).map(L => L.grabbed.length).join()}`; }, i)); }
console.log(rows.join('\n')); console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
