import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5199/#char=diosa&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
const res = await p.evaluate(async () => {
  const w = window.__arena, f = w.player, e = w.enemy, sleep = t => new Promise(r => setTimeout(r, t)), r = {};
  f.level = 18; for (const k of ['p1', 'p2', 'p3', 'ult']) f.ranks[k] = 2;
  e.ai = false; e.maxHp = e.hp = 5000;
  const reset = (dx, facing) => { f.mana = 100; f.cds = { p1: 0, p2: 0, p3: 0, ult: 0, basic: 0 }; f.state = 'idle'; f.stunT = 0; f.dashV = null; f.x = 1000; f.y = 700; f.setAim(1, 0); e.x = f.x + dx; e.y = f.y; e.hp = 5000; e.stunT = 0; e.slows = []; e.lure = null; e.ax = facing; e.ay = 0; e.ai = false; };
  r.farStart = Math.round(f.mana);
  f.mana = 100; reset(150, -1); r.q = f.tryCast('p1'); r.manaAfterQ = Math.round(f.mana); await sleep(500); r.qRe = !!f.qRe; r.qCd = +f.cds.p1.toFixed(2); r.speedB = f.speedBoost;
  const x1 = f.x; f.setAim(1, 0); f.state = 'idle'; r.recast = f.tryCast('p1'); await sleep(500); r.backMoved = Math.round(x1 - f.x); r.qCdFull = Math.round(f.cds.p1); r.qReOff = !f.qRe;
  reset(180, -1); r.w = f.tryCast('p2'); await sleep(400); r.charmFront = !!e.lure; r.shield = Math.round(f.shieldHp);
  reset(180, 1); f.shieldHp = 0; r.w2 = f.tryCast('p2'); await sleep(300); r.slowBack = e.slowed && !e.lure;
  reset(100, 1); r.eMax = e.maxHp; const log = []; const od = w.damage.bind(w); w.damage = (s2, t2, raw, ty, dot) => { const v = od(s2, t2, raw, ty, dot); if (t2 === e) log.push([Math.round(raw), ty, !!dot, Math.round(v)]); return v; }; const hp0 = e.hp; r.e = f.tryCast('p3'); await sleep(500); r.eBackDmg = Math.round(hp0 - e.hp); r.eLog = log; w.damage = od; e.hp = 5000;
  reset(100, -1); r.e2 = f.tryCast('p3'); await sleep(500); r.eFrontSlow = e.slowed;
  reset(100, 1); r.r = f.tryCast('ult'); f.slows = [{ pct: 0.5, t: 3 }]; await sleep(300); r.slowCleared = f.slows.length === 0; r.invul = f.invulT > 0; r.hit = w.damage(e, f, 100, 'physical'); await sleep(1300); r.blind = e.blindT > 0; r.full = Math.round(f.mana); r.cdr = f.cdrT > 0;
  // passive: crit at full farandula
  reset(80, -1); f.mana = f.maxMana; w.basicDmg = true; const h = e.hp; w.damage(f, e, 100, 'physical'); w.basicDmg = false; r.crit = Math.round(h - e.hp); r.manaAfter = Math.round(f.mana); r.shred = e.armorShredT > 0;
  return r;
});
console.log(JSON.stringify(res)); await p.screenshot({ path: 'art/review_8dir/_diosa.png' }); console.log(errs[0] || 'no errors'); await b.close();
