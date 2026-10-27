import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], defaultViewport: { width: 1600, height: 900 } });
const p = await b.newPage();
p.on('pageerror', e => console.log('[pageerror]', e.message));
p.on('console', m => { if (/rror|warn/i.test(m.text()) && !/GL Driver/.test(m.text())) console.log('[c]', m.text().slice(0, 200)); });
await p.goto('http://localhost:5173/#' + process.argv[2], { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 9000));
console.log(await p.evaluate(process.argv[3]));
await b.close();
