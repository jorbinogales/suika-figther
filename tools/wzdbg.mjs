import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader','--use-gl=angle','--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5199/#char=luis&noai=1&nofog=1&keep=1&boss=robot&bt=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.bosses, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(9000);
console.log(await p.evaluate(() => { const w = window.__arena, c = {}; (w.mapSprites||[]).forEach(o => { if (!o.scene) return; const k = (o.texture?.key)+'|'+(o.frame?.name); if (Math.hypot(o.x-3744,(o.y-1755)/0.92)<900) c[k]=(c[k]||0)+1; }); return JSON.stringify({ c, burn: w.burnTrees?.length, bushes: w.bushes?.length }); }));
console.log(errs.join('\n')||'none'); await b.close();
