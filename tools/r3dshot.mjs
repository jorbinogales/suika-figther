// 3D view (#3d=1) smoke test + screenshots: node tools/r3dshot.mjs [--gpu]
// shot_3d_start / _move / _enemy / _fight / _match .png in the game folder; checks pageerrors with and without the flag,
// cursor picking on the ground (aim + click attack + click selection) and the frame rate of a full match.
import puppeteer from 'puppeteer-core';
const GPU = process.argv.includes('--gpu');
const args = GPU ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'] : ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'];
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args, defaultViewport: { width: 1280, height: 720 } });
const sleep = t => new Promise(r => setTimeout(r, t));
const errors = [];
async function open(hash) {
  const p = await b.newPage();
  p.on('pageerror', e => { errors.push(`[${hash}] ${e.message}`); console.log('[pageerror]', hash, e.message, (e.stack || '').split('\n')[1]); });
  p.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 200)); });
  await p.goto('http://localhost:5173/#' + hash, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
  return p;
}
const fps = (p, ms = 3000) => p.evaluate(ms => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else r(Math.round(n * 1000 / (performance.now() - t0))); }; requestAnimationFrame(f); }), ms);
const out = {};

// ---- 2D (no flag): must keep working, no 3D renderer ----
{
  const p = await open('char=xeviche&train=1&keep=1&noai=1&nofog=1');
  await sleep(4000);
  out.flat = await p.evaluate(() => ({ r3d: !!window.__arena.r3d, canvases: document.querySelectorAll('canvas').length }));
  await p.close();
}

// ---- 3D training zone ----
{
  const p = await open('char=xeviche&train=1&keep=1&noai=1&nofog=1&3d=1');
  await p.waitForFunction(() => window.__arena.r3d?.forestCount > 0, { timeout: 60000 });
  await sleep(2500);   // GLB fetch + parse
  out.setup = await p.evaluate(() => { const a = window.__arena; return { canvases: document.querySelectorAll('canvas').length, forest: a.r3d.forestCount, units: a.r3d.units.size, glb: [...a.r3d.units.values()].filter(u => u.glb).length, player: [Math.round(a.player.x), Math.round(a.player.y)], enemy: a.enemy.key }; });
  await p.screenshot({ path: 'shot_3d_start.png' });

  // move with the keyboard (WASD is the game's movement)
  await p.mouse.move(900, 360);
  const p0 = await p.evaluate(() => [window.__arena.player.x, window.__arena.player.y]);
  await p.keyboard.down('KeyD'); await p.keyboard.down('KeyS'); await sleep(900); await p.keyboard.up('KeyS'); await sleep(500); await p.keyboard.up('KeyD');
  const p1 = await p.evaluate(() => [window.__arena.player.x, window.__arena.player.y]);
  out.moved = [Math.round(p1[0] - p0[0]), Math.round(p1[1] - p0[1])];
  await p.screenshot({ path: 'shot_3d_move.png' });

  // cursor on the ground: the aim must point at the ground point under the cursor
  out.aim = await p.evaluate(async () => {
    const a = window.__arena, r = a.r3d, pl = a.player, tx = pl.x - 150, ty = pl.y - 200, s = r.toScreen(tx, 0, ty), sx = s.x, sy = s.y;
    const g = r.groundAt(sx, sy); return { sx: Math.round(sx), sy: Math.round(sy), back: [Math.round(g.x - tx), Math.round(g.y - ty)], tx, ty };
  });
  await p.mouse.move(out.aim.sx, out.aim.sy); await sleep(200);
  out.aim.dot = await p.evaluate(({ tx, ty }) => { const pl = window.__arena.player, dx = tx - pl.x, dy = ty - pl.y, l = Math.hypot(dx, dy); return +((pl.ax * dx + pl.ay * dy) / l).toFixed(3); }, out.aim);

  // walk toward the dummy so it is well in view
  await p.keyboard.down('KeyD'); await sleep(700); await p.keyboard.up('KeyD'); await sleep(300);
  await p.screenshot({ path: 'shot_3d_enemy.png' });

  // click on the enemy: selects it; hold the button: basic attacks toward it
  const es = await p.evaluate(() => { const a = window.__arena, e = a.enemy, s = a.r3d.toScreen(e.x, e.def.height * 0.5, e.y); return { x: s.x, y: s.y, hp: e.hp, d: Math.round(Math.hypot(e.x - a.player.x, e.y - a.player.y)) }; });
  await p.mouse.move(es.x, es.y); await sleep(100); await p.mouse.down(); await sleep(250);
  out.selected = await p.evaluate(() => window.__arena.selected === window.__arena.enemy);
  await sleep(700); await p.screenshot({ path: 'shot_3d_fight.png' }); await sleep(800); await p.mouse.up();
  out.fight = await p.evaluate(hp0 => { const a = window.__arena, e = a.enemy; return { dist: Math.round(Math.hypot(e.x - a.player.x, e.y - a.player.y)), hpLost: Math.round(hp0 - e.hp), state: a.player.state }; }, es.hp);
  out.fpsTrain = await fps(p);
  await p.close();
}

// ---- 3D full match: 10 champions, towers, nexus, minion waves ----
{
  const p = await open('char=xeviche&mode=5&keep=1&nofog=1&wave=0.5&3d=1');
  await p.waitForFunction(() => window.__arena.r3d?.forestCount > 0, { timeout: 60000 });
  await sleep(8000);
  await p.evaluate(() => { const a = window.__arena; for (let i = 0; i < 12 && a.fighters.filter(f => f.isMinion).length < 40; i++) { a.spawnWave(0); a.spawnWave(1); } });   // stress: ~40 minions
  await sleep(6000);
  out.match = await p.evaluate(() => { const a = window.__arena; return { fighters: a.fighters.length, minions: a.fighters.filter(f => f.isMinion).length, units: a.r3d.units.size, calls: a.r3d.renderer.info.render.calls, tris: a.r3d.renderer.info.render.triangles }; });
  out.fpsMatch = await fps(p);
  await p.evaluate(() => { const a = window.__arena; a.player.x = 1300; a.player.y = 760; });
  await sleep(1500); await p.screenshot({ path: 'shot_3d_match.png' });
  // leaving the match must free the renderer
  out.teardown = await p.evaluate(async () => { const a = window.__arena, r = a.r3d; a.scene.stop('hud'); a.scene.start('launcher'); await new Promise(r => setTimeout(r, 1500)); return { dead: r.dead, canvases: document.querySelectorAll('canvas').length }; });
  await p.close();
}
out.pageerrors = errors.length;
console.log(JSON.stringify(out, null, 1));
await b.close();
