import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message, (e.stack || '').split('\n')[1]));
await p.goto('http://localhost:5173/#char=hector&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 20000));
console.log(await p.evaluate(`(async () => { const a = window.__arena, x = a.player, e = a.enemy; e.ai = false; e.maxHp = e.hp = 99999; x.ranks.ult = 2; x.cds.ult = 0; x.mana = 999; e.x = 2500; e.y = 700; x.setAim(1, 0); const sleep = t => new Promise(r => setTimeout(r, t)); const out = {};
  x.tryCast('ult'); await sleep(800); let p0 = x.x; out.ride = !!x.ride; await sleep(1000); out.v1 = Math.round(x.x - p0); p0 = x.x; await sleep(1000); out.v2 = Math.round(x.x - p0);
  out.skin = x.skin; out.x = Math.round(x.x); out.basicBlocked = x.tryBasic() === false; await sleep(8500); out.ended = !x.ride; out.skin2 = x.skin; return JSON.stringify(out); })()`));
await b.close();
