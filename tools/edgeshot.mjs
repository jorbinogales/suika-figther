import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#mode=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
for (const [n, y] of [['top', -150], ['bot', 1600]]) { await p.evaluate(`(() => { const a = window.__arena; a.handleInput = () => {}; a.cameras.main.stopFollow(); a.cameras.main.centerOn(1700, ${y}); a.cameras.main.setZoom(0.75); })()`); await new Promise(r => setTimeout(r, 600)); await p.screenshot({ path: `D:/mycowork/game/shot_edge_${n}.png` }); }
await b.close();
