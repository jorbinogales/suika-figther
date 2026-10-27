import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'] });
const check = async (name, setup) => { const p = await b.newPage(); await setup(p); await p.goto('http://localhost:5173/', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 6000));
  console.log(name, await p.evaluate(`JSON.stringify({ blocked: !!window.__mobileBlocked, text: document.querySelector('#loading .st')?.textContent, canvas: !!document.querySelector('canvas'), launcher: !!document.querySelector('#ui') })`)); if (name === 'iPhone') await p.screenshot({ path: 'D:/mycowork/game/shot_mobile.png' }); await p.close(); };
await check('iPhone', async p => { await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); });
await check('Android', async p => { await p.setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'); await p.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true }); });
await check('Desktop', async p => { await p.setViewport({ width: 1366, height: 768 }); });
await b.close();
