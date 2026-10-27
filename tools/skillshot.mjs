import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const shot = async (hash, body, name) => { const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message)); await p.goto('http://localhost:5173/#' + hash, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
  await p.evaluate(`(() => { const a = window.__arena; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; const step = n => { for (let i = 0; i < n; i++) a.update(a.time.now + i * 16, 16.7); }; ${body} })()`);
  await new Promise(r => setTimeout(r, 700)); await p.screenshot({ path: 'D:/mycowork/game/' + name }); await p.close(); };
await shot('char=leandro&train=1&keep=1&noai=1', `const x = a.player, e = a.enemy; x.ranks.p2 = 3; x.cds.p2 = 0; x.mana = 999; x.setAim(1, 0); e.x = x.x + 380; e.y = x.y; x.tryCast('p2'); step(52);`, 'shot_sk_leandro.png');
await shot('char=axel&train=1&keep=1&noai=1', `const x = a.player, e = a.enemy; x.ranks.p3 = 3; x.cds.p3 = 0; x.mana = 999; x.setAim(1, 0); e.x = x.x + 360; e.y = x.y + 40; x.castPoint = { x: x.x + 300, y: x.y }; x.tryCast('p3'); step(45);`, 'shot_sk_axel.png');
await shot('mode=3&keep=1&noai=1&nofog=1', `a.player.ai = true; step(60 * 9); const jr = a.champs.find(c => c.key === 'jorbi') || a.player; jr.ranks.ult = 1; jr.cds.ult = 0; jr.mana = 999; jr.tryCast('ult'); step(60 * 1.1);`, 'shot_sk_jorbi.png');
await b.close();
