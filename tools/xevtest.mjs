import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message, (e.stack || '').split('\n')[1]));
await p.goto('http://localhost:5173/#char=xeviche&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 20000));
console.log(await p.evaluate(`(async () => { const a = window.__arena, x = a.player, e = a.enemy; const sleep = t => new Promise(r => setTimeout(r, t)); const out = {};
  e.ai = false; e.maxHp = e.hp = 99999; let tot = 0; const od = a.damage.bind(a); a.damage = (s2, t, r, ty, dot) => { const v = od(s2, t, r, ty, dot); if (s2 === x && t === e) tot += v || 0; return v; }; ['p1','p2','p3','ult'].forEach(k => { x.ranks[k] = 3; x.cds[k] = 0; }); x.mana = 9999; x.setAim(1, 0);
  e.x = x.x + 300; e.y = x.y;
  let h0 = e.hp; x.tryCast('p1'); await sleep(1500); out.p1dmg = Math.round(tot); tot = 0;
  x.cds.p1 = 0; x.cds.p3 = 0; x.setAim(1, 0); e.x = x.x + 300; e.y = x.y; x.tryCast('p3'); await sleep(900); const d0 = Math.hypot(e.x - x.x, e.y - x.y); out.lured = !!e.lure; await sleep(1500); out.pulled = Math.round(d0 - Math.hypot(e.x - x.x, e.y - x.y)); out.blockedCast = e.tryCast('p1') === false; await sleep(2500);
  // shield: enemy basic hits xeviche
  out.up = x.arepaUp; const hp0 = x.hp; a.basicDmg = true; a.damage(e, x, 100, 'physical'); a.basicDmg = false; out.shieldBlocked = x.hp === hp0; out.upAfter = x.arepaUp; a.damage(e, x, 100, 'physical'); out.secondHit = hp0 - x.hp > 0;
  e.lure = null; e.stunT = 0; e.x = x.x + 300; e.y = x.y; x.cds.ult = 0; x.setAim(1, 0); h0 = e.hp; x.tryCast('ult'); await sleep(1500); out.rooted = x.state === 'cast'; await sleep(4500); out.ultDmg = Math.round(tot); out.endState = x.state;
  return JSON.stringify(out); })()`));
await b.close();
