import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio', '--autoplay-policy=no-user-gesture-required'], defaultViewport: { width: 1000, height: 600 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message)); p.on('console', m => { if (/decod|audio/i.test(m.text()) && m.type() !== 'log') console.log('[console]', m.text()); });
await p.goto('http://localhost:5173/#mode=1&keep=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 20000));
console.log(await p.evaluate(`(() => { const a = window.__arena, m = a.cache.json.get('sfx'), bad = []; let n = 0; for (const k in m) for (const f of m[k]) { n++; if (!a.cache.audio.exists('sfx_' + f)) bad.push(f); } return JSON.stringify({ total: n, notDecoded: bad.slice(0, 15), count: bad.length }); })()`));
await b.close();
