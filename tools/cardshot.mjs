import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader','--use-gl=angle','--mute-audio','--autoplay-policy=no-user-gesture-required'], defaultViewport: { width: 1000, height: 760 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5199/#char=luis&noai=1&nofog=1&keep=1', { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player, { timeout: 90000 });
await p.evaluate(async () => { const v = await import('/src/versus.js'); document.body.innerHTML = '<div id="ui" style="position:fixed;inset:0;display:flex;gap:20px;padding:20px"><div style="flex:1"></div><div class="panel" style="flex:1;display:flex;flex-direction:column;min-height:0;padding:0;background:none;border:0"><div class="panel pick"><div class="bg" style="background-image:url(assets/concept/julio.webp)"></div><img class="sp" src="assets/concept/julio.webp" alt="">' + v.videoTag('julio') + '<div class="ov"><div class="sn">Julio<small>Mago</small></div></div></div></div></div>'; });
await new Promise(r => setTimeout(r, 3500)); await p.screenshot({ path: 'art/review_8dir/_card.png' });
console.log('errors:', errs.join('\n') || 'none'); await b.close();
