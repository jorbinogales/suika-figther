import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#char=yonaiker&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
await p.evaluate(`(() => { const a = window.__arena, x = a.player, e = a.enemy; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; const step = n => { for (let i = 0; i < n; i++) a.update(a.time.now + i * 16, 16.7); };
  x.ranks.p2 = 3; x.cds.p2 = 0; x.mana = 999; x.setAim(1, 0); e.x = x.x + 900; x.castPoint = { x: x.x + 230, y: x.y }; x.tryCast('p2'); step(80); e.x = x.x + 230; e.y = x.y; step(14); })()`);
await new Promise(r => setTimeout(r, 250)); await p.screenshot({ path: 'D:/mycowork/game/shot_trap1.png' });
await p.evaluate(`(() => { const a = window.__arena; for (let i = 0; i < 40; i++) a.update(a.time.now + i * 16, 16.7); })()`); await new Promise(r => setTimeout(r, 250)); await p.screenshot({ path: 'D:/mycowork/game/shot_trap2.png' }); await b.close();
