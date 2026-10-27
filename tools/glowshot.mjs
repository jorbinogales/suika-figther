import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#mode=3&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
await p.evaluate(`(() => { const a = window.__arena; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; })()`); await new Promise(r => setTimeout(r, 800));
await p.evaluate(`(() => { const a = window.__arena, f = a.player, foe = a.champs.find(c => c.baseTeam !== f.baseTeam); foe.hp = 1; a.damage(f, foe, 50, 'true'); })()`);
await new Promise(r => setTimeout(r, 250)); await p.screenshot({ path: 'D:/mycowork/game/shot_glow.png', clip: { x: 440, y: 0, width: 840, height: 60 } }); await b.close();
