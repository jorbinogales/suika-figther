// fast-forward a full AI match in the page and report behaviour stats
import puppeteer from 'puppeteer-core';
const [hash, seconds = '120'] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#' + hash, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 9000));
const out = await p.evaluate(`(async () => { const a = window.__arena; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {};
  const casts = {}, deaths = {}; a.champs.forEach(c => { const o = c.tryCast.bind(c); c.tryCast = k => { const r = o(k); if (r) casts[c.key + ':' + k] = (casts[c.key + ':' + k] || 0) + 1; return r; }; const d = c.die.bind(c); c.die = k => { deaths[c.key + c.team] = (deaths[c.key + c.team] || 0) + 1; return d(k); }; });
  a.player.in = { mx: 0, my: 0, run: false }; a.player.ai = true;   // let the AI play every champion
  const N = ${seconds} * 60, t0 = a.time.now; for (let i = 0; i < N; i++) { a.update(t0 + i * 16, 16.7); }
  const L = c => c.key + '(' + c.team + ') L' + c.level + ' hp' + Math.round(c.hp / c.maxHp * 100) + '% ' + (c.alive ? 'x' + Math.round(c.x) : 'DEAD') + (c.retreat ? ' retreat' : '');
  return JSON.stringify({ time: Math.round(a.gameT), champs: a.champs.map(L), casts, deaths, towersAlive: a.fighters.filter(f => f.isTower && !f.isNexus && f.alive).length, minions: a.fighters.filter(f => f.isMinion && f.alive).length, over: a.over && a.over.winner }, null, 1); })()`);
console.log(out); await b.close();
