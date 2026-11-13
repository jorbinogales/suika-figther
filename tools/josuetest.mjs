// Josué + his dog in the training zone: partner spawn, every ability in both forms, R swap, hold-E charge (real keys), the life rule.
// node tools/josuetest.mjs [base] [shot.png]   (needs `npx vite` on 5173)
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://localhost:5173/', SHOT = process.argv[3] || '';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.stack || e.message)); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('[console] ' + m.text()); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await p.goto(BASE + '#char=josue&enemy=jorbi&train=1&keep=1&noai=1&nofog=1&rank=3', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player?.pal, { timeout: 90000 }); await sleep(1500);
const out = JSON.parse(await p.evaluate(`(() => { const a = window.__arena, x = a.player, e = a.enemy, o = {}; a.audio.play = a.audio.playAll = a.audio.voice = () => {};
  const step = n => { for (let i = 0; i < n; i++) a.update(a.time.now + i * 16, 16.7); };
  a.training = false; e.ai = false; e.def = { ...e.def, stats: { ...e.def.stats, hp: 3000 } };   // no dummy regeneration while measuring
  e.hp = e.maxHp; e.x = x.x + 300; e.y = x.y; x.setAim(1, 0);
  const pal = x.pal; o.start = { ranks: x.ranks, palKey: pal.key, palDog: pal.palDog, palSkin: pal.skin, skin: x.skin, art: x.art, palHp: Math.round(pal.maxHp), hp: Math.round(x.maxHp) };
  const hit = () => { const h = Math.round(e.maxHp - e.hp); e.hp = e.maxHp; return h; };
  // Q trap on the enemy: it arms, then stuns
  x.castPoint = { x: e.x, y: e.y }; x.tryCast('p1'); step(20); o.trapPlaced = a.traps.filter(t => t.kind === 'bear').length; step(40); o.trapStun = +e.stunT.toFixed(2); o.trapDmg = hit(); step(100); o.trapGone = a.traps.filter(t => t.kind === 'bear').length;
  // F dash backward with arrows
  e.stunT = 0; e.state = 'idle'; const x0 = x.x; x.cds.p2 = 0; x.castPoint = { x: -100, y: 0 }; x.tryCast('p2'); step(60); o.dashBack = Math.round(x.x - x0); o.dashDmg = hit();
  // E charged arrow: half and full
  e.x = x.x + 500; e.y = x.y; x.setAim(1, 0); x.cds.p3 = 0; x.castPoint = { x: 300, y: 0 }; x.tryCast('p3'); step(70); o.arrow30 = hit(); x.cds.p3 = 0; x.setAim(1, 0); x.castPoint = { x: 1000, y: 0 }; x.tryCast('p3'); step(70); o.arrow100 = hit();
  // the partner attacks what Josué attacks
  e.x = x.x + 200; e.y = x.y; x.lastTarget = e; x.lastTargetT = a.gameT; e.dmgEvents = []; let n0 = 0; const tb = pal.tryBasic.bind(pal); pal.tryBasic = () => { const ok = tb(); if (ok) n0++; return ok; }; step(240); o.pal4s = { dmg: hit(), swings: n0, botAp: Math.round(pal.botAp), dist: Math.round(Math.hypot(pal.x - e.x, pal.y - e.y)), range: pal.def.stats.range, armor: Math.round(e.armor) }; pal.tryBasic = tb;
  // R: swap to the dog
  const px = Math.round(pal.x), cx = Math.round(x.x); x.cds.ult = 0; x.tryCast('ult'); step(30); o.swap = { dogForm: x.dogForm, palDog: pal.palDog, champNowAt: Math.round(x.x) === px, palNowAt: Math.round(pal.x) === cx, abilities: ['p1', 'p2', 'p3'].map(k => x.def.abilities[k].name), basic: x.def.basic.kind, skin: x.skin, palSkin: pal.skin, h: x.def.height };
  // dog Q bite heals, dog E bloodthirst heals per hit, dog F hunt + pounce
  e.x = x.x + 250; e.y = x.y; x.setAim(1, 0); x.hp = x.maxHp * 0.5; let h0 = x.hp; x.cds.p1 = 0; x.tryCast('p1'); step(40); o.bite = { dmg: hit(), healed: Math.round(x.hp - h0) };
  x.cds.p3 = 0; x.tryCast('p3'); step(30); o.blood = +x.bloodT.toFixed(1); x.hp = x.maxHp * 0.5; h0 = x.hp; x.cds.basic = 0; x.tryBasic(); step(30); o.bloodHeal = Math.round(x.hp - h0); hit();
  e.x = x.x + 300; x.cds.p2 = 0; x.tryCast('p2'); step(10); o.hunt = { invis: !!x.invis, hunt: !!x.hunt, palAway: pal.away, speed: Math.round(x.speed) }; step(20); x.cds.basic = 0; x.tryBasic(); step(30); o.pounce = { dmg: hit(), invis: !!x.invis, palAway: pal.away, palNear: Math.round(Math.hypot(pal.x - x.x, pal.y - x.y)) };
  // swap back, then the life rule: the driven body falls -> control jumps to the partner; both fall -> the champion dies
  x.cds.ult = 0; x.tryCast('ult'); step(20); o.backToJosue = !x.dogForm;
  e.x = x.x + 900; a.damage(e, x, 1e6, 'true'); step(5); o.fall1 = { alive: x.alive, dogForm: x.dogForm, palAlive: pal.alive, deaths: x.deaths, palDownT: +(x.palDownT || 0).toFixed(1) };
  x.cds.ult = 0; o.swapWithoutPal = x.tryCast('ult');
  step(Math.ceil(x.respawnTime * 60) + 30); o.palBack = { pal: !!x.pal?.alive, palDog: x.pal?.palDog, newNid: x.pal !== pal };
  x.pal.hp = 1; a.damage(e, x.pal, 1e6, 'true'); step(5); a.damage(e, x, 1e6, 'true'); step(5); o.bothDown = { alive: x.alive, deaths: x.deaths };
  step(Math.ceil(x.respawnTime * 60) + 60); o.respawn = { alive: x.alive, dogForm: x.dogForm, pal: !!x.pal?.alive };
  return JSON.stringify(o); })()`));
