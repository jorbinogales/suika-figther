import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#mode=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
await p.evaluate(`(() => { const a = window.__arena; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; a.waveT = 17; a.camps[0].owner = 0; a.camps[0].prog = [1, 0]; a.camps[0].spawnT = 11; a.cameras.main.stopFollow(); a.cameras.main.centerOn(700, 400); a.cameras.main.setZoom(0.7); for (let i = 0; i < 5; i++) a.update(a.time.now + i * 16, 16.7); })()`);
await new Promise(r => setTimeout(r, 500)); await p.screenshot({ path: 'D:/mycowork/game/shot_timer.png' }); await b.close();
