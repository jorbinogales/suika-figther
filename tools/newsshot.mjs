// Launcher home screen (news + action bar): node tools/newsshot.mjs [width] [height]
import puppeteer from 'puppeteer-core';
const W = +(process.argv[2] || 1280), H = +(process.argv[3] || 720);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: W, height: H } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/?r=' + Date.now(), { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 6000));
const em = `t${Date.now()}@test.dev`;
await p.evaluate(async em => { const r = await fetch('/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Tester' + (Date.now() % 1000), email: em, password: 'secret123' }) }); const j = await r.json().catch(() => ({})); if (j.token) localStorage.setItem('devbrawl_session', JSON.stringify({ token: j.token, user: j.user })); return j; }, em).then(j => console.log('register', JSON.stringify(j).slice(0, 120)));
await p.reload({ waitUntil: 'load' }); await new Promise(r => setTimeout(r, 6000));
console.log('home?', await p.evaluate(() => !!document.querySelector('.home .dock')));
await p.screenshot({ path: `shot_news_${W}.png` });
await p.click('.ntg'); await new Promise(r => setTimeout(r, 300)); console.log('details open:', await p.evaluate(() => !document.querySelector('.nw ul').hidden)); await p.screenshot({ path: `shot_news_open_${W}.png` });
console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
