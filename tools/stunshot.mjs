import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#char=leandro&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 20000));
await p.evaluate(`(() => { const a = window.__arena, x = a.player, e = a.enemy; e.ai = false; e.x = x.x + 250; e.y = x.y; e.arepaGrace = 0; e.cds.p2 = 99; e.stun(8); })()`);
await new Promise(r => setTimeout(r, 500)); await p.screenshot({ path: 'shot_stun.png' }); await b.close();
