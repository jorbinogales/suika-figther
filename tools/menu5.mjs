import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'], defaultViewport: { width: 1600, height: 900 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 9000));
await p.mouse.click(150 * 1.25 + 40 + 2 * 160 * 1.25 + 70, 58 * 1.25 + 20 * 1.25 + 18 * 1.25 + 40);   // mode buttons row: click "5 vs 5"
await new Promise(r => setTimeout(r, 600)); await p.screenshot({ path: process.argv[2] }); await b.close();
