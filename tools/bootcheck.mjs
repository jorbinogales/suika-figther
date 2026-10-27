import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
for (const url of ['http://localhost:5173/', 'http://localhost:5173/#mode=1&keep=1']) {
  const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message)); await p.goto(url, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
  console.log(url, await p.evaluate(`JSON.stringify({ overlay: !!document.querySelector('#loading'), launcher: !!document.querySelector('#ui'), arena: !!window.__arena })`)); await p.close();
}
await b.close();
