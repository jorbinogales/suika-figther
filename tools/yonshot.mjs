import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#char=yonaiker&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
await p.evaluate(`(() => { const a = window.__arena, x = a.player, e = a.enemy; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; const step = n => { for (let i = 0; i < n; i++) a.update(a.time.now + i * 16, 16.7); };
  ['p1', 'p2', 'p3', 'ult'].forEach(k => { x.ranks[k] = 2; x.cds[k] = 0; }); x.mana = 9999; x.setAim(1, 0); e.x = x.x + 900; e.y = x.y + 300;
  x.castPoint = { x: x.x + 200, y: x.y - 100 }; x.tryCast('p1'); step(80); x.castPoint = { x: x.x + 120, y: x.y + 140 }; x.tryCast('p2'); step(80); x.castPoint = { x: x.x - 60, y: x.y - 20 }; x.tryCast('p3'); step(80);
  step(40); x.castPoint = { x: x.x + 190, y: x.y, vert: true }; x.tryCast('ult'); step(80); e.x = x.x + 360; e.y = x.y - 90; step(70); })()`);
await new Promise(r => setTimeout(r, 600)); await p.screenshot({ path: 'D:/mycowork/game/shot_yon.png' }); await b.close();
