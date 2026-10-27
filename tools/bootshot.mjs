import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
const cdp = await p.createCDPSession(); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 30, downloadThroughput: 4 * 1024 * 1024, uploadThroughput: 1024 * 1024 });
await p.setCacheEnabled(false);
p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
const shots = [];
for (let i = 0; i < 4; i++) { await new Promise(r => setTimeout(r, 2500)); const st = await p.evaluate(`(() => { const e = document.querySelector('#loading'); return e ? e.querySelector('.bar i').style.width + ' | ' + e.querySelector('.st').textContent : 'no overlay, launcher=' + !!document.querySelector('#ui'); })()`).catch(() => 'n/a'); console.log(i, st); if (i === 1) await p.screenshot({ path: 'D:/mycowork/game/shot_boot.png' }); }
await b.close();
