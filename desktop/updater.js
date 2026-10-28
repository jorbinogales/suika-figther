// Game updater for the desktop launcher: keeps <root>/game identical to the server's manifest (/api/game/manifest).
// No Electron imports: paths and callbacks are injected so it can run (and be tested) from plain Node.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export const DEFAULT_SERVER = 'https://suikafigther.hayai.com.ve';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => fs.promises.access(p).then(() => true, () => false);
const hashFile = (f) => new Promise((resolve, reject) => { const h = crypto.createHash('sha256'); fs.createReadStream(f).on('data', (d) => h.update(d)).on('error', reject).on('end', () => resolve(h.digest('hex'))); });
// manifest paths come from the network: reject anything that could escape the game folder
const safeRel = (p) => typeof p === 'string' && p !== '' && !p.startsWith('/') && !/[\\:\0]/.test(p) && !p.split('/').some((s) => s === '' || s === '.' || s === '..');

async function mapLimit(items, n, fn) {
  let i = 0, failed = false;
  const worker = async () => { while (!failed && i < items.length) { const it = items[i++]; try { await fn(it); } catch (e) { failed = true; throw e; } } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
}

async function listFiles(dir, rel = '') {
  const out = [];
  let ents = [];
  try { ents = await fs.promises.readdir(path.join(dir, rel), { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const p = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...await listFiles(dir, p)); else out.push(p);
  }
  return out;
}

// opts: server, root (userData), fetch, onProgress(state), concurrency, retries, backoffMs
export function createUpdater({ server = DEFAULT_SERVER, root, fetch: fetchFn = globalThis.fetch, onProgress = () => {}, concurrency = 4, retries = 3, backoffMs = 800 }) {
  server = server.replace(/\/+$/, '');
  const game = path.join(root, 'game'), tmp = path.join(root, 'game.tmp'), old = path.join(root, 'game.old');
  const state = { phase: 'idle', installed: null, available: null, files: { done: 0, total: 0 }, bytes: { done: 0, total: 0 } };
  let last = 0, running = null;
  const emit = (patch = {}, force = true) => {
    Object.assign(state, patch);
    const now = Date.now();
    if (force || now - last > 100) { last = now; onProgress({ ...state, files: { ...state.files }, bytes: { ...state.bytes } }); }
  };

  const installedId = () => { try { return fs.existsSync(path.join(game, 'index.html')) ? JSON.parse(fs.readFileSync(path.join(game, 'manifest.json'), 'utf8')).id || null : null; } catch { return null; } };

  async function withRetry(fn) {
    for (let a = 0; ; a++) {
      try { return await fn(); } catch (e) { if (a >= retries - 1) throw e; await sleep(backoffMs * 2 ** a); }
    }
  }

  async function getManifest() {
    const res = await fetchFn(server + '/api/game/manifest', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('El servidor respondió ' + res.status);
    const m = await res.json();
    const seen = new Set();
    if (!m || typeof m.id !== 'string' || !Array.isArray(m.files)) throw new Error('Manifest no válido');
    for (const f of m.files) {
      if (!safeRel(f.path) || seen.has(f.path) || !Number.isInteger(f.size) || f.size < 0 || !/^[0-9a-f]{64}$/.test(f.sha256)) throw new Error('Manifest no válido: ' + f.path);
      seen.add(f.path);
    }
    if (!seen.has('index.html')) throw new Error('Manifest sin index.html');
    return m;
  }

  const matches = async (file, f) => { try { const st = await fs.promises.stat(file); return st.isFile() && st.size === f.size && await hashFile(file) === f.sha256; } catch { return false; } };

  async function download(f) {
    const dest = path.join(tmp, f.path), part = dest + '.part';
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    if (await matches(dest, f)) { state.bytes.done += f.size; return; }   // left over from an interrupted run
    await withRetry(async () => {
      let counted = 0;
      try {
        const res = await fetchFn(server + '/' + f.path.split('/').map(encodeURIComponent).join('/'), { cache: 'no-store', signal: AbortSignal.timeout(300000) });
        if (!res.ok || !res.body) throw new Error(f.path + ': el servidor respondió ' + res.status);
        const h = crypto.createHash('sha256');
        await pipeline(Readable.fromWeb(res.body), async function* (src) {
          for await (const c of src) { h.update(c); counted += c.length; state.bytes.done += c.length; emit({}, false); yield c; }
        }, fs.createWriteStream(part));
        if (counted !== f.size || h.digest('hex') !== f.sha256) throw new Error(f.path + ': descarga corrupta');
        await fs.promises.rename(part, dest);
        state.files.done++; emit({}, false);
      } catch (e) {
        state.bytes.done -= counted;
        await fs.promises.rm(part, { force: true });
        throw e;
      }
    });
  }

  async function keep(f) {   // unchanged file: hard link into the staging dir (copy if the filesystem refuses)
    const src = path.join(game, f.path), dest = path.join(tmp, f.path);
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.rm(dest, { force: true });
    try { await fs.promises.link(src, dest); } catch { await fs.promises.copyFile(src, dest); }
  }

  async function run() {
    // an interrupted swap leaves the previous install in game.old
    if (!await exists(game) && await exists(old)) await fs.promises.rename(old, game);
    else await fs.promises.rm(old, { recursive: true, force: true });
    const had = installedId();
    emit({ phase: 'checking', installed: had, available: null, files: { done: 0, total: 0 }, bytes: { done: 0, total: 0 } });

    let remote;
    try { remote = await withRetry(getManifest); } catch (e) {
      if (!had) throw new Error('No se pudo conectar con el servidor para descargar el juego (' + e.message + ')');
      emit({ phase: 'offline', error: e.message });
      return { id: had, updated: false, offline: true };
    }
    emit({ phase: 'verifying', available: remote.id, error: null, files: { done: 0, total: remote.files.length } });
    const bad = [];
    await mapLimit(remote.files, 8, async (f) => { if (!await matches(path.join(game, f.path), f)) bad.push(f); state.files.done++; emit({}, false); });
    const wanted = new Set(remote.files.map((f) => f.path));
    const extras = (await listFiles(game)).filter((p) => !wanted.has(p) && p !== 'manifest.json');
    if (!bad.length && !extras.length && had === remote.id) { emit({ phase: 'done' }); return { id: remote.id, updated: false, offline: false }; }

    // stage the complete new tree in game.tmp (downloads + links), then swap folders
    await fs.promises.mkdir(tmp, { recursive: true });
    for (const p of await listFiles(tmp)) if (!wanted.has(p)) await fs.promises.rm(path.join(tmp, p), { force: true });
    emit({ phase: 'downloading', files: { done: 0, total: bad.length }, bytes: { done: 0, total: bad.reduce((s, f) => s + f.size, 0) } });
    await mapLimit(bad, concurrency, download);
    const badSet = new Set(bad.map((f) => f.path));
    await mapLimit(remote.files.filter((f) => !badSet.has(f.path)), 8, keep);
    await fs.promises.writeFile(path.join(tmp, 'manifest.json'), JSON.stringify(remote));

    emit({ phase: 'installing' });
    if (await exists(game)) await withRetry(() => fs.promises.rename(game, old));
    try { await withRetry(() => fs.promises.rename(tmp, game)); } catch (e) {
      if (await exists(old)) await fs.promises.rename(old, game);   // roll back
      throw e;
    }
    await fs.promises.rm(old, { recursive: true, force: true }).catch(() => {});
    emit({ phase: 'done', installed: remote.id });
    return { id: remote.id, updated: true, offline: false };
  }

  return {
    gameDir: game,
    installedId,
    update() { return running ||= run().finally(() => { running = null; }); },
  };
}
