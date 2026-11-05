// Anti-heal check: node tools/woundtest.mjs
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=jorbi&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
await new Promise(r => setTimeout(r, 2000));
const out = await p.evaluate(async () => {
  const a = window.__arena, f = a.player, e = a.enemy, sleep = t => new Promise(r => setTimeout(r, t)), r = {};
  e.ai = false; e.maxHp = 5000; e.x = f.x + 60; e.y = f.y;
  const h = () => { e.hp = e.maxHp * 0.2; const h0 = e.hp; e.heal(100); return Math.round(e.hp - h0); };   // measured in the same tick
  e.woundT = 0; r.healNormal = h();
  e.wound(0.4, 3); r.healWounded = h();
  e.woundT = 0; r.healAfter = h();
  // items: give each and check the wound is applied by the right trigger
  const give = id => { f.pas.clear?.(); f.pas.set(id, 1); };
  e.woundT = 0; give('ransomware'); a.basicDmg = true; a.damage(f, e, 50, 'physical'); a.basicDmg = false; r.ransomBasic = e.woundT > 0;
  e.woundT = 0; give('ransomware'); a.damage(f, e, 50, 'magic'); r.ransomAbility = e.woundT > 0;
  e.woundT = 0; give('cuarentena_digital'); a.damage(f, e, 50, 'magic'); r.cuarAbility = e.woundT > 0;
  e.woundT = 0; give('cuarentena_digital'); a.basicDmg = true; a.damage(f, e, 50, 'physical'); a.basicDmg = false; r.cuarBasic = e.woundT > 0;
  f.pas.clear?.(); e.pas.clear?.(); e.pas.set('espinas_firewall', 1); f.woundT = 0; a.basicDmg = true; a.damage(f, e, 50, 'physical'); a.basicDmg = false; r.spikes = f.woundT > 0;
  return r;
});
console.log(JSON.stringify(out), errs.length ? 'ERR ' + errs[0] : 'no errors'); await b.close();
