import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#char=yonaiker&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
console.log(await p.evaluate(`(() => { const a = window.__arena, x = a.player, e = a.enemy; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; const step = n => { for (let i = 0; i < n; i++) a.update(a.time.now + i * 16, 16.7); };
  x.ranks.ult = 1; x.ranks.p1 = 1; x.cds.ult = 0; x.cds.p1 = 0; x.mana = 999; x.setAim(1, 0); e.x = x.x + 1100; x.castPoint = { x: x.x + 200, y: x.y }; x.tryCast('p1'); step(90); x.cds.ult = 0; x.castPoint = { x: x.x + 200, y: x.y + 120 }; x.tryCast('ult'); step(90);
  const units = a.fighters.filter(f => f.def.static), before = units.map(u => [Math.round(u.x), Math.round(u.y)]);
  x.x += 1000; x.y -= 200; step(60 * 4); e.x = units[0].x + 300; e.y = units[0].y; step(60 * 3);
  return JSON.stringify({ count: units.length, moved: units.map((u, i) => Math.round(Math.hypot(u.x - before[i][0], u.y - before[i][1]))) }); })()`)); await b.close();
