// node tools/shot.mjs <out.png> "<hash>" <ms> [keys...]   headless screenshot after real-time wait
import puppeteer from 'puppeteer-core';
const [out, hash = '', ms = '2000', ...keys] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--window-size=1600,900'], defaultViewport: { width: 1600, height: 900 } });
const p = await b.newPage();
p.on('console', m => { const t = m.text(); if (!/GL Driver|vite|Phaser v/.test(t)) console.log('[page]', t.slice(0, 200)); });
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#' + hash, { waitUntil: 'load' });
let cast; const first = new Promise(r => (cast = r)); p.on('console', m => /dbg cast/.test(m.text()) && cast());
await Promise.race([first, new Promise(r => setTimeout(r, 6000))]);
for (const k of keys) { await p.keyboard.down(k); await new Promise(r => setTimeout(r, 120)); await p.keyboard.up(k); }
await new Promise(r => setTimeout(r, +ms));
await p.screenshot({ path: out });
await b.close();
