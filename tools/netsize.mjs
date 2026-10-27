import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#mode=5&keep=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
console.log(await p.evaluate(`(async () => { const a = window.__arena; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; a.player.ai = true;
  const { NetGame } = await import('/src/netgame.js'); const ng = Object.create(NetGame.prototype); ng.w = a;
  const out = []; const step = n => { const t = performance.now(); for (let i = 0; i < n; i++) a.update(a.time.now + i * 16, 16.7); return (performance.now() - t) / n; };
  for (const secs of [30, 120, 240]) { const ms = step(secs * 60 - (out.length ? out.at(-1).t * 60 : 0) || 60); const t0 = performance.now(); const snap = { k: 'snap', f: a.fighters.map(f => ng.packF(f)), m: [], g: 0 }, js = JSON.stringify(snap); const pack = performance.now() - t0;
    out.push({ t: secs, fighters: a.fighters.length, bytes: js.length, packMs: +pack.toFixed(2), updateMs: +ms.toFixed(2), champBytes: JSON.stringify(a.champs.map(f => ng.packF(f))).length }); }
  return JSON.stringify(out, null, 1); })()`));
await b.close();
