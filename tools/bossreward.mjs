import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader','--use-gl=angle','--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const sleep = t => new Promise(r => setTimeout(r, t));
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:5199/#char=luis&noai=1&nofog=1&keep=1&boss=robot&bt=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.bosses, { timeout: 90000 }); await sleep(2000);
// beast + captain spawn directly, kill them, read rewards
for (const k of ['beast', 'captain']) {
  await p.evaluate(k => { const w = window.__arena; w.bossSpawn(k); }, k); await sleep(500);
  const r = await p.evaluate(k => { const w = window.__arena, f = w.bosses[k].f, me = w.player, g0 = me.gold, pk0 = JSON.stringify(me.perm); w.damage(me, f, 1e7, 'true'); return { g0, pk0 }; }, k); await sleep(1500);
  console.log(k, r, await p.evaluate(() => { const w = window.__arena, me = w.player; return { gold: me.gold, perm: me.perm, elite: w.eliteT }; }));
}
// elite wave check
await p.evaluate(() => { const w = window.__arena; w.waveT = 0.1; }); await sleep(1500);
console.log('elite units', await p.evaluate(() => window.__arena.fighters.filter(f => f.elite).map(f => f.key + ':' + f.team)));
// robot: wait for it to land and kill it
await p.waitForFunction(() => window.__arena.bosses.robot.f, { timeout: 30000 }); await sleep(500);
await p.evaluate(() => { const w = window.__arena; w.damage(w.player, w.bosses.robot.f, 1e8, 'true'); }); await sleep(1200);
console.log('pick', await p.evaluate(() => JSON.stringify(window.__arena.bossPick?.cards)));
await p.screenshot({ path: 'art/review_8dir/_boss_pick.png' });
await p.keyboard.down('Digit1'); await sleep(150); await p.keyboard.up('Digit1'); await sleep(500);
console.log('after', await p.evaluate(() => { const me = window.__arena.player; return JSON.stringify({ buffs: me.buffs, bonus: me.bonus, pick: !!window.__arena.bossPick, walls: window.__arena.obstacles.filter(o => o.wall).length, ap: me.ap }); }));
console.log('errors:', [...new Set(errs)].slice(0, 6).join('\n') || 'none'); await b.close();
