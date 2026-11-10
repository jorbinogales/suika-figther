import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5199/#mode=3&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
const out = await p.evaluate(`(() => {
  const a = window.__arena, f = a.player; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {};
  a.handleInput = () => {}; a.champs.forEach(q => { if (q !== f) { q.x = 100; q.y = 100; q.ai = false; } }); f.ai = false; f.x = 190; f.y = 750;
  let t = 0; const step = n => { for (let i = 0; i < n; i++) { t += 16.7; a.update(a.time.now + t, 16.7); } };
  const rep = () => { const m = a.fighters.filter(q => q.isMinion && q.alive); const L = [0, 1, 2].map(i => [0, 1].map(tm => m.filter(q => q.team === tm && Math.abs(q.laneY - [250, 750, 1250][i]) < 5).length));
    return 'minions[lane][team]=' + JSON.stringify(L) + ' walls=' + a.walls.map(w => Math.round(w.hp) + (w.alive ? '' : 'X')).join(',') + ' towers=' + a.fighters.filter(q => q.isTower && !q.isNexus).map(q => q.alive ? 'ok' : 'X').join(','); };
  const o = [];
  step(60 * 5); o.push('t5 ' + rep());
  step(60 * 40); o.push("t45 " + rep()); step(60 * 80); o.push("t125 " + rep()); step(60 * 120); o.push("t245 " + rep());
  // own team passes, enemy blocked: blue champion walks east across blue wall x=930
  f.x = 880; f.y = 750; f.in = { mx: 1, my: 0, run: true }; a.handleInput = () => { f.in = { mx: 1, my: 0, run: true }; };
  step(60 * 2); o.push('blue champ x after crossing own wall: ' + Math.round(f.x));
  f.team = 1; f.baseTeam = 1; f.x = 1000; f.y = 750; a.handleInput = () => { f.in = { mx: -1, my: 0, run: true }; }; step(60 * 2); o.push('red champ walking west into blue wall x: ' + Math.round(f.x) + ' (wall at 930)');
  return o.join('\\n');
})()`);
console.log(out);
await b.close();
