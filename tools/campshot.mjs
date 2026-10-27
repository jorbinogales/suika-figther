import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#camp=0&mode=3&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
const run = async (body, name) => { await p.evaluate(`(() => { const a = window.__arena, f = a.player; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; const step = n => { for (let i = 0; i < n; i++) a.update(a.time.now + i * 16, 16.7); }; const c = a.camps[0]; ${body} })()`); await new Promise(r => setTimeout(r, 500)); await p.screenshot({ path: 'D:/mycowork/game/' + name }); };
await run("a.champs.forEach(q => { if (q !== f) { q.x = 100; q.y = 100; q.ai = false; } }); f.ai = false; f.x = c.x - 20; f.y = c.y; a.cameras.main.stopFollow(); step(60 * 4); a.cameras.main.centerOn(c.x, c.y - 120);", 'shot_camp1.png');
await run("step(60 * 15.5); a.cameras.main.centerOn(c.x, c.y - 120);", 'shot_camp2.png');
await b.close();
