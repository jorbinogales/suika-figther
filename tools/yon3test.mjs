import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message, (e.stack || '').split('\n')[1]));
await p.goto('http://localhost:5173/#char=yonaiker&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 20000));
console.log(await p.evaluate(`(async () => { const a = window.__arena, x = a.player, e = a.enemy; const sleep = t => new Promise(r => setTimeout(r, t)); const out = {};
  e.ai = false; e.maxHp = e.hp = 99999; let tot = 0; const od = a.damage.bind(a); a.damage = (s2, t, r, ty, dot) => { const v = od(s2, t, r, ty, dot); if (s2 === x && t === e) tot += v || 0; return v; };
  ['p1','p2','p3','ult'].forEach(k => { x.ranks[k] = 3; x.cds[k] = 0; }); out.mana = x.maxMana;
  e.x = x.x + 400; e.y = x.y; x.charge = 99.5; await sleep(600); out.phase0 = x.bomber?.phase;
  await sleep(2600); out.phase1 = x.bomber?.phase; out.away = x.away; out.zoom = +a.cameras.main.zoom.toFixed(2);
  // aim the reticle on the enemy and fire
  const B = x.bomber; a.input.activePointer.positionToCamera = () => ({ x: e.x, y: e.y }); Object.defineProperty(a.input.activePointer, 'leftButtonDown', { value: () => true, configurable: true });
  await sleep(3000); out.missileDmg = Math.round(tot); out.burning = e.poisons.some(q => q.burn); out.charge = Math.round(x.charge);
  Object.defineProperty(a.input.activePointer, 'leftButtonDown', { value: () => false, configurable: true });
  B.t = B.T; await sleep(3500); out.after = x.bomber ? x.bomber.phase : 'none'; out.awayEnd = x.away; out.chargeEnd = Math.round(x.charge);
  // smoke grenade
  x.cds.p2 = 0; x.setAim(1, 0); e.x = x.x + 250; e.y = x.y; x.castPoint = { x: e.x, y: e.y }; tot = 0; out.cast2 = x.tryCast('p2'); await sleep(1000); if (a.smokes?.[0]) { e.x = a.smokes[0].x; e.y = a.smokes[0].y; } await sleep(700); out.smokes = (a.smokes || []).length; out.eDist = Math.round(Math.hypot(e.x - (a.smokes?.[0]?.x || 0), e.y - (a.smokes?.[0]?.y || 0))); out.smokePoison = e.poisons.some(q => q.key === 'smoke'); out.smokeDmg = Math.round(tot);
  // crates
  x.tryCast('p3'); await sleep(2500); out.crates = (a.crates || []).length; x.x = (a.crates?.[0]?.x) || x.x; x.y = (a.crates?.[0]?.y) || x.y; await sleep(800); out.cratesAfter = (a.crates || []).length; out.buffs = Object.keys(x.pkBuffs || {}).join(',');
  // ult
  x.tryCast('ult'); await sleep(800); out.silenced = e.silenceT > 1; out.blind = e.blindT > 1;
  return JSON.stringify(out); })()`));
await b.close();
