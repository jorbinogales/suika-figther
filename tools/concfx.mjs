import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1366, height: 768 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 25000));
const w = t => new Promise(r => setTimeout(r, t));
await p.evaluate(`document.querySelector('[data-a=practice]')?.click()`); await w(1500);
await p.evaluate(`document.querySelector('[data-k=luis]')?.click()`); await w(500);
await p.evaluate(`document.querySelector('[data-a=lock]')?.click()`); await w(250);
await p.screenshot({ path: 'shot_fx.png' }); console.log(await p.evaluate(`!!document.querySelector('.panel.pick.fx .glt')`)); await b.close();
