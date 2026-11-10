import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
const sleep = ms => new Promise(r => setTimeout(r, ms));
await p.goto('http://localhost:5199/#train=1&keep=1&noai=1&nofog=1&char=leandro', { waitUntil: 'load' }); await sleep(10000);
const run = async (body, name) => { const r = await p.evaluate(`(() => { const a = window.__arena, f = a.player, e = a.enemy; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {}; const step = n => { for (let i = 0; i < n; i++) a.update(a.time.now + i * 16, 16.7); }; ${body} })()`); await sleep(500); await p.screenshot({ path: 'D:/mycowork/game/' + name }); return r; };
await run("['p1','p2','p3','ult'].forEach(k => { f.ranks[k] = 0; f.setBranch(k, 1); f.ranks[k] = 1; }); f.mana = f.maxMana = 9999; e.ai = false; f.x = 1600; f.y = 750; e.x = 1900; e.y = 760; a.handleInput = () => {}; step(5); a.aimKey = 'p2'; a.cameras.main.stopFollow(); a.cameras.main.centerOn(1750, 720); return 1;", 'shot_aim_pull.png');

await run("a.k.run.isDown = false; a.cancelAim(); f.cds.ult = 0; f.tryCast('ult'); step(60); f.castPoint = { x: e.x, y: e.y }; f.tryCast('ult'); step(60); a.cameras.startFollow?.call; a.cameras.main.centerOn(f.x, f.y); return a.cages.length + ' ultb=' + a.anims.exists('leandro_ultb') + ' p1b=' + a.anims.exists('leandro_power1b') + ' floor=' + a.textures.exists('virtual_floor') + ' hidden=' + a.sceneryHidden.size;", 'shot_cage_in.png');
await run("a.cages[0].inside.delete(f); a.cages[0].t = 5; step(3); a.cameras.main.centerOn(a.cages[0].x, a.cages[0].y); return 1;", 'shot_cage_out.png');
await b.close();
