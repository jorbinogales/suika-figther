import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5199/#char=yonaiker&train=1&keep=1&noai=1&nofog=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2000);
const out = await p.evaluate(async () => {
  const w = window.__arena, f = w.player, sleep = t => new Promise(r => setTimeout(r, t)), r = {};
  f.level = 18; for (const k of ['p1', 'p2', 'p3', 'ult']) f.ranks[k] = 1; f.cds = { p1: 0, p2: 0, p3: 0, ult: 0, basic: 0 };
  // guest mirror (no real ship): what netgame builds from o.bm
  f.bomber = { mirror: true, o: f, a: f.def.abilities.p3, rank: 1, pt: { x: f.x, y: f.y }, fire: false, cd: 0 };
  w.bomberMirrorPhase(f.bomber, 'fly'); f.bomber.T = 30; f.bomber.t = 1;
  await sleep(500);
  r.locked = ['p1', 'p2', 'ult'].map(k => f.abilityLocked(k));
  r.cmds = w.bomberG.commandBuffer.length; r.ret = !!f.bomber.ret;
  f.gun = true; await sleep(300); r.cmdsGun = w.bomberG.commandBuffer.length;
  f.cds.ult = 50; await sleep(200); r.cmdsNoR = w.bomberG.commandBuffer.length;
  r.pt0 = [Math.round(f.bomber.pt.x), Math.round(f.bomber.pt.y)];
  return r;
});
console.log(JSON.stringify(out)); await p.screenshot({ path: 'art/review_8dir/_yonmirror.png' }); console.log(errs[0] || 'no errors'); await b.close();
