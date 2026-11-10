import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });
await p.goto('http://localhost:5199/#mode=3&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
const run = async (body, name) => { const r = await p.evaluate(`(() => { const a = window.__arena, f = a.player; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; const step = n => { for (let i = 0; i < n; i++) a.update(a.time.now + i * 16, 16.7); }; ${body} })()`); await new Promise(r => setTimeout(r, 500)); await p.screenshot({ path: 'D:/mycowork/game/' + name }); return r; };
console.log(await run("a.champs.forEach(q => { if (q !== f) { q.x = 100; q.y = 100; q.ai = false; } }); f.ai = false; f.x = 1000; f.y = 750; a.cameras.main.stopFollow(); step(2); a.cameras.main.centerOn(1000, 750); return a.zoom + ' ' + a.zoomK + ' walls=' + a.walls.length;", 'shot_lane1.png'));
console.log(await run("a.cameras.main.setZoom(0.45); a.zoom = 0.45; a.cameras.main.centerOn(1600, 750); return 'wide'", 'shot_lane2.png'));
await b.close();
