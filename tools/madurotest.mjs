import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5199/#char=maduro&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
const res = await p.evaluate(async () => {
  const w = window.__arena, f = w.player, e = w.enemy, sleep = t => new Promise(r => setTimeout(r, t)), r = {};
  f.level = 18; f.gold = 9999; for (const k of ['p1', 'p2', 'p3', 'ult']) f.ranks[k] = 2; f.mana = f.maxMana = 999;
  e.ai = false; e.maxHp = e.hp = 5000; e.x = f.x + 200; e.y = f.y; f.setAim(1, 0);
  const cast = async k => { f.cds = { p1: 0, p2: 0, p3: 0, ult: 0, basic: 0 }; f.state = 'idle'; f.stunT = 0; f.setAim(1, 0); e.x = f.x + 200; e.y = f.y; e.silenceT = 0; e.hp = 5000; const ok = f.tryCast(k); await sleep(900); return ok; };
  r.q = await cast('p1'); r.qSil = +e.silenceT.toFixed(2); r.qHp = Math.round(5000 - e.hp);
  r.f = await cast('p2'); r.fDr = +f.drT.toFixed(1);
  f.castPoint = { x: e.x, y: e.y }; r.e = await cast('p3'); f.castPoint = null; await sleep(300); r.eAtkSlow = e.atkSlowT > 0; r.eWound = e.woundT > 0;
  r.r = await cast('ult'); r.sb = !!f.sb; r.defName = f.def.abilities.p1.name; r.speedB = f.speedBoost; r.armor = Math.round(f.armor); r.eSlow = e.slowed;
  r.qSB = await cast('p1'); r.qSBhp = Math.round(5000 - e.hp); r.qStun = e.stunT > 0 || e.state === 'stun';
  r.fSB = await cast('p2'); r.shield = !!f.sShield; e.stunT = 0; e.hp = 5000; f.hp = f.maxHp; const dd = w.damage(e, f, 100, 'magic'); r.blocked = !f.sShield && dd === 0 && f.hp >= f.maxHp - 1; r.burst = e.hp < 5000;
  e.x = f.x + 300; e.y = f.y; r.eSB = await cast('p3'); r.pulled = Math.round(Math.hypot(e.x - f.x, e.y - f.y)); r.shred = e.armorShredT > 0;
  // passive: damage marks, gold is skimmed
  e.devalBy = f; e.devalT = 4; e.goldPrev = e.gold; const g0 = f.gold; e.gold += 200; await sleep(200); r.stolen = Math.round(f.gold - g0);
  f.setSB(0); r.back = !f.sb && f.def.abilities.p1.name;
  return r;
});
console.log(JSON.stringify(res)); await p.screenshot({ path: 'art/review_8dir/_maduro.png' }); console.log(errs[0] || 'no errors'); await b.close();
