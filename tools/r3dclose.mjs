// Close-up of the player model in 3D mode at several moments (idle / run) to judge look and animation: node tools/r3dclose.mjs [char]
import puppeteer from 'puppeteer-core';
const char = process.argv[2] || 'xeviche';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto(`http://localhost:5173/#char=${char}&train=1&keep=1&noai=1&nofog=1&3d=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t));
await sleep(5000);
await p.evaluate(() => { const a = window.__arena; a.zoom = 2.4; a.snapZoom = true; });
await sleep(1500);
const clip = { x: 440, y: 120, width: 400, height: 460 };
for (let i = 0; i < 4; i++) { await p.screenshot({ path: `shot_close_idle${i}.png`, clip }); await sleep(450); }
await p.keyboard.down('d'); await sleep(900);
for (let i = 0; i < 3; i++) { await p.screenshot({ path: `shot_close_run${i}.png`, clip }); await sleep(120); }
await p.keyboard.up('d');
console.log(await p.evaluate(() => { const u = window.__arena.r3d?.units?.get?.(window.__arena.player) || null; return JSON.stringify({ hasUnits: !!window.__arena.r3d }); }));
await b.close();
