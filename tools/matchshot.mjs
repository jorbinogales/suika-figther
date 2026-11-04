// Match screenshot + console errors + texture memory estimate: node tools/matchshot.mjs [char] [mode]  -> shot_match.png
import puppeteer from 'puppeteer-core';
const char = process.argv[2] || 'xeviche', mode = process.argv[3] || '5';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'], defaultViewport: { width: 1280, height: 720 } });
const p = await b.newPage(); const errs = [];
p.on('response', r => { if (r.status() === 404) errs.push('404 ' + r.url().slice(0, 120)); }); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error' || /missing/.test(m.text())) errs.push(m.text().slice(0, 160)); });
await p.goto(`http://localhost:5173/#char=${char}&mode=${mode}&nofog=1`, { waitUntil: 'load' });
await p.waitForFunction(() => window.__arena?.player && window.__arena.fighters?.length, { timeout: 90000 });
await new Promise(r => setTimeout(r, 7000));
const info = await p.evaluate(() => {
  const a = window.__arena, tm = a.textures, out = { fighters: a.fighters.length, atlases: 0, atlasMB: 0, frames: 0 };
  for (const k of tm.getTextureKeys()) { const t = tm.get(k); if (t.frameTotal > 20 && t.source[0]) { out.atlases++; out.atlasMB += t.source[0].width * t.source[0].height * 4 / 1e6; out.frames += t.frameTotal; } }
  out.atlasMB = Math.round(out.atlasMB); const f = a.player; out.anim = f.spr.anims.currentAnim?.key; out.frame = f.spr.frame.name; return out;
});
console.log(JSON.stringify(info)); console.log('errors:', errs.length ? errs.join('\n') : 'none');
await p.screenshot({ path: 'shot_match.png' }); await b.close();
