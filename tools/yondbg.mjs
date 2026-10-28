import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#char=yonaiker&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
console.log(await p.evaluate(`(() => { const a = window.__arena, x = a.player, e = a.enemy; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; const step = n => { for (let i = 0; i < n; i++) a.update(a.time.now + i * 16, 16.7); };
  const log = []; const od = a.damage.bind(a); a.damage = (s, t, raw, type, dot) => { const r = od(s, t, raw, type, dot); if (t === e) log.push([s?.key, Math.round(raw), Math.round(r)]); return r; };
  e.maxHp = e.hp = 9999; e.ai = false; x.ranks.p1 = 2; x.cds.p1 = 0; x.mana = 9999; x.setAim(1, 0); e.x = x.x + 900; e.y = x.y; x.castPoint = { x: x.x + 250, y: x.y }; x.tryCast('p1'); step(80); e.x = x.x + 420; step(90); return JSON.stringify({ n: log.length, first: log.slice(0, 5), hp: Math.round(e.hp) }); })()`)); await b.close();
