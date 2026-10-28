import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#mode=5&char=leandro', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
console.log(await p.evaluate(`(async () => { const a = window.__arena; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; a.player.in = { mx: 0, my: 0, run: false }; a.player.ai = true; let k = 0; const t0 = a.time.now;
  for (let i = 0; i < 100 * 60; i++) a.update(t0 + (k++) * 16, 16.7);
  const c = a.champs.find(f => f.key === 'luis'), out = [];
  const nex = a.fighters.filter(f => f.isNexus).map(n => [n.team, Math.round(n.x), Math.round(n.y), n.alive]); const fo = a.fountains;
  for (let i = 0; i < 12; i++) { for (let j = 0; j < 20; j++) a.update(t0 + (k++) * 16, 16.7); out.push([Math.round(c.x), Math.round(c.y), +c.in.mx.toFixed(2), +c.in.my.toFixed(2), c.state, !!c.retreat, c.aiW && c.aiW.stuck]); }
  return JSON.stringify({ spawn: [c.spawn.x, c.spawn.y], fo, nex, out }); })()`));
await b.close();
