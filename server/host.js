// Headless match hosts: one Chromium (puppeteer-core) shared by the whole server, one isolated browser context (= its own renderer
// process) per running match. Each context loads the game with ?bot=<secret> and runs the same Arena as host (src/launcher.js botStart).
import fs from 'node:fs';

const CANDIDATES = [process.env.CHROME_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].filter(Boolean);
export const chromePath = CANDIDATES.find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } }) || null;
export const hostEnabled = process.env.HEADLESS_HOST === 'fake' || (process.env.HEADLESS_HOST !== '0' && !!chromePath);

const ARGS = ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--mute-audio', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-background-networking', '--disable-sync', '--disable-component-update',
  // every match page must keep its full frame rate although none of them is ever on screen
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  '--js-flags=--max-old-space-size=512'];

let browserP = null;
const pages = new Map();   // key (room code) -> { ctx, page, t0 }

async function browser() {
  if (!browserP) {
    const { default: puppeteer } = await import('puppeteer-core');
    browserP = puppeteer.launch({ executablePath: chromePath, headless: true, args: ARGS, defaultViewport: { width: 320, height: 180 } })
      .then((b) => { b.on('disconnected', () => { browserP = null; pages.clear(); }); return b; })
      .catch((e) => { browserP = null; throw e; });
  }
  return browserP;
}

// opens a host page for `key`; resolves once the page is loading (the game then connects back to /ws by itself)
export async function openHost(key, url) {
  await closeHost(key);
  const b = await browser(), ctx = await b.createBrowserContext(), page = await ctx.newPage();
  const entry = { ctx, page, t0: Date.now() }; pages.set(key, entry);
  page.on('pageerror', (e) => console.error(`[host ${key}] pageerror`, String(e.stack || e.message).split('\n').slice(0, 6).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) console.error(`[host ${key}]`, m.text().slice(0, 300)); });
  page.on('error', (e) => { console.error(`[host ${key}] crashed`, e.message); closeHost(key); });
  page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((e) => { console.error(`[host ${key}] load failed`, e.message); closeHost(key); });
  return entry;
}

export async function closeHost(key, only) {   // only: close it just if that is still the page of `key`
  const e = pages.get(key); if (!e || (only && e !== only)) return;
  pages.delete(key);
  await e.ctx.close().catch(() => {});
  // ponytail: the browser stays up between matches (a cold start costs ~1 s); it is closed only when the server stops
}

export async function stopAll() {
  for (const k of [...pages.keys()]) await closeHost(k);
  const b = browserP && (await browserP.catch(() => null)); browserP = null;
  await b?.close().catch(() => {});
}

// diagnostics for /api/host/stats: per page tick rate + JS heap, and (Linux) CPU / RSS of every chromium process
export async function stats() {
  const rooms = [];
  for (const [key, e] of pages) {
    const s = await e.page.evaluate(() => { const g = window.__phaserGame, a = window.__arena; return { fps: g ? Math.round(g.loop.actualFps * 10) / 10 : 0, gameT: a ? Math.round(a.gameT) : null, units: a?.fighters?.length ?? null, over: !!a?.over }; }).catch(() => null);
    const m = await e.page.metrics().catch(() => null);
    rooms.push({ key, ageS: Math.round((Date.now() - e.t0) / 1000), ...s, heapMB: m ? Math.round(m.JSHeapUsedSize / 1048576) : null, taskS: m ? Math.round(m.TaskDuration * 10) / 10 : null });
  }
  const b = browserP && (await browserP.catch(() => null));
  return { rooms, browserPid: b?.process()?.pid ?? null, proc: procTree(b?.process()?.pid) };
}

// /proc walk (Linux only): node itself + every descendant of the chromium main process. cpu in core-seconds, mem in MB.
function procTree(root) {
  if (process.platform !== 'linux') return null;
  const HZ = 100, read = (pid) => { try { const s = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'), f = s.slice(s.lastIndexOf(')') + 2).split(' '); return { ppid: +f[1], cpu: (+f[11] + +f[12]) / HZ, mem: (+f[21] * 4096) / 1048576 }; } catch { return null; } };
  const all = {}; for (const d of fs.readdirSync('/proc')) if (/^\d+$/.test(d)) { const r = read(d); if (r) all[d] = r; }
  const ids = root ? [String(root)] : [];
  for (let i = 0; i < ids.length; i++) for (const k in all) if (String(all[k].ppid) === ids[i] && !ids.includes(k)) ids.push(k);
  const host = ids.filter((i) => all[i]).reduce((s, i) => ({ cpu: s.cpu + all[i].cpu, mem: s.mem + all[i].mem, n: s.n + 1 }), { cpu: 0, mem: 0, n: 0 });
  const me = read(process.pid), cores = fs.readFileSync('/proc/cpuinfo', 'utf8').split('\n').filter((l) => l.startsWith('processor')).length;
  let limit = null; try { const [q, p] = fs.readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim().split(' '); if (q !== 'max') limit = +q / +p; } catch { /* cgroup v1 / none */ }
  return { node: me && { cpu: me.cpu, mem: me.mem }, host, cores, cpuLimit: limit };
}
