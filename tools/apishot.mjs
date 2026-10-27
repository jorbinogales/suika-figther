// node tools/apishot.mjs <out.png> "<hash>" "<js to run in page>" [waitMs]
import puppeteer from 'puppeteer-core';
const [out, hash, js, wait = '600'] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], defaultViewport: { width: 1600, height: 900 } });
const p = await b.newPage();
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#' + hash, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 9000));
await p.mouse.move(1000, 430);
console.log(await p.evaluate(js));
await new Promise(r => setTimeout(r, +wait));
await p.screenshot({ path: out });
await b.close();
