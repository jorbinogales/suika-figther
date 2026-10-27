import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#train=1&keep=1&noai=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
const [cx, cy, z] = process.argv.slice(2).map(Number);
await p.evaluate(`(() => { const a = window.__arena; a.handleInput = () => {}; a.camTarget.x = ${cx || 1600}; a.camTarget.y = ${cy || 750}; a.cameras.main.stopFollow(); a.cameras.main.centerOn(${cx || 1600}, ${cy || 750}); a.cameras.main.setZoom(${z || 0.8}); a.update = function () {}; a.scene.get('hud').scene.setVisible(false); })()`);
await new Promise(r => setTimeout(r, 800)); await p.screenshot({ path: 'D:/mycowork/game/shot_map.png' }); await b.close();
