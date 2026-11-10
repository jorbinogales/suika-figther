import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5199/#mode=3&keep=1&nofog=1', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
const out = await p.evaluate(() => {
  const a = window.__arena; a.audio.play = () => {}; a.audio.playAll = () => {}; a.audio.voice = () => {};
  let t = 0; const step = n => { for (let i = 0; i < n; i++) { t += 16.7; a.update(a.time.now + t, 16.7); } };
  const o = [];
  for (let k = 1; k <= 4; k++) { step(60 * 40); o.push('t' + k * 40 + ' ' + a.champs.filter(c => c !== a.player).map(c => c.key[0] + c.team + '@' + Math.round(c.x) + ',' + Math.round(c.y) + (c.alive ? '' : 'X')).join(' ') + ' camps=' + a.camps.map(c => c.owner ?? '-').join('')); }
  return o.join('|');
});
console.log(out); await b.close();
