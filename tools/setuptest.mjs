import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#char=xeviche&train=1&keep=1&noai=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
console.log(await p.evaluate(`(() => { const a = window.__arena, x = a.player, e = a.enemy; a.audio.play = () => {}; a.audio.playAll = () => {}; x.ranks.p3 = 1; x.setupStacks = 0; e.hp = e.maxHp = 1e6;
  const out = []; for (let i = 0; i < 9; i++) { a.basicDmg = true; a.damage(x, e, 5, 'physical'); a.basicDmg = false; out.push(x.setupStacks); }
  for (let i = 0; i < 20; i++) a.update(a.time.now + i * 16, 16.7); const t0 = x.setupStacks; for (let i = 0; i < 60 * 15; i++) a.update(a.time.now + i * 16, 16.7);
  return JSON.stringify({ stacksPerHit: out, noTimeGain: x.setupStacks === t0, rank1Interval: x.def.abilities.p3.interval }); })()`));
await b.close();
