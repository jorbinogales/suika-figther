import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#char=yonaiker&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
await p.evaluate(`(() => { const x = window.__arena.player; ['p1','p2','p3','ult'].forEach(k => { x.ranks[k] = 1; }); })()`);
const pos = () => p.evaluate(`(() => { const a = window.__arena, x = a.player; return JSON.stringify({ me: [Math.round(x.x), Math.round(x.y)], aim: a.aimKey, sentries: a.fighters.filter(f => f.key === 'sentry').map(s => [Math.round(s.x), Math.round(s.y)]), traps: (a.traps || []).map(t => [Math.round(t.x), Math.round(t.y)]), sentinels: (a.sentinels || []).map(t => [Math.round(t.x), Math.round(t.y)]), barr: x.barr ? x.barr.segs.map(s => [Math.round(s.x), Math.round(s.y)]) : null }); })()`);
await p.mouse.move(850, 360); await new Promise(r => setTimeout(r, 300));
for (const k of ['q', 'f', 'e', 'r']) { await p.keyboard.down(k); await new Promise(r => setTimeout(r, 150)); await p.keyboard.up(k); await new Promise(r => setTimeout(r, 250)); const mid = await p.evaluate(`window.__arena.aimKey`); await p.mouse.move(820 + Math.random() * 30, 340 + Math.random() * 30); await p.keyboard.down(k); await new Promise(r => setTimeout(r, 150)); await p.keyboard.up(k); await new Promise(r => setTimeout(r, 1600)); console.log(k, 'aim after 1st press:', mid, await pos()); }
await b.close();
