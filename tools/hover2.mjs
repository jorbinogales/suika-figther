import puppeteer from 'puppeteer-core';
const [out, hash, js, x, y] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], defaultViewport: { width: 1600, height: 900 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#' + hash, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 9000));
await p.evaluate(js); await p.mouse.move(+x, +y); await new Promise(r => setTimeout(r, 500)); await p.screenshot({ path: out }); await b.close();
