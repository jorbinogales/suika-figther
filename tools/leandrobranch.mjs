import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
// 1) the choice window (fresh Leandro, nothing learned)
await p.goto('http://localhost:5199/#mode=3&keep=1&noai=1&nofog=1&char=leandro', { waitUntil: 'load' }); await sleep(10000);
console.log(await p.evaluate(() => { const a = window.__arena; a.audio.play = () => {}; a.player.ranks.p1 = 0; a.player.points = 3; a.askSpend('p1'); return 'ranks=' + JSON.stringify(a.player.ranks) + ' lvl=' + a.player.level + ' branchSel=' + a.scene.get('hud').branchSel; }));
await sleep(600); await p.screenshot({ path: 'D:/mycowork/game/shot_branch.png' });
console.log(await p.evaluate(() => { const a = window.__arena, h = a.scene.get('hud'); a.player.spend('p1', 1); h.branchSel = null; return 'after choose: ' + a.player.def.abilities.p1.name + ' rank=' + a.player.ranks.p1 + ' br=' + JSON.stringify(a.player.branch); }));
// 2) abilities of branch B
await p.goto('http://localhost:5199/#train=1&keep=1&noai=1&nofog=1&char=leandro', { waitUntil: 'load' }); await sleep(10000);
const out = await p.evaluate(async () => {
  const a = window.__arena, f = a.player, e = a.enemy, o = []; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {};
  a.handleInput = () => {}; let t = 0; const step = n => { for (let i = 0; i < n; i++) { t += 16.7; a.update(a.time.now + t, 16.7); } };
  e.ai = false; f.mana = f.maxMana = 9999; f.gold = 0;
  const place = d => { f.mana = f.maxMana; f.x = 1600; f.y = 750; f.setAim(1, 0); e.x = 1600 + d; e.y = 750; e.hp = e.maxHp; e.alive = true; e.stunT = 0; e.carriedT = 0; e.shove = null; e.pullMe = null; };
  ['p1', 'p2', 'p3', 'ult'].forEach(k => { f.ranks[k] = 0; f.setBranch(k, 1); f.ranks[k] = 1; });
  o.push('abilities: ' + ['p1', 'p2', 'p3', 'ult'].map(k => f.def.abilities[k].name + '/' + f.ranks[k]).join(' | '));
  // comb
  place(120); f.cds.p1 = 0; f.tryCast('p1'); step(60); o.push('comb active=' + !!f.comb + ' range=' + f.atkRange);
  const h0 = e.hp; f.tryBasic(); step(60); o.push('comb hit dmg=' + Math.round(h0 - e.hp));
  // dryer pull
  f.comb = null; place(380); f.cds.p2 = 0; f.castPoint = { x: 0, y: 0 }; f.tryCast('p2'); o.push('dryer cast anim=' + f.anim); step(80); o.push('dryer PULL: enemy x ' + 1980 + ' -> ' + Math.round(e.x) + ' hp=' + Math.round(e.hp) + ' (player at 1600)');
  place(200); step(30); f.cds.p2 = 0; f.castPoint = { x: 1, y: 0 }; f.tryCast('p2'); step(80); o.push('dryer PUSH: enemy x 1800 -> ' + Math.round(e.x));
  // throw: rank 1 / 2 / 3
  for (const rk of [1, 2, 3]) {
    f.ranks.p3 = rk; place(300); e.hp = e.maxHp; f.cds.p3 = 0; f.castPoint = { x: 2400, y: 750 }; f.tryCast('p3'); step(20);
    let minX = 1e9, maxX = -1e9, fz = 0, stunSeen = false; const n0 = a.tireShots.length;
    for (let i = 0; i < 200; i++) { step(1); a.tireShots.forEach(q => { minX = Math.min(minX, q.lx ?? 1e9); maxX = Math.max(maxX, q.lx ?? -1e9); }); fz = Math.max(fz, a.fireZones.length); if (e.stunT > 0) stunSeen = true; }
    o.push('tires rank ' + rk + ': started=' + n0 + ' gone=' + (a.tireShots.length === 0) + ' xrange=' + Math.round(minX) + '..' + Math.round(maxX) + ' hp ' + Math.round(e.maxHp) + '->' + Math.round(e.hp) + ' stun=' + stunSeen + ' fireZones=' + fz);
  }
  // leak
  step(60); place(700); f.cds.ult = 0; e.hp = e.maxHp; f.hp = f.maxHp; o.push('pre-leak: free=' + f.free + ' state=' + f.state + ' alive=' + f.alive + ' stun=' + f.stunT + ' sil=' + f.silenceT + ' rank=' + f.ranks.ult); const okc = f.tryCast('ult'); o.push('tryCast ult returned ' + okc + ' mana=' + Math.round(f.mana) + ' cd=' + f.cds.ult + ' locked=' + f.abilityLocked('ult')); step(80); o.push('leak phase1: enemy revealT=' + e.revealT.toFixed(1) + ' leakRe=' + !!f.leakRe + ' cdUlt=' + f.cds.ult);
  f.castPoint = { x: e.x, y: e.y }; f.tryCast('ult'); step(80); o.push('leak phase2: dist=' + Math.round(Math.hypot(f.x - e.x, f.y - e.y)) + ' cages=' + a.cages.length + ' cdUlt=' + f.cds.ult.toFixed(0));
  e.ai = false; for (let i = 0; i < 120; i++) { e.in = { mx: 1, my: 0, run: true }; e.x += 12; step(1); }
  const c = a.cages[0]; o.push('enemy tried to leave: dist from cage centre=' + (c ? Math.round(Math.hypot(e.x - c.x, e.y - c.y)) : 'cage gone') + ' radius=' + (c ? c.r : '-'));
  return o.join('\n');
});
console.log(out);
await p.screenshot({ path: 'D:/mycowork/game/shot_cage.png' });
await b.close();
