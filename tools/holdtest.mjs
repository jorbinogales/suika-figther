// Combo pose hold: after a hit the champion keeps the last frame (no idle) until the window runs out: node tools/holdtest.mjs <char> [aimX aimY]
import puppeteer from 'puppeteer-core';
const char = process.argv[2] || 'xeviche', ax = +(process.argv[3] ?? 1), ay = +(process.argv[4] ?? 0);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto(`http://localhost:5173/#char=${char}&train=1&keep=1&noai=1&nofog=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t));
await sleep(2500);
await p.evaluate(([ax, ay]) => { const a = window.__arena, f = a.player, e = a.enemy; e.ai = false; e.maxHp = e.hp = 99999; e.x = f.x + ax * 220; e.y = f.y + ay * 220; f.setAim(ax, ay); f.in = { mx: 0, my: 0, run: false }; }, [ax, ay]);
const snap = () => p.evaluate(() => { const f = window.__arena.player; return { step: f.cstepN, st: f.state, hold: !!f.holdPose, anim: f.spr.anims.currentAnim?.key, frame: f.spr.frame.name, playing: f.spr.anims.isPlaying }; });
const log = [];
await p.evaluate(() => { const f = window.__arena.player; f.cds.basic = 0; f.tryBasic(); });
for (const t of [150, 250, 300, 400, 700]) { await sleep(t === 150 ? 150 : t - [150, 250, 300, 400, 700][[150, 250, 300, 400, 700].indexOf(t) - 1]); log.push(t + 'ms ' + JSON.stringify(await snap())); }
await p.screenshot({ path: 'shot_hold_after1.png', clip: { x: 380, y: 140, width: 520, height: 380 } });
await sleep(900); log.push('+1.6s ' + JSON.stringify(await snap()));   // window over -> idle
await sleep(300); log.push('+1.9s ' + JSON.stringify(await snap()));
console.log(log.join('\n')); await b.close();
