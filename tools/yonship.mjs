import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('console', m => { const t = m.text(); if (/dbg|YON/.test(t)) console.log('LOG', t); }); p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5199/#char=yonaiker&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t));
await sleep(2000);
await p.evaluate(() => { const f = window.__arena.player; f.level = 18; for (const k of ['p1', 'p2', 'p3', 'ult']) f.ranks[k] = 1; f.charge = 100; });
await sleep(6000);
const st = () => p.evaluate(() => { const w = window.__arena, f = w.player; return { bomber: f.bomber?.phase, gun: !!f.gun, cdp2: +(f.cds.p2 || 0).toFixed(1), cdult: +(f.cds.ult || 0).toFixed(1), crates: (w.crates || []).length, aimKey: w.aimKey, state: f.state }; });
console.log('boarded', JSON.stringify(await st()));
await p.evaluate(() => { const w = window.__arena, ob = w.beginAim.bind(w); w.beginAim = a => { console.log('YON beginAim', a, 'locked', w.pc.abilityLocked(a), 'sil', w.pc.silenceT, 'free', w.pc.free, 'state', w.pc.state); return ob(a); }; });
for (const key of ['q', 'f', 'r', 'e']) { await p.keyboard.down(key); await sleep(120); await p.keyboard.up(key); await sleep(500); console.log(key, JSON.stringify(await st())); }
await p.screenshot({ path: 'art/review_8dir/_yonship.png' });
console.log(errs[0] || 'no errors'); await b.close();
