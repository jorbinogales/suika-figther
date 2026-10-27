// Luis walks around; his drones must not jitter (count facing flips / stop-go changes) and must attack the nearest enemy when Luis does not
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#char=luis&mode=3&keep=1&lvl=5&rank=2', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
console.log(await p.evaluate(`(() => { const a = window.__arena; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {};
  const L = a.player; L.ranks.p1 = 2; L.cds.p1 = 0; L.mana = 999; L.tryCast('p1');
  for (let i = 0; i < 120; i++) a.update(a.time.now + i * 16, 16.7);
  const dr = a.fighters.filter(f => f.antivirus && f.owner === L); if (!dr.length) return 'no drones';
  const stat = dr.map(() => ({ flips: 0, toggles: 0, lastF: null, lastM: null, shots: 0 })); dr.forEach((d, i) => { const o = d.tryBasic.bind(d); d.tryBasic = () => { const r = o(); if (r) stat[i].shots++; return r; }; });
  // phase 1: Luis walks back and forth
  let dir = 1, t0 = a.time.now;
  for (let i = 0; i < 900; i++) { if (i % 150 === 0) dir = -dir; L.in = { mx: dir, my: 0, run: i % 300 < 150 }; a.update(t0 + i * 16, 16.7); dr.forEach((d, j) => { const f = d.facing, m = !!(d.in.mx || d.in.my); if (stat[j].lastF !== null && f !== stat[j].lastF) stat[j].flips++; if (stat[j].lastM !== null && m !== stat[j].lastM) stat[j].toggles++; stat[j].lastF = f; stat[j].lastM = m; }); }
  const walk = JSON.stringify(stat.map(s => ({ flips: s.flips, toggles: s.toggles })));
  // phase 2: Luis idle, an enemy minion nearby -> drones must shoot it without Luis attacking
  L.in = { mx: 0, my: 0, run: false }; L.lastTarget = null;
  const e = a.fighters.find(f => f.isMinion && f.team !== L.team && f.alive) || a.enemies[0]; e.x = L.x + 250; e.y = L.y; e.hp = 99999; e.maxHpOverride = 1;
  for (let i = 0; i < 400; i++) { e.x = L.x + 250; e.y = L.y; a.update(t0 + (900 + i) * 16, 16.7); }
  const dbg = dr.map(d => ({ d: Math.round(Math.hypot(d.x - e.x, d.y - e.y)), state: d.state, cd: +d.cds.basic.toFixed(2), alive: d.alive, tgt: !!a.nearestEnemy(d, 420), eAlive: e.alive, eTeam: e.team, dTeam: d.team, free: d.free }));
  return JSON.stringify(dbg) + ' walk ' + walk + ' | shots while Luis idle: ' + JSON.stringify(stat.map(s => s.shots)); })()`));
await b.close();
