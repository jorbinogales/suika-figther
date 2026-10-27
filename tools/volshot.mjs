import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#mode=1&keep=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
await p.evaluate(`window.__arena.togglePause()`); await new Promise(r => setTimeout(r, 600));
await p.mouse.click(640 + 60, 360 + 94); await new Promise(r => setTimeout(r, 300));   // click on the music bar
await p.screenshot({ path: 'D:/mycowork/game/shot_pause.png' });
console.log(await p.evaluate(`localStorage.getItem('devbrawl_vol')`)); await b.close();
