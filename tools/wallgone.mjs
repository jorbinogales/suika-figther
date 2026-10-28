import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#char=yonaiker&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
console.log(await p.evaluate(`(() => { const a = window.__arena, x = a.player, e = a.enemy; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; const step = n => { for (let i = 0; i < n; i++) a.update(a.time.now + i * 16, 16.7); };
  const out = {}; x.ranks.ult = 1; x.cds.ult = 0; x.mana = 999; x.setAim(1, 0); e.x = x.x + 800; x.castPoint = { x: x.x + 200, y: x.y }; x.tryCast('ult'); step(90); out.obstaclesOn = a.obstacles.length;
  x.barr.segs.forEach(s => a.damage(e, s, 99999, 'physical')); step(60); out.afterDestroy = a.obstacles.length;
  x.cds.ult = 0; x.castPoint = { x: x.x + 200, y: x.y }; x.tryCast('ult'); step(90); out.again = a.obstacles.length; x.barr.t = 999; step(10); out.afterExpire = a.obstacles.length; return JSON.stringify(out); })()`)); await b.close();
