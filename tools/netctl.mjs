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
// make Luis (client B) able to ult, put the host champion next to him and cast
await A.evaluate(`(() => { const a = window.__arena, luis = a.champs.find(c => c.key === 'luis'), me = a.player; luis.ranks.ult = 1; luis.cds.ult = 0; luis.mana = luis.maxMana; luis.level = 4; me.x = luis.x - 150; me.y = luis.y; a.handleInput = () => {}; })()`);
await sleep(1500);
await B.evaluate(`(() => { const a = window.__arena, p = a.player, e = a.champs.find(c => c !== p); a.handleInput = () => {}; p.castPoint = { x: e.x, y: e.y + e.def.height * 0.6 }; p.tryCast('ult'); })()`);
await sleep(3000);
const st = p => p.evaluate(`(() => { const a = window.__arena; return JSON.stringify({ control: a.control && { mode: a.control.mode, luis: a.control.luis.key, target: a.control.target.key, t: +a.control.t.toFixed(1) }, ctrl: a.ctrl && a.ctrl.key, pc: a.pc.key, me: a.player.key + '@' + Math.round(a.player.x), meAway: a.player.away }); })()`);
console.log('host', await st(A)); console.log('client(Luis)', await st(B));
// the controller (B) walks: the controlled champion (host's Leandro) must move, the host's own input must be ignored
const before = await A.evaluate(`Math.round(window.__arena.player.x)`);
await B.evaluate(`(() => { const a = window.__arena; a.pc.in = { mx: -1, my: 0, run: true }; a.handleInput = () => { a.pc.in = { mx: -1, my: 0, run: true }; }; })()`);
await sleep(3000);
console.log('Leandro x before/after', before, await A.evaluate(`Math.round(window.__arena.player.x)`), '| client sees controlled at', await B.evaluate(`Math.round(window.__arena.ctrl ? window.__arena.ctrl.x : -1)`));
console.log('host after', await st(A)); console.log('client after', await st(B));
await B.screenshot({ path: 'D:/mycowork/game/shot_ctl_B.png' });
await b.close();
