import puppeteer from 'puppeteer-core';
const kind = process.argv[2] || 'beast', secs = +(process.argv[3] || 14);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader','--use-gl=angle','--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`http://localhost:5199/#char=luis&noai=1&nofog=1&keep=1&boss=${kind}&bt=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.bosses, { timeout: 90000 });
const sleep = t => new Promise(r => setTimeout(r, t)); await sleep(2500);
const where = { beast: 'LAIR_BEAST', captain: 'CAMP_CAPTAIN', robot: null };
await p.evaluate(k => { const w = window.__arena, f = w.player; f.hp = f.maxHp = 99999; f.invulT = 0; const P = { beast: [3033, 2330], captain: [4364, 340], robot: [3744, 1755] }[k]; f.x = P[0] - (k === 'robot' ? 600 : 260); f.y = P[1] + (k === 'robot' ? 400 : 0); f.setAim(1, 0); w.camTarget.x = P[0]; w.camTarget.y = P[1]; window.__keep = setInterval(() => { f.hp = f.maxHp; }, 200); }, kind);
const st = () => p.evaluate(k => { const w = window.__arena, b = w.bosses[k]; const bf = b.f; return JSON.stringify({ t: Math.round(b.t), phase: b.phase, boss: bf ? [Math.round(bf.x), Math.round(bf.y), Math.round(bf.hp), bf.state, bf.curName] : null, n: w.fighters.length, plane: !!w.plane, tele: w.tele.length }); }, kind);
for (let i = 0; i < secs / 2; i++) { await sleep(2000); console.log(await st()); if (i === 3) await p.screenshot({ path: `art/review_8dir/_boss_${kind}.png` }); }
console.log('errors:', [...new Set(errs)].slice(0, 6).join('\n') || 'none'); await b.close();
