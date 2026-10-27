// two real clients in one room: host simulates, client sees it; client moves, casts and buys
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio', '--autoplay-policy=no-user-gesture-required'], defaultViewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mk = async name => { const c = await b.createBrowserContext(); const p = await c.newPage(); p.on('pageerror', e => console.log(`[${name} pageerror]`, e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) console.log(`[${name} console]`, m.text()); }); await p.goto('http://localhost:5173/', { waitUntil: 'load' }); await sleep(16000); return p; };
const uid = Date.now().toString(36).slice(-4);
const A = await mk('A'), B = await mk('B');
const reg = async (p, n) => { await p.click('[data-tab=register]'); await p.type('input[name=name]', n); await p.type('input[name=email]', `${n}@t.com`); await p.type('input[name=password]', 'secreto1'); await p.click('button[type=submit]'); await sleep(1500); };
await reg(A, 'ana' + uid); await reg(B, 'beto' + uid);
await A.click('[data-a=create]'); await sleep(1200);
const code = await A.$eval('.code', e => e.textContent);
await B.click('[data-a=joinbox]'); await sleep(300); await B.type('#code', code); await B.keyboard.press('Enter'); await sleep(1500);
const jc = (p, q) => p.evaluate(`document.querySelector('${q}').click()`);
await sleep(800); await jc(A, '.cc[data-k=leandro]'); await sleep(600); await jc(B, '.cc[data-k=luis]'); await sleep(800);
await jc(B, '[data-a=ready]'); await sleep(600);
await jc(A, '[data-a=start]'); await sleep(9000);
const st = p => p.evaluate(`(() => { const a = window.__arena; return a ? JSON.stringify({ arena: true, role: a.net?.role, live: a.net?.live, me: a.player.key, units: a.fighters.length, lost: !!a.netLost, ui: !!document.querySelector('#ui') }) : JSON.stringify({ arena: false, ui: !!document.querySelector('#ui') }); })()`);
console.log('before', await st(B));
// 1) transient drop of the client's websocket: the match keeps going and the socket comes back
await B.evaluate(`window.__ws0 = 0; (() => { const n = window.__net; })(); 0`);
await B.evaluate(`import('/src/net.js').then(m => { window.__netm = m.net; m.net.ws.close(); })`); await sleep(500);
console.log('right after drop', await st(B)); await sleep(5000);
console.log('after auto reconnect', await st(B), 'online', await B.evaluate(`window.__netm.online`));
// 2) page refresh (closed tab): must land back in the running match, not in the menu
B.on('console', m => console.log('[B]', m.text().slice(0,160))); await B.reload({ waitUntil: 'load' }); await sleep(26000); console.log("t+26", await B.evaluate(`JSON.stringify({ loading: !!document.querySelector('#loading'), ui: !!document.querySelector('#ui'), home: !!document.querySelector('.home'), txt: document.querySelector('#loading .st')?.textContent })`)); await sleep(6000);
await sleep(6000); console.log('after refresh', await st(B), await B.evaluate(`JSON.stringify({ home: !!document.querySelector('.home'), lobby: !!document.querySelector('.lobby'), login: !!document.querySelector('[data-tab]'), err: document.querySelector('.err')?.textContent, loading: !!document.querySelector('#loading') })`));
console.log('host sees B reconnected', await A.evaluate(`(() => { const r = [...window.__arena.net.remote.values()][0]; return JSON.stringify({ off: r.off, ai: r.f.ai }); })()`));
await B.evaluate(`(() => { const a = window.__arena; a.handleInput = () => {}; a.player.in = { mx: -1, my: 0, run: true }; })()`); const x0 = await A.evaluate(`Math.round(window.__arena.champs.find(c => c.pid !== window.__arena.player.pid).x)`); await sleep(3000);
console.log('B moves again after rejoin: x', x0, '->', await A.evaluate(`Math.round(window.__arena.champs.find(c => c.pid !== window.__arena.player.pid).x)`));
// 3) host's websocket drops briefly: client must NOT leave the match
await A.evaluate(`import('/src/net.js').then(m => { m.net.ws.close(); })`); await sleep(1500);
console.log('B while host reconnecting', await st(B)); await sleep(6000); console.log('B after host back', await st(B));
await b.close();
