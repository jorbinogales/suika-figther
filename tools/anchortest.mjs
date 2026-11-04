// Junior Q: does the grabbed champion stay stunned while dragged and after? node tools/anchortest.mjs [wall]
import puppeteer from 'puppeteer-core';
const wall = process.argv[2] === 'wall';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5173/#char=junior&train=1&keep=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
const log = await p.evaluate(async (wall) => {
  const a = window.__arena, f = a.player, e = a.enemy; e.ai = true; a.aiOn = true; e.maxHp = e.hp = 99999; f.ranks.p1 = 1; f.cds.p1 = 0; f.mana = f.maxMana;
  if (wall) { const M = await import('/src/mapdata.js'); let wx = 1200, wy = 600; for (let x = 900; x < 2300; x += 20) { let y = 760; while (y > 400 && M.isWalk(x, y)) y -= 5; if (!M.isWalk(x, y + 140) ) continue; if (y > 420 && y < 640) { wx = x; wy = y; break; } } f.x = wx; f.y = wy + 150; e.x = wx; e.y = wy + 90; f.setAim(0, -1); f.castPoint = { x: f.x, y: f.y - 300 }; rows0 = `wall edge at x=${wx} y=${wy}`; } else { f.x = 1500; f.y = 750; e.x = 1620; e.y = 750; f.setAim(1, 0); f.castPoint = { x: f.x + 300, y: f.y }; }
  const rows = []; var rows0 = ''; a.beginAim('p1'); a.cursorWorld = () => (wall ? { x: f.x, y: f.y - 300 } : { x: f.x + 300, y: f.y }); a.confirmAim(); rows.push('cast via aim ' + rows0);
  for (let i = 0; i < 14; i++) { await new Promise(r => setTimeout(r, 100)); rows.push(`${i * 100 + 100}ms enemy x=${Math.round(e.x)} y=${Math.round(e.y)} stunT=${e.stunT.toFixed(2)} carried=${(e.carriedT||0).toFixed(2)} state=${e.state} jr y=${Math.round(f.y)} dash=${!!f.dashV} birds=${e.birdsOn ?? '-'} markSrc=${(e.srcMark ?? '-')} lunges=${(a.lunges || []).length}`); }
  return rows;
}, wall);
console.log(log.join('\n')); console.log('errors:', errs.length ? errs.join('|') : 'none'); await b.close();
