import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#char=yonaiker&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
await p.evaluate(`(() => { const a = window.__arena, x = a.player; ['p1','p2','p3','ult'].forEach(k => { x.ranks[k] = 1; }); a.enemy.x = 100; a.enemy.y = 100; })()`);
const st = () => p.evaluate(`(() => { const a = window.__arena, x = a.player; return JSON.stringify({ dTrap: (a.traps||[]).map(t => Math.round(Math.hypot(t.x - x.x, t.y - x.y))), dHeal: (a.sentinels||[]).map(t => Math.round(Math.hypot(t.x - x.x, t.y - x.y))), n: (a.sentinels||[]).length }); })()`);
await p.mouse.move(900, 400); await new Promise(r => setTimeout(r, 300));
const key = async k => { await p.keyboard.down(k); await new Promise(r => setTimeout(r, 120)); await p.keyboard.up(k); await new Promise(r => setTimeout(r, 300)); };
await key('f'); await p.mouse.move(980, 420); await key('f'); await new Promise(r => setTimeout(r, 900));
for (let i = 0; i < 3; i++) { await p.evaluate(`window.__arena.player.cds.p3 = 0; window.__arena.player.mana = 999`); await key('e'); await p.mouse.move(800 + i * 110, 340 + i * 30); await key('e'); await new Promise(r => setTimeout(r, 900)); }
console.log(await st());
console.log(await p.evaluate(`(() => { const a = window.__arena, x = a.player; x.hp = x.maxHp * 0.4; const s = a.sentinels[0]; x.x = s.x; x.y = s.y; for (let i = 0; i < 6; i++) a.update(a.time.now + i * 16, 16.7); return JSON.stringify({ hpAfter: Math.round(x.hp), max: Math.round(x.maxHp), left: a.sentinels.length }); })()`));
await p.screenshot({ path: 'D:/mycowork/game/shot_heal.png' }); await b.close();
