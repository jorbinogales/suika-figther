// New level-3 items: stats, passives and actives: node tools/newitems.mjs
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=jorbi&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
const out = await p.evaluate(async () => {
  const a = window.__arena, f = a.player, e = a.enemy, r = {}, sl = t => new Promise(rs => setTimeout(rs, t)); e.ai = false; e.maxHp = e.hp = 99999; f.x = 1500; f.y = 750; e.x = 1580; e.y = 750; f.setAim(1, 0);
  const set = ids => { f.inv = [null, null, null, null, null, null]; ids.forEach((id, i) => { f.inv[i] = { id, cd: 0, charges: 3 }; }); f.recomputeItems(); };
  set(['exoesqueleto']); const atk0 = f.atk; f.hp = f.maxHp; const a1 = f.atk; f.hp = f.maxHp * 0.4; r.exo = { full: Math.round(a1), low: Math.round(f.atk), stats: JSON.stringify(f.it) .slice(0, 0) };
  f.hp = f.maxHp; set(['moto_electrica']); f.in = { mx: 1, my: 0, run: false }; await sl(2300); let bonus = 0; const od = a.damage.bind(a); a.damage = (s, t, rr, ty, d) => { const v = od(s, t, rr, ty, d); if (d && ty === 'magic' && s === f) bonus += v; return v; }; f.cds.basic = 0; f.tryBasic(); f.in = { mx: 0, my: 0, run: false }; await sl(900); r.moto = { bonus: Math.round(bonus), moveTAfter: f.moveT }; a.damage = od;
  set(['consola_overclock']); f.mana = 10; f.ranks.p1 = 1; f.cds.p1 = 0; f.castPoint = { x: 1580, y: 750 }; f.tryCast('p1'); await sl(200); r.overclock = { manaAfter: Math.round(f.mana), max: Math.round(f.maxMana) };
  set(['botiquin_maestro']); f.hp = 100; f.mana = 0; f.useItem(0); f.stunT = 2; await sl(3500); r.botiquin = { hp: Math.round(f.hp), mana: Math.round(f.mana), stun: f.stunT };
  set(['centro_mando']); const n0 = a.fighters.length; f.useItem(0); await sl(300); r.mando = { newUnits: a.fighters.length - n0, shield: Math.round(f.shieldHp), cd: Math.round(f.inv[0].cd) };
  set(['arsenal_artillero']); f.useItem(0); await sl(300); r.arsenal = { mortars: (a.mortars || []).length, cd: Math.round(f.inv[0].cd) };
  set(['propulsor_cohete']); f.x = 1400; f.y = 750; f.setAim(1, 0); f.useItem(0); await sl(200); r.propulsor = { moved: Math.round(f.x - 1400), speedBoost: f.speedBoost };
  return r;
});
console.log(JSON.stringify(out, null, 0)); console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
