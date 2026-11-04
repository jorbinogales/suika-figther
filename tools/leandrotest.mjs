// Leandro p2 poison vs impact, and R bots scaling with AI power: node tools/leandrotest.mjs
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=leandro&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
const out = await p.evaluate(async () => {
  const a = window.__arena, f = a.player, e = a.enemy, res = {}; e.ai = false; e.maxHp = e.hp = 999999; e.armor = 0; e.mr = 0; f.x = 1400; f.y = 750; e.x = 1560; e.y = 750; f.setAim(1, 0);
  let imp = 0, dot = 0; const od = a.damage.bind(a); a.damage = (s, t, r, ty, d) => { const v = od(s, t, r, ty, d); if (s === f && t === e) { if (d) dot += v || 0; else imp += v || 0; } return v; };
  f.ranks.p2 = 1; f.cds.p2 = 0; f.mana = f.maxMana; f.castPoint = { x: 1560, y: 750 };
  const poisonDef = () => e.poisons.filter(q => !q.burn).length;
  f.tryCast('p2'); await new Promise(r => setTimeout(r, 7000));
  res.p2 = { ap: Math.round(f.ap), impactTotal: Math.round(imp), poisonTotal: Math.round(dot), ratio: +(dot / Math.max(1, imp)).toFixed(2) };
  // R bots: stats at 3 AI power levels
  res.bots = [];
  for (const ap of [60, 200, 400]) {
    const real = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(f), 'ap'); Object.defineProperty(f, 'ap', { get: () => ap, configurable: true });
    f.ranks.ult = 1; f.cds.ult = 0; f.mana = f.maxMana; const n0 = a.fighters.length; f.tryCast('ult'); await new Promise(r => setTimeout(r, 1500));
    const bots = a.fighters.filter(x => x.isBot && x.owner === f && !x.antivirus); res.bots.push({ ap, melee: bots.filter(x => x.def.bot === 'melee').map(x => Math.round(x.maxHp))[0], ranged: bots.filter(x => x.def.bot === 'ranged').map(x => Math.round(x.maxHp))[0], dmg: Math.round(bots[0]?.botAp) });
    bots.forEach(x => { x.dispose = true; x.hp = 0; x.alive = false; }); delete f.ap; f.cds.ult = 0;
  }
  return res;
});
console.log(JSON.stringify(out)); console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
