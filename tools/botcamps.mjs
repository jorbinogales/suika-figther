import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message, (e.stack || '').split('\n')[1]));
await p.goto('http://localhost:5173/#' + (process.argv[2] || 'mode=5&char=leandro'), { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
const out = await p.evaluate(`(async () => { const a = window.__arena; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {};
  a.player.in = { mx: 0, my: 0, run: false }; a.player.ai = true; const base = {}, samples = []; const t0 = a.time.now; let k = 0;
  for (let s = 0; s < ${process.argv[3] || 240}; s++) { for (let i = 0; i < 60; i++) a.update(t0 + (k++) * 16, 16.7);
    a.champs.forEach(c => { if (c.alive && a.inBase(c)) base[c.key + c.team] = (base[c.key + c.team] || 0) + 1; });
    if (s % 40 === 0) samples.push({ t: s, camps: a.camps.map(c => c.owner === null ? '-' : c.owner).join(''), pos: a.champs.map(c => c.key[0] + c.team + ':' + (c.alive ? Math.round(c.x) + ',' + Math.round(c.y) : 'D')).join(' ') }); }
  const dbg = a.champs.filter(c => c.alive && c.team === 0).map(c => ({ k: c.key, x: Math.round(c.x), y: Math.round(c.y), hp: Math.round(c.hp / c.maxHp * 100), retreat: !!c.retreat, shop: !!c.wantShop, leave: Math.round(c.forceLeave || 0), baseT: Math.round(c.baseT || 0), det: c.aiW && +c.aiW.det.toFixed(1), state: c.state, stun: +c.stunT.toFixed(1), root: c.rootT, inBase: a.inBase(c), mana: Math.round(c.mana), gold: Math.round(c.gold) }));
  return JSON.stringify({ dbg, time: Math.round(a.gameT), secondsInBase: base, samples, camps: a.camps.map(c => ({ owner: c.owner, prog: c.prog.map(v => +v.toFixed(2)) })) }); })()`);
console.log(out); await b.close();
