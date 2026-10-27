// counts sounds played in a scripted scenario (headless: audio contexts exist but are muted)
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'], defaultViewport: { width: 1600, height: 900 } });
const p = await b.newPage();
p.on('pageerror', e => console.log('[pageerror]', e.message));
p.on('console', m => { if (/rror/i.test(m.text()) && !/GL Driver|404/.test(m.text())) console.log('[c]', m.text().slice(0, 200)); });
await p.goto('http://localhost:5173/#' + process.argv[2], { waitUntil: 'load' });
await new Promise(r => setTimeout(r, 9000));
console.log(await p.evaluate(`(() => { const a = window.__arena, played = {}; const orig = a.sound.play.bind(a.sound); a.sound.play = (k, c) => { played[k.replace(/_\d+\.?.*$/, '').replace('sfx_', '')] = (played[k.replace(/_\d+\.?.*$/, '').replace('sfx_', '')] || 0) + 1; return orig(k, c); };
 const p = a.player, e = a.enemy; a.handleInput = () => {}; const t = s => { for (let i = 0; i < s * 60; i++) a.update(a.time.now + i * 16, 16.7); };
 e.x = p.x + 90; e.y = p.y; p.setAim(1, 0); p.mana = 999; p.tryBasic(); t(1); ['p1','p2','p3','ult'].forEach(k => { p.cds[k] = 0; p.state = 'idle'; p.tryCast(k); t(1.2); });
 a.damage(p, e, 99999, 'true'); t(1); return JSON.stringify({ music: !!a.audio.cur, played, loaded: Object.keys(a.cache.audio.entries.entries).length }) })()`));
await b.close();
