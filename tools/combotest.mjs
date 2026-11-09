// Basic attack combo check for every champion: node tools/combotest.mjs [champ,champ,...]
import puppeteer from 'puppeteer-core';
const chars = (process.argv[2] || 'junior,jorbi,hector,luis,leandro,xeviche,axel,julio,eliud,yonaiker').split(',');
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const sleep = t => new Promise(r => setTimeout(r, t));
for (const ch of chars) {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:5199/#char=${ch}&train=1&keep=1&noai=1&nofog=1`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
  await sleep(2000);
  const out = await p.evaluate(async () => {
    const a = window.__arena, f = a.player, e = a.enemy, sleep = t => new Promise(r => setTimeout(r, t)); const res = { steps: [] };
    e.ai = false; e.maxHp = e.hp = 999999; e.x = f.x + 75; e.y = f.y; f.setAim(1, 0); f.in = { mx: 0, my: 0, run: false };
    let dmg = 0, shots = 0; const od = a.damage.bind(a); a.damage = (s, t, r, ty, dot) => { const v = od(s, t, r, ty, dot); if (s === f && t === e) dmg += v || 0; return v; };
    const op = a.projectile.bind(a); a.projectile = (o, x) => { if (o === f) shots++; return op(o, x); };
    const click = async () => { dmg = 0; shots = 0; f.cds.basic = 0; const t0 = performance.now(); const ok = f.tryBasic(); return ok; };
    // 3 chained hits, then the 4th click after the finisher restarts at 1
    for (let i = 0; i < 4; i++) {
      dmg = 0; shots = 0; f.cds.basic = 0; f.state = 'idle'; const ok = f.tryBasic(); await sleep(60);
      const anim = f.spr.anims.currentAnim?.key; await sleep(600);
      res.steps.push({ step: f.cstepN, anim: anim?.replace(f.key + '_', ''), dmg: Math.round(dmg), shots, ok, cd: +(f.cds.basic).toFixed(2) });
    }
    // window: wait longer than the window -> back to step 1
    f.cds.basic = 0; f.state = 'idle'; f.tryBasic(); await sleep(900); await sleep(1200); f.cds.basic = 0; f.state = 'idle'; f.tryBasic(); res.afterPause = f.cstepN; await sleep(900);
    // lunge: attack while holding forward
    f.comboStep = 0; f.cds.basic = 0; f.state = 'idle'; f.in = { mx: 1, my: 0, run: false }; f.runT = 0; f.tryBasic(); res.noMomentum = f.cstepN; await sleep(900); f.comboStep = 0; f.cds.basic = 0; f.state = 'idle'; f.in = { mx: 1, my: 0, run: false }; f.runT = 1; const x0 = f.x; f.tryBasic(); res.lstep = f.cstepN; res.lanim = f.cstep?.anim; await sleep(700); res.lunge = Math.round(f.x - x0); res.combo = f.comboStep; f.in = { mx: 0, my: 0, run: false };
    // no lunge without forward input
    await sleep(900); f.comboStep = 0; f.cds.basic = 0; f.state = 'idle'; const x1 = f.x; f.tryBasic(); await sleep(700); res.still = Math.round(f.x - x1);
    return res;
  });
  console.log(ch.padEnd(9), out.steps.map(s => `${s.step}:${s.anim}:${s.dmg}${s.shots ? '/' + s.shots + 'sh' : ''}${s.ok ? '' : '!NOK'}`).join('  '), '| pause->', out.afterPause, '| lunge-attack', out.lanim, 'step', out.lstep, out.lunge + 'px, combo', out.combo, 'still', out.still, errs.length ? ' ERR ' + errs[0] : '');
  await p.close();
}
await b.close();
