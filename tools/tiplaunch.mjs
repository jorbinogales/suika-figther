import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1366, height: 768 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 25000));
const w = t => new Promise(r => setTimeout(r, t));
await p.evaluate(`document.querySelector('[data-a=practice]')?.click()`); await w(1500);
await p.evaluate(`document.querySelector('[data-k=leandro]')?.click()`); await w(700);
const box = await p.evaluate(`(() => { const r = document.querySelectorAll('.abi')[0].getBoundingClientRect(); return [r.x + 20, r.y + 20]; })()`);
await p.mouse.move(box[0], box[1]); await w(500); await p.screenshot({ path: 'shot_tipl.png' }); await b.close();