console.log(JSON.stringify(out, null, 1));
// real keys: hold E (zoom out + charge), release (the arrow flies); R swaps; Q / F / E as the dog
const realT = JSON.parse(await p.evaluate(`(() => { const a = window.__arena; a.player.cds.p3 = 0; a.player.mana = a.player.maxMana; return JSON.stringify({ zoom: +a.zoom.toFixed(3) }); })()`));
await p.mouse.move(900, 360); await p.keyboard.down('KeyE'); await sleep(1200);
const mid = JSON.parse(await p.evaluate(`JSON.stringify({ charging: !!window.__arena.jCharge, k: +window.__arena.josueChargeK().toFixed(2), zoom: +window.__arena.zoom.toFixed(3) })`));
if (SHOT) await p.screenshot({ path: SHOT.replace('.png', '_charge.png') });
await p.keyboard.up('KeyE'); await sleep(150);
const rel = JSON.parse(await p.evaluate(`JSON.stringify({ charging: !!window.__arena.jCharge, projs: window.__arena.projs.length, cd: +window.__arena.player.cds.p3.toFixed(1) })`));
await sleep(600); await p.keyboard.press('KeyR'); await sleep(500);
const r = JSON.parse(await p.evaluate(`JSON.stringify({ dog: window.__arena.player.dogForm, camOnDog: Math.abs(window.__arena.camTarget.x - window.__arena.player.x) < 2 })`));
if (SHOT) await p.screenshot({ path: SHOT.replace('.png', '_dog.png') });
await p.keyboard.press('KeyF'); await sleep(400); const hunt = await p.evaluate(`!!window.__arena.player.hunt && !!window.__arena.player.invis`);
await p.keyboard.press('KeyE'); await sleep(400);
const dogKeys = JSON.parse(await p.evaluate(`JSON.stringify({ hunt: ${hunt}, huntEndsOnCast: !window.__arena.player.hunt, blood: window.__arena.player.bloodT > 0 })`));
console.log('real keys', JSON.stringify({ before: realT, holdingE: mid, released: rel, afterR: r, dogKeys }));
if (SHOT) await p.screenshot({ path: SHOT });
console.log('errors', errs.length ? errs.slice(0, 8) : 'none');
await b.close();
