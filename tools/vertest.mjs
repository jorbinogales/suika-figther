import puppeteer from 'puppeteer-core';
import { execSync } from 'node:child_process';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto('http://localhost:3056/', { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 12000));
console.log('old build running:', await p.evaluate(`!!document.querySelector('#ui')`), 'url', p.url());
execSync('npm run build', { cwd: 'D:/mycowork/game', env: { ...process.env, BUILD_ID: 'v2-test' }, stdio: 'ignore' });   // server now publishes a newer id
await new Promise(r => setTimeout(r, 4000)); await p.evaluate(`window.dispatchEvent(new Event('focus'))`); await new Promise(r => setTimeout(r, 6000));
console.log('after new build: url', p.url(), 'overlay gone', !(await p.evaluate(`!!document.querySelector('#newver')`)), 'launcher', await p.evaluate(`!!document.querySelector('#ui')`));
await b.close();
