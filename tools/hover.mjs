// node tools/hover.mjs <out.png> "<hash>" <x> <y> [clickFirst]   moves the mouse (optionally clicks) then screenshots
import puppeteer from 'puppeteer-core';
const [out, hash, x, y, click] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], defaultViewport: { width: 1600, height: 900 } });
const p = await b.newPage();
p.on('console', m => { const t = m.text(); if (/rror/i.test(t)) console.log('[page]', t.slice(0, 160)); });
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#' + hash, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 3500));
await p.mouse.move(+x, +y); await new Promise(r => setTimeout(r, 300));
if (click) { await p.mouse.click(+x, +y, { delay: 120 }); await new Promise(r => setTimeout(r, 400)); }
await p.screenshot({ path: out });
await b.close();
