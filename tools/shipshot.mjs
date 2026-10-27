import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#mode=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
console.log(await p.evaluate(`(() => { const a = window.__arena; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; a.waveT = 1e9; const c = a.camps[4]; c.owner = 0; c.prog = [1, 0]; c.spawnT = 1e9; a.dropShip(c, 0); a.cameras.main.stopFollow(); a.cameras.main.centerOn(c.x, c.y + 40); a.cameras.main.setZoom(0.6);
  const step = n => { for (let i = 0; i < n; i++) a.update(a.time.now + i * 16, 16.7); }; step(60 * 5.4); window.__s1 = 1; return a.ships.map(s => Math.round(s.y)) + ' camp ' + c.y; })()`));
await new Promise(r => setTimeout(r, 300)); await p.screenshot({ path: 'D:/mycowork/game/shot_ship1.png' });
await p.evaluate(`(() => { const a = window.__arena; for (let i = 0; i < 60 * 1.2; i++) a.update(a.time.now + i * 16, 16.7); })()`); await new Promise(r => setTimeout(r, 300)); await p.screenshot({ path: 'D:/mycowork/game/shot_ship2.png' }); await b.close();
