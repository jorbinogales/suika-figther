import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader','--use-gl=angle','--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.stack || e.message));
await p.goto('http://localhost:5199/#char=luis&noai=1&nofog=1&keep=1&mode=3', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.bosses, { timeout: 90000 });
await new Promise(r => setTimeout(r, 2500));
console.log(await p.evaluate(() => { const w = window.__arena, me = w.player, log = [], real = w.net; w.net = { role: 'host', onBoss: (...a) => log.push(a[0]), op: () => true };
  const mate = w.champs.find(c => c.team === me.team && c !== me); mate.alive = false;
  w.bossDead({ bossKind: 'robot', x: me.x, y: me.y }, me); const had = !!w.bossVote, opts = w.bossVote.opts.slice();
  w.bossVoteChoose(w.champs.find(c => c.team !== me.team), 0); const stillOpen = !!w.bossVote;   // wrong team: ignored
  w.bossVoteChoose(me, 1); const r = JSON.stringify({ had, stillOpen, closed: !w.bossVote, chosen: opts[1], buffs: w.champs.filter(c => c.team === me.team).map(c => c.buffs), log }); w.net = real; return r; }));
console.log('errors:', [...new Set(errs)].join('\n') || 'none'); await b.close();
