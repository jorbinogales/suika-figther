// Tarjeta gráfica: attacks and abilities leave a burn: node tools/burntest.mjs
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=xeviche&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
const out = await p.evaluate(async () => {
  const a = window.__arena, f = a.player, e = a.enemy; e.ai = false; e.maxHp = e.hp = 99999; f.x = 1500; f.y = 750; e.x = 1650; e.y = 750; f.setAim(1, 0);
  const sl = () => new Promise(r => setTimeout(r, 300)), res = {};
  res.noItem = e.poisons.filter(q => q.burn).length;
  f.inv[0] = { id: 'tarjeta_grafica', cd: 0, charges: 0 }; f.recomputeItems(); res.hasPas = f.pas.get('tarjeta_grafica');
  f.cds.basic = 0; f.tryBasic(); await new Promise(r => setTimeout(r, 900)); res.afterBasic = e.poisons.filter(q => q.burn && q.key === 'tarjeta').map(q => ({ t: +q.t.toFixed(1), dps: Math.round(q.dps), type: q.type }));
  e.poisons = []; f.ranks.p1 = 1; f.cds.p1 = 0; f.mana = f.maxMana; f.castPoint = { x: 1650, y: 750 }; f.tryCast('p1'); await new Promise(r => setTimeout(r, 1400)); res.afterAbility = e.poisons.filter(q => q.burn && q.key === 'tarjeta').map(q => ({ t: +q.t.toFixed(1), dps: Math.round(q.dps) }));
  let burnDmg = 0; const od = a.damage.bind(a); a.damage = (s2, t, r, ty, dot) => { const v = od(s2, t, r, ty, dot); if (dot && ty === 'magic' && s2 === f && t === e) burnDmg += v || 0; return v; }; await new Promise(r => setTimeout(r, 2000)); a.damage = od; res.burnDmgIn2s = Math.round(burnDmg);
  e.poisons = []; f.inv[0] = null; f.recomputeItems(); f.cds.basic = 0; f.tryBasic(); await new Promise(r => setTimeout(r, 900)); res.noItemAfter = e.poisons.filter(q => q.burn).length;
  return res;
});
console.log(JSON.stringify(out)); console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
