// node tools/aimtest.mjs <outPrefix> "<hash>" <key> <mouseX> <mouseY> [afterMs]
// presses an ability key, moves the mouse, screenshots the aim preview, clicks, screenshots the result
import puppeteer from 'puppeteer-core';
const [out, hash, key, mx, my, afterMs = '700'] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'], defaultViewport: { width: 1600, height: 900 } });
const p = await b.newPage();
p.on('console', m => { const t = m.text(); if (/dbg|rror/i.test(t)) console.log('[page]', t.slice(0, 160)); });
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:5173/#' + hash, { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 9000));
await p.mouse.move(+mx, +my);
await p.keyboard.press(key, { delay: 120 });
await new Promise(r => setTimeout(r, 400));
await p.screenshot({ path: out + '_aim.png' });
await p.mouse.click(+mx, +my, { delay: 120 });
await new Promise(r => setTimeout(r, +afterMs));
await p.screenshot({ path: out + '_cast.png' });
await b.close();
