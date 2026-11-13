// AI plays Josué: a local 3v3 with Josué bots on both sides, fast-forwarded ~3 game minutes; counts his casts per form and swaps.
// node tools/josueai.mjs [base]   (needs `npx vite` on 5173)
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://localhost:5173/';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 960, height: 540 } });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('[console] ' + m.text()); });
await p.goto(BASE + '#char=leandro&allies=josue,axel&enemies=josue,jorbi,eliud&nofog=1&keep=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.champs?.length && window.__arena.champs.every(c => c.key !== 'josue' || c.pal), { timeout: 90000 });
const r = await p.evaluate(`(() => { const a = window.__arena; a.audio.play = a.audio.playAll = a.audio.voice = () => {}; a.player.ai = true;
  const js = a.champs.filter(c => c.key === 'josue'), cnt = {};
  js.forEach(j => { const f0 = j.fireJosue.bind(j); j.fireJosue = (k, ab, rank) => { const id = (j.dogForm ? 'dog:' : '') + k; cnt[id] = (cnt[id] || 0) + 1; return f0(k, ab, rank); }; });
  let palDeaths = 0, saves = 0; js.forEach(j => { const s0 = j.josueSave.bind(j); j.josueSave = kk => { const ok = s0(kk); if (ok) saves++; return ok; }; });
  for (let i = 0; i < 60 * 180; i++) { a.update(a.time.now + i * 16, 16.7); if (a.over) break; }
  return JSON.stringify({ t: Math.round(a.gameT), casts: cnt, saves, all: a.champs.map(c => [c.key, c.team, c.level, Math.round(c.x), Math.round(c.y), c.alive ? 1 : 0]), josue: js.map(j => ({ team: j.team, lvl: j.level, ranks: j.ranks, alive: j.alive, dog: j.dogForm, kda: [j.kills, j.deaths, j.assists], pal: !!j.pal?.alive, gold: Math.round(j.gold), items: j.inv.filter(Boolean).length })) }); })()`);
console.log(r); console.log('errors', errs.length ? errs.slice(0, 8) : 'none');
await b.close();
