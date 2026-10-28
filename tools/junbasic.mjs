import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message, (e.stack || '').split('\n')[1]));
await p.goto('http://localhost:5173/#char=junior&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 20000));
console.log(await p.evaluate(`(async () => { const a = window.__arena, x = a.player, e = a.enemy; e.maxHp = e.hp = 99999; e.x = x.x + 60; e.y = x.y; x.setAim(1, 0); const out = [];
  for (let i = 0; i < 6; i++) { x.cds.basic = 0; x.state = 'idle'; x.tryBasic(); await new Promise(r => setTimeout(r, 900)); out.push([e.fist ? e.fist.n : 0, +e.stunT.toFixed(1)]); e.stunT = 0; }
  return JSON.stringify(out); })()`));
await b.close();
