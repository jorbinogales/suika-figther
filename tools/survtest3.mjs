import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader','--use-gl=angle','--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const sleep = t => new Promise(r => setTimeout(r, t));
for (const ch of process.argv.slice(2)) {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:5199/#surv=1&char=' + ch, { waitUntil: 'load' });
  try { await p.waitForFunction(() => window.__arena?.player && window.__arena.sv, { timeout: 90000 }); } catch (e) { console.log(ch, 'LOAD FAIL', errs.slice(0,2)); await p.close(); continue; }
  await sleep(2000);
  await p.evaluate(() => { const w = window.__arena; w.sv.picks = 0; w.sv.pick = null; w.survHold(false); w.sv.t = 0.1; const f = w.player; f.level = 12; f.ranks = { p1: 3, p2: 3, p3: 3, ult: 3 }; f.gold = 0; });
  await sleep(4000);
  for (let r = 0; r < 3; r++) {
    for (const k of ['p1', 'p2', 'p3', 'ult']) {
      await p.evaluate(k => { const w = window.__arena, f = w.player; f.hp = f.maxHp; f.mana = f.maxMana; f.cds[k] = 0; f.state = 'idle'; const m = w.mobs.slice().sort((a, c) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(c.x - f.x, c.y - f.y))[0]; if (m) f.setAim(m.x - f.x, m.y - f.y); w.castPoint = null; try { f.tryCast(k); } catch (e) { console.log('THROW', k, e.message); } }, k);
      await sleep(900);
      await p.evaluate(() => { const w = window.__arena; if (w.aimKey) { w.confirmAim?.(); w.cancelAim(); } });
    }
  }
  const st = await p.evaluate(() => { const s = window.__arena.sv; return `wave ${s.wave} alive ${s.alive} kills ${s.kills}`; });
  console.log(ch, st, errs.length ? 'ERRORS: ' + [...new Set(errs)].slice(0, 3).join(' | ') : 'ok'); await p.close();
}
await b.close();
