import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#mode=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
console.log(await p.evaluate(`(() => { const a = window.__arena; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; a.waveT = 1e9; a.fighters.filter(f => f.isTower && !f.isNexus).forEach(f => { f.x = -999; f.y = -999; });
  const res = []; for (const c of a.camps) for (const team of [0, 1]) { a.fighters = a.fighters.filter(f => !f.path); c.owner = team; c.spawnT = 1e9; a.dropMinions(c, team, c.y - 300); const ms = a.fighters.filter(f => f.path); ms.forEach(m => { m.drop = null; });
    let dead = 0, steps = 0, reached = false; for (let i = 0; i < 60 * 70 && !reached; i++) { a.update(a.time.now + i * 16, 16.7); steps++; if (ms.some(m => m.alive && Math.abs(m.x - (team === 0 ? 2870 : 330)) < 200)) reached = true; }
    const far = ms.map(m => team === 0 ? m.x : 3200 - m.x); res.push(['camp' + c.i, 'team' + team, 'reached ' + reached, 'sec ' + Math.round(steps / 60), 'maxProgress ' + Math.round(Math.max(...far))]); a.fighters.filter(f => f.path).forEach(f => { f.dispose = true; }); }
  return JSON.stringify(res); })()`));
await b.close();
