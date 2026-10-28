import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#char=junior&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 20000));
await p.evaluate(`(() => { const a = window.__arena, x = a.player; x.ranks.p2 = 3; x.cds.p2 = 0; a.enemy.x = x.x + 900; x.setAim(1, 0); a.beginAim('p2'); })()`);
await new Promise(r => setTimeout(r, 150)); await p.screenshot({ path: 'shot_jf1.png' });
await new Promise(r => setTimeout(r, 200)); await p.screenshot({ path: 'shot_jf2.png' });
await new Promise(r => setTimeout(r, 300)); await p.screenshot({ path: 'shot_jf3.png' }); await b.close();
