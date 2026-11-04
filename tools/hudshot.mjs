// 5v5 HUD check: minimap faces + allies row (one dead), dead-player shopping, assist gold: node tools/hudshot.mjs
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=xeviche&mode=5&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(4000);
await p.evaluate(() => { const a = window.__arena, me = a.player, al = a.champs.filter(c => c !== me && c.baseTeam === me.baseTeam); al[0].hp = al[0].maxHp * 0.6; al[1].hp = al[1].maxHp * 0.2; al[2].hp = 0; al[2].alive = false; al[2].deadT = 3; al[2].level = 4; });
await sleep(700); await p.screenshot({ path: 'shot_hud_allies.png', clip: { x: 780, y: 360, width: 500, height: 360 } });
// assist gold + dead shopping
const r = await p.evaluate(async () => {
  const a = window.__arena, me = a.player, al = a.champs.filter(c => c !== me && c.baseTeam === me.baseTeam && c.alive), en = a.champs.find(c => c.baseTeam !== me.baseTeam && c.alive);
  const g0 = [me.gold, al[0].gold, al[1].gold]; en.hitBy = new Map([[al[0], a.gameT], [al[1], a.gameT]]); en.hp = 1; const lv = me.level;
  me.x = en.x - 50; me.y = en.y; a.damage(me, en, 9999, 'physical'); await new Promise(r => setTimeout(r, 300));
  return { killerGold: me.gold - g0[0], a0: al[0].gold - g0[1], a1: al[1].gold - g0[2], xpNeed: [1, 2, 5, 11].map(L => { const o = { level: L }; return Math.round(110 * Math.pow(1.3, L - 1)); }) };
});
console.log(JSON.stringify(r));
const shop = await p.evaluate(async () => {
  const a = window.__arena, me = a.player, h = a.scene.get('hud'); me.gold = 2000; me.hp = 0; me.die?.(a.champs[1]); await new Promise(r => setTimeout(r, 400));
  me.x = 1600; me.y = 750; const before = { alive: me.alive, canShop: a.canShop(me) }; h.toggleShop(); await new Promise(r => setTimeout(r, 300));
  const bought = me.buyItem('b_pesa'); await new Promise(r => setTimeout(r, 300)); return { ...before, open: h.shopOpen, bought, inv: me.inv.filter(Boolean).map(s => s.id) };
});
console.log(JSON.stringify(shop)); await p.screenshot({ path: 'shot_hud_deadshop.png' });
console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
