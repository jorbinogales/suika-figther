// range arrow + TAB swap: checks overhead bars still draw after switching champion
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], defaultViewport: { width: 1600, height: 900 } });
const p = await b.newPage();
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#px=1500&gap=300&noai=1&wave=999', { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 3500));
await p.mouse.move(1100, 410); await new Promise(r => setTimeout(r, 300));
await p.screenshot({ path: process.argv[2] + '_a.png' });
await p.keyboard.press('Tab', { delay: 150 });
await new Promise(r => setTimeout(r, 2500));
await p.mouse.move(1100, 410); await new Promise(r => setTimeout(r, 300));
await p.screenshot({ path: process.argv[2] + '_b.png' });
console.log(await p.evaluate(() => ({ player: window.__arena.player.key, gfxAlive: !!window.__arena.gfx && !!window.__arena.gfx.scene })));
await b.close();
