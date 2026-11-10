import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:5199/#char=maduro&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
const res = await p.evaluate(async () => {
  const w = window.__arena, f = w.player, e = w.enemy, sleep = t => new Promise(r => setTimeout(r, t)), r = {};
  f.level = 18; f.gold = 9999; f.mana = f.maxMana = 999; e.ai = false; e.maxHp = e.hp = 9000;
  const cast = async k => { f.cds = { p1: 0, p2: 0, p3: 0, ult: 0, basic: 0 }; f.state = 'idle'; f.stunT = 0; f.setAim(1, 0); const ok = f.tryCast(k); await sleep(900); return ok; };
  for (const rank of [1, 3]) {
    for (const k of ['p1', 'p2', 'p3', 'ult']) f.ranks[k] = rank;
    f.setSB?.(0); e.hp = 9000; e.x = f.x + 200; e.y = f.y; e.stunT = 0; e.silenceT = 0;
    r['q' + rank] = { ok: await cast('p1'), dmg: Math.round(9000 - e.hp), stun: +(e.stunT || 0).toFixed(2), stains: w.stains?.length || 0 };
    r['f' + rank] = { ok: await cast('p2'), guards: f.guards?.length, hp: f.guards?.[0]?.maxHp };
    f.castPoint = { x: f.x + 300, y: f.y }; r['e' + rank] = { ok: await cast('p3') }; await sleep(1400);
    const cr = w.fighters.find(q => q.key === 'crate' && q.alive); r['e' + rank].crate = !!cr; r['e' + rank].hp = cr?.maxHp;
    await sleep(3500); const bugs = w.fighters.filter(q => q.key === 'roach' && q.alive); r['e' + rank].bugs = bugs.length; r['e' + rank].bugScale = bugs[0] && +bugs[0].spr.scaleX.toFixed(3); r['e' + rank].bugArmor = bugs[0]?.armor; r['e' + rank].bugHp = bugs[0]?.maxHp;
    e.x = f.x + 100; e.y = f.y; e.hp = 9000; const x0 = e.x; r['r' + rank] = { ok: await cast('ult'), pushed: Math.round(e.x - x0), dmg: Math.round(9000 - e.hp) };
    f.setSB?.(0); w.fighters.filter(q => q.key === 'crate' || q.key === 'roach' || q.key === 'bodyguard').forEach(q => q.dispose = true); f.guards = []; await sleep(300);
  }
  // guards growth over time (accelerated)
  f.ranks.p2 = 1; f.guards = []; await cast('p2'); const g0 = f.guards.length; for (let i = 0; i < 9; i++) { f.guardTick(1.6); } r.guardGrow = [g0, f.guards.length];
  return r;
});
console.log(JSON.stringify(res, null, 1)); await p.screenshot({ path: 'art/review_8dir/_maduro2.png' }); console.log(errs.slice(0, 3).join('\n') || 'no errors'); await b.close();
