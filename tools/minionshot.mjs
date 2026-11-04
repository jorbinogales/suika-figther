// Minion rewards + last-hit indicator + scoreboard: node tools/minionshot.mjs
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=xeviche&mode=5&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2000);
await p.evaluate(() => { const a = window.__arena; a.waveT = 0; }); await sleep(7000);
const info = await p.evaluate(() => { const a = window.__arena, me = a.player, mins = a.fighters.filter(f => f.isMinion && f.baseTeam !== me.baseTeam && f.alive); return { minions: mins.length, mine: a.fighters.filter(f => f.isMinion && f.baseTeam === me.baseTeam).length }; });
console.log(JSON.stringify(info));
// put an enemy minion next to the player: hp low enough for one basic attack, plus one that is not
const set = await p.evaluate(() => {
  const a = window.__arena, me = a.player, mins = a.fighters.filter(f => f.isMinion && f.baseTeam !== me.baseTeam && f.alive); if (mins.length < 2) return null;
  me.x = 1600; me.y = 760; const dmg = me.nextBasicDmg(mins[0]); mins[0].x = me.x + 110; mins[0].y = me.y - 20; mins[0].hp = Math.max(1, dmg - 2); mins[1].x = me.x + 110; mins[1].y = me.y + 50; mins[1].hp = mins[1].maxHp;
  a.fighters.forEach(f => { if (f !== me && f !== mins[0] && f !== mins[1]) { f.x = f.x < 1600 ? 300 : 2900; f.y = 150; } }); me.xp = 0; me.gold = 0; const al = a.champs.find(c => c !== me && c.baseTeam === me.baseTeam && c.alive); al.x = me.x - 100; al.y = me.y; al.xp = 0; al.gold = 0; window.__t = { me, al, m: mins[0], dmg }; return { dmg: Math.round(dmg), hp: Math.round(mins[0].hp), maxHp: mins[0].maxHp };
});
console.log('setup', JSON.stringify(set)); await sleep(500);
await p.evaluate(() => { const a = window.__arena; a.zoom = 2; a.snapZoom = true; a.fighters.forEach(f => { if (f.isChamp && f !== window.__t.me) f.alive && (f.x = 3000); }); }); await sleep(400);
await p.screenshot({ path: 'shot_lasthit.png', clip: { x: 340, y: 120, width: 600, height: 400 } });
const res = await p.evaluate(async () => { const { me, al, m } = window.__t; const a = window.__arena; a.basicDmg = true; a.damage(me, m, 9999, 'physical'); a.basicDmg = false; await new Promise(r => setTimeout(r, 300)); return { killerXp: me.xp, killerGold: Math.round(me.gold), allyXp: al.xp, allyGold: Math.round(al.gold) }; });
console.log('after kill', JSON.stringify(res));
console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
