import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message, (e.stack || '').split('\n').slice(0, 5).join(' | '))); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[' + m.type() + ']', m.text().slice(0, 300)); });
await p.goto('http://localhost:5173/#char=yonaiker&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
await p.mouse.move(900, 360); await new Promise(r => setTimeout(r, 300));
for (let i = 0; i < 8; i++) { await p.mouse.down(); await new Promise(r => setTimeout(r, 120)); await p.mouse.up(); await new Promise(r => setTimeout(r, 700)); }
await p.keyboard.down('j'); await new Promise(r => setTimeout(r, 2500)); await p.keyboard.up('j');
console.log(await p.evaluate(`JSON.stringify({ ok: !!window.__arena, t: window.__arena && Math.round(window.__arena.gameT * 10) / 10, scenes: window.__arena.game.scene.getScenes(true).map(s => s.scene.key) })`)); await b.close();
