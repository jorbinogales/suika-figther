import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#char=yonaiker&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
console.log(await p.evaluate(`(() => { const a = window.__arena, x = a.player, e = a.enemy; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; const step = n => { for (let i = 0; i < n; i++) a.update(a.time.now + i * 16, 16.7); };
  const out = {}; e.maxHp = e.hp = 9999; e.ai = false; ['p1', 'p2', 'p3', 'ult'].forEach(k => { x.ranks[k] = 2; x.cds[k] = 0; }); x.mana = 9999; x.setAim(1, 0);
  e.x = x.x + 900; e.y = x.y;   // far away first
  x.tryCast('p1'); step(80); const sn = a.fighters.find(f => f.key === 'sentry'); out.sentryBuried = !!(sn && sn.invis); out.cdP1 = +x.cds.p1.toFixed(1);
  e.x = x.x + 420; e.y = x.y; step(90); out.sentryRevealed = !sn.invis; out.enemyHpLoss = Math.round(9999 - e.hp);
  e.x = x.x + 700; e.y = x.y; x.cds.p2 = 0; x.castPoint = { x: x.x + 300, y: x.y }; x.tryCast('p2'); step(80); out.trap = a.traps.length; e.x = x.x + 300; e.y = x.y; step(10); out.rooted = +(e.rootT || 0).toFixed(1); out.trapsLeft = a.traps.length;
  x.hp = x.maxHp * 0.4; x.cds.p3 = 0; x.castPoint = { x: x.x, y: x.y }; x.tryCast('p3'); step(60 * 4); out.healed = Math.round(x.hp - x.maxHp * 0.4); x.castPoint = { x: x.x + 50, y: x.y }; x.cds.p3 = 0; x.tryCast('p3'); step(80); out.sentinels = a.sentinels.length;
  e.x = x.x + 600; x.cds.ult = 0; x.castPoint = { x: x.x + 130, y: x.y }; step(60); x.tryCast('ult'); step(80); out.barrier = x.barr ? [x.barr.segs.length, x.barr.turrets.length, +x.cds.ult > 1000] : null;
  const seg = x.barr.segs[0]; a.damage(e, seg, 5000, 'physical'); x.barr.segs.slice(1).forEach(s => a.damage(e, s, 9999, 'physical')); step(40); out.afterDestroy = [!!x.barr, +x.cds.ult.toFixed(0)];
  return JSON.stringify(out); })()`));
await p.screenshot({ path: 'D:/mycowork/game/shot_yon.png' }); await b.close();
