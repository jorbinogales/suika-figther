import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#char=junior&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
const run = async (body, name) => { await p.evaluate(`(() => { const a = window.__arena, x = a.player, e = a.enemy; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; const step = n => { for (let i = 0; i < n; i++) a.update(a.time.now + i * 16, 16.7); }; ['p1','p2','p3','ult'].forEach(k => { x.ranks[k] = 2; x.cds[k] = 0; }); x.mana = 9999; e.maxHp = e.hp = 99999; x.setAim(1, 0); ${body} })()`); await new Promise(r => setTimeout(r, 400)); await p.screenshot({ path: 'D:/mycowork/game/' + name }); };
await run("e.x = x.x + 150; e.y = x.y; for (let i = 0; i < 3; i++) { a.basicDmg = true; a.damage(x, e, 10, 'physical'); a.basicDmg = false; } x.tryCast('p3'); step(70);", 'shot_jun1.png');
await run("x.cds.ult = 0; x.castPoint = { x: x.x + 260, y: x.y + 40 }; x.tryCast('ult'); step(150);", 'shot_jun2.png');
await b.close();
