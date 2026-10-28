import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message, (e.stack || '').split('\n').slice(0, 4).join(' | '))); p.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 200)); });
await p.goto('http://localhost:5173/#char=yonaiker&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
console.log(await p.evaluate(`(() => { const a = window.__arena, x = a.player, e = a.enemy; a.handleInput = () => {}; a.audio.voice = () => {}; const step = n => { for (let i = 0; i < n; i++) a.update(a.time.now + i * 16, 16.7); };
  e.x = x.x + 250; e.y = x.y; x.setAim(1, 0); const r = x.tryBasic(); step(60); return JSON.stringify({ r, projs: a.projs.length, state: x.state }); })()`)); await b.close();
