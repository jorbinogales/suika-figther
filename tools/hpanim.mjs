// Damage ghost + heal strip on the champion bars: node tools/hpanim.mjs
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=hector&mode=5&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(3500);
await p.evaluate(() => { const a = window.__arena, me = a.player, en = a.champs.filter(c => c.baseTeam !== me.baseTeam); a.fighters.forEach(f => { if (f !== me && f !== en[0]) { f.x = 300; f.y = 140; } }); a.aiOn = false; me.x = 1500; me.y = 800; const e = en[0]; e.x = 1560; e.y = 700; e.ai = false; e.stunT = 99; e.hp = e.maxHp; a.selected = e; window.__e = e; });
await sleep(800);
const clip = { x: 830, y: 60, width: 450, height: 100 }, snap = async (n, extra) => { const r = await p.evaluate(() => { const e = window.__e; return `hp=${Math.round(e.hp)} shown=${Math.round(e._hs)} ghost=${Math.round(e._gh)}`; }); console.log(n, r); await p.screenshot({ path: `shot_hpanim_${n}.png`, clip }); };
await p.evaluate(() => { const e = window.__e; e.hp = e.maxHp * 0.5; }); await sleep(60); await snap('1_damage_now');
await sleep(500); await snap('2_ghost_fading'); await sleep(900); await snap('3_ghost_gone');
await p.evaluate(() => { const e = window.__e; e.hp = e.maxHp * 0.9; }); await sleep(60); await snap('4_heal_start'); await sleep(250); await snap('5_heal_mid'); await sleep(900); await snap('6_heal_done');
console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
