// AI core shield persistence + passive cooldown on the slot: node tools/coretest.mjs
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=xeviche&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
const log = await p.evaluate(async () => {
  const a = window.__arena, f = a.player, rows = []; f.inv[0] = { id: 'nucleo_ia', cd: 0, charges: 0 }; f.inv[1] = { id: 'servidor_redundante', cd: 0, charges: 0 }; f.recomputeItems();
  const snap = l => rows.push(`${l}: shield=${Math.round(f.shieldHp)} on=${f.coreOn} coreT=${(f.coreT ?? 12).toFixed(1)} cdUI=${JSON.stringify(f.passiveCd('nucleo_ia'))}`);
  f.combatT = 0; f.coreT = 0.2; await new Promise(r => setTimeout(r, 400)); snap('granted');
  f.combatT = 0; await new Promise(r => setTimeout(r, 6000)); snap('6s later (must persist)');
  f.shieldHp = 0; await new Promise(r => setTimeout(r, 300)); snap('shield broken');
  f.combatT = 0; await new Promise(r => setTimeout(r, 3000)); snap('3s after (counting)');
  f.backupCd = 30; snap('backup 30s'); rows.push('backup UI ' + JSON.stringify(f.passiveCd('servidor_redundante')));
  return rows;
});
console.log(log.join('\n')); await p.screenshot({ path: 'shot_core.png', clip: { x: 0, y: 260, width: 220, height: 200 } });
console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
