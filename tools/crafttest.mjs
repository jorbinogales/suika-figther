import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) console.log('[console]', m.text()); });
await p.goto('http://localhost:5173/#mode=3&keep=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 14000));
const r = await p.evaluate(`(() => { const a = window.__arena; a.handleInput = () => {}; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {};
  const f = a.player, out = {}; f.gold = 5000; f.inv.fill(null); f.recomputeItems(); const g0 = f.gold;
  out.buyChip = f.buyItem('b_chip'); out.buyReloj = f.buyItem('b_reloj'); out.slots1 = f.inv.map(s => s && s.id);
  out.craft = f.buyItem('libro_algoritmos'); out.slots2 = f.inv.map(s => s && s.id); out.spent = Math.round(g0 - f.gold); out.ap = Math.round(f.ap); out.cdr = f.it.cdr;
  out.craft3 = f.buyItem('nucleo_ia'); out.slots3 = f.inv.map(s => s && s.id); out.ap3 = Math.round(f.ap);
  a.player.x = a.player.spawn.x; a.scene.get('hud').toggleShop(); a.scene.get('hud').shopSel = 'nucleo_ia';
  // a full match: bots craft
  f.ai = true; for (let i = 0; i < 150 * 60; i++) a.update(a.time.now + i * 16, 16.7);
  out.bots = a.champs.filter(c => c !== f).map(c => c.key + ':' + c.inv.map(s => s ? s.id : '-').join(',') + ' g' + Math.round(c.gold));
  return JSON.stringify(out); })()`);
console.log(r); await new Promise(r => setTimeout(r, 600)); await p.screenshot({ path: 'D:/mycowork/game/shot_craft.png' }); await b.close();
