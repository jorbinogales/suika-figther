// AI match fast-forward + shop checks: bots must buy/upgrade/use items without errors; also opens the shop UI
import puppeteer from 'puppeteer-core';
const [hash = 'mode=3', seconds = '150'] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message)); p.on('response', r => { if (r.status() === 404) console.log('[404]', r.url()); }); p.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
await p.goto('http://localhost:5173/#' + hash, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
const out = await p.evaluate(`(async () => { const a = window.__arena; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {};
  a.player.in = { mx: 0, my: 0, run: false }; a.player.ai = true;
  const N = ${seconds} * 60, t0 = a.time.now; for (let i = 0; i < N; i++) { a.update(t0 + i * 16, 16.7); }
  const L = c => c.key + '(' + c.team + ') L' + c.level + ' gold' + Math.round(c.gold) + ' [' + c.inv.map(s => s ? s.id + ':' + s.tier + (s.charges ? 'x' + s.charges : '') : '-').join(',') + '] hp' + Math.round(c.maxHp) + ' atk' + Math.round(c.atk) + ' ap' + Math.round(c.ap);
  return JSON.stringify({ time: Math.round(a.gameT), champs: a.champs.map(c => L(c) + " x" + Math.round(c.x) + (c.retreat ? " R" : "") + (c.wantShop ? " S" : "")), mortars: a.mortars.length, over: a.over && a.over.winner }, null, 1); })()`);
console.log(out);
// shop UI: stand in base, open with B, buy something, screenshot
await p.evaluate(`(() => { const a = window.__arena; a.player.ai = false; a.paused = false; a.over = null; const f = a.player; f.alive = true; f.x = f.spawn.x; f.y = f.spawn.y; f.hp = f.maxHp; f.gold = 5000; f.inv.fill(null); f.recomputeItems(); })()`);
await new Promise(r => setTimeout(r, 500));
await p.evaluate(`window.__arena.scene.get('hud').toggleShop()`); await new Promise(r => setTimeout(r, 600));
const res = await p.evaluate(`(() => { const a = window.__arena, f = a.player, h = a.scene.get('hud'); const r = { open: h.shopOpen, buy: f.buyItem('teclado_mecanico'), up: (f.upgradeItem(0), f.inv[0].tier), use: f.buyItem('mortero_portatil') && f.useItem(1), mortars: a.mortars.length, atk: Math.round(f.atk) }; f.buyItem('maletin_soldados'); f.useItem(2); f.buyItem('dron_combate'); f.useItem(3); f.buyItem('pocion_vida_peq'); f.hp = f.maxHp * 0.3; f.useItem(4); r.summons = a.fighters.filter(x => x.owner === f).length; return JSON.stringify(r); })()`);
console.log(res);
await new Promise(r => setTimeout(r, 800));
await p.screenshot({ path: 'D:/mycowork/game/shot_shop.png' });
await p.evaluate(`window.__arena.scene.get('hud').shopOpen = false`);
await new Promise(r => setTimeout(r, 400));
await p.screenshot({ path: 'D:/mycowork/game/shot_items.png' });
await b.close();
