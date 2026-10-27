import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 200)));
await p.goto('http://localhost:5173/#mode=1&keep=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
for (const paused of [false, true]) {
  console.log('--- leave with paused =', paused);
  await p.evaluate(`(() => { const a = window.__arena; if (${paused}) a.togglePause(); a.scene.get('hud').leave(); })()`);
  await new Promise(r => setTimeout(r, 1500));
  console.log('scenes:', await p.evaluate(`window.__game ? 1 : (() => { const g = window.__arena.game; return g.scene.getScenes(true).map(s => s.scene.key).join(','); })()`));
  await p.evaluate(`(() => { const g = window.__arena.game; g.scene.start('arena', { mode: 1, player: 'leandro', enemies: ['xeviche'], allies: [], team: 0, haveSprites: g.registry.get('sprites') }); })()`);
  await new Promise(r => setTimeout(r, 6000));
  console.log(await p.evaluate(`(() => { const a = window.__arena || null, g = (a || {}).game; const ar = g.scene.getScene('arena'); const t0 = ar.gameT; return JSON.stringify({ active: g.scene.getScenes(true).map(s => s.scene.key), gameT: +ar.gameT.toFixed(2), paused: ar.paused, timePaused: ar.time.paused, tweensPaused: ar.tweens.paused, player: [Math.round(ar.player.x), ar.player.alive] }); })()`));
  await new Promise(r => setTimeout(r, 2000));
  console.log('gameT later', await p.evaluate(`window.__arena.game.scene.getScene('arena').gameT.toFixed(2)`));
}
await b.close();
