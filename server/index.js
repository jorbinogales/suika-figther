// SUIKA FIGTHER launcher server: auth + news (REST) and lobby/relay (WebSocket).
import express from 'express';
import { WebSocketServer, Sender } from 'ws';
import zlib from 'node:zlib';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { hostEnabled, openHost, closeHost, stopAll as stopHosts, stats as hostStats } from './host.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(DIR, 'data');
fs.mkdirSync(DATA, { recursive: true });

const SECRET = process.env.JWT_SECRET || (() => {
  const f = path.join(DATA, '.secret');
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(48).toString('hex'));
  return fs.readFileSync(f, 'utf8').trim();
})();

const db = new Database(process.env.DB_PATH || path.join(DATA, 'devbrawl.db'));
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
)`);
const qByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const qById = db.prepare('SELECT id, email, name FROM users WHERE id = ?');
const qInsert = db.prepare('INSERT INTO users (email, name, hash, created_at) VALUES (?, ?, ?, ?)');

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name });
const sign = (u) => jwt.sign({ id: u.id }, SECRET, { expiresIn: '30d' });
const userFromToken = (t) => {
  try { return qById.get(jwt.verify(t, SECRET).id) || null; } catch { return null; }
};

// ---------- REST ----------
const app = express();
app.set('trust proxy', 1);   // behind Caddy / nginx: req.ip is the real client (rate limit)
app.use(express.json({ limit: '10kb' }));

// ponytail: in-memory per-IP counter; use a shared store if the server is ever clustered.
const hits = new Map();
const RATE_MAX = Number(process.env.RATE_MAX) || 10;
function rateLimit(req, res, next) {
  const now = Date.now(), ip = req.ip;
  let h = hits.get(ip);
  if (!h || h.reset < now) hits.set(ip, (h = { n: 0, reset: now + 60000 }));
  if (++h.n > RATE_MAX) return res.status(429).json({ error: 'Demasiados intentos, espera un minuto' });
  next();
}
setInterval(() => { const n = Date.now(); for (const [k, v] of hits) if (v.reset < n) hits.delete(k); }, 60000).unref();

const str = (v) => (typeof v === 'string' ? v : '');

app.post('/api/register', rateLimit, (req, res) => {
  const email = str(req.body?.email).trim().toLowerCase();
  const password = str(req.body?.password);
  const name = str(req.body?.name).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return res.status(400).json({ error: 'Correo electrónico no válido' });
  if (password.length < 6 || password.length > 72) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  if (name.length < 3 || name.length > 16) return res.status(400).json({ error: 'El nombre debe tener entre 3 y 16 caracteres' });
  if (qByEmail.get(email)) return res.status(409).json({ error: 'Ese correo ya está registrado' });
  const id = Number(qInsert.run(email, name, bcrypt.hashSync(password, 10), Date.now()).lastInsertRowid);
  const user = { id, email, name };
  res.json({ token: sign(user), user });
});

app.post('/api/login', rateLimit, (req, res) => {
  const u = qByEmail.get(str(req.body?.email).trim().toLowerCase());
  if (!u || !bcrypt.compareSync(str(req.body?.password), u.hash)) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  res.json({ token: sign(u), user: publicUser(u) });
});

app.get('/api/me', (req, res) => {
  const u = userFromToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
  if (!u) return res.status(401).json({ error: 'Sesión no válida' });
  res.json({ user: u });
});

app.get('/api/news', (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(path.join(DATA, 'news.json'), 'utf8')));
  } catch (e) {
    if (e.code === 'ENOENT') return res.json([]);
    res.status(500).json({ error: 'No se pudieron leer las noticias' });
  }
});

// the id of the build being served: clients compare it with the one they were built with and reload when it differs
app.get('/api/version', (req, res) => {
  res.set('Cache-Control', 'no-store');
  try { res.json(JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/version.json'), 'utf8'))); } catch (e) { res.json({ id: 'dev' }); }
});
// file list of the built game for the desktop launcher: { id, files: [{ path, size, sha256 }] }. Hashes are cached per file (path+size+mtime), so only changed files are re-read.
const GAME_DIR = path.resolve(DIR, '../dist');
const hashCache = new Map();
let manifestJob = null;
const sha256 = (f) => new Promise((resolve, reject) => { const h = crypto.createHash('sha256'); fs.createReadStream(f).on('data', (d) => h.update(d)).on('error', reject).on('end', () => resolve(h.digest('hex'))); });
async function buildManifest() {
  const files = [];
  const walk = async (dir, rel) => {
    for (const e of await fs.promises.readdir(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;   // express.static does not serve dotfiles (.gitkeep)
      const p = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { await walk(path.join(dir, e.name), p); continue; }
      if (!e.isFile()) continue;
      const abs = path.join(dir, e.name), st = await fs.promises.stat(abs);
      let c = hashCache.get(p);
      if (!c || c.size !== st.size || c.mtimeMs !== st.mtimeMs) { c = { size: st.size, mtimeMs: st.mtimeMs, sha256: await sha256(abs) }; hashCache.set(p, c); }
      files.push({ path: p, size: c.size, sha256: c.sha256 });
    }
  };
  await walk(GAME_DIR, '');
  files.sort((a, b) => (a.path < b.path ? -1 : 1));
  const live = new Set(files.map((f) => f.path));
  for (const k of hashCache.keys()) if (!live.has(k)) hashCache.delete(k);
  let id = 'dev';
  try { id = JSON.parse(await fs.promises.readFile(path.join(GAME_DIR, 'version.json'), 'utf8')).id || id; } catch { /* no build yet */ }
  return { id, files };
}
app.get('/api/game/manifest', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!fs.existsSync(path.join(GAME_DIR, 'index.html'))) return res.status(404).json({ error: 'El juego no está compilado (npm run build)' });
  try {
    manifestJob ||= buildManifest().finally(() => { manifestJob = null; });   // concurrent requests share one scan
    res.json(await manifestJob);
  } catch (e) { console.error(e); res.status(500).json({ error: 'No se pudo generar el manifest' }); }
});
// diagnostics of the headless hosts (stress tests): only with HOST_STATS_KEY set, and only with that key
app.get('/api/host/stats', async (req, res) => {
  const key = process.env.HOST_STATS_KEY;
  if (!key || req.query.key !== key) return res.status(404).json({ error: 'No encontrado' });
  res.set('Cache-Control', 'no-store');
  const s = await hostStats();
  res.json({ ...s, hostEnabled, matches: [...rooms.values()].filter((r) => r.bot).map((r) => ({ code: r.code, state: r.state, players: r.players.size, hostUp: r.bot.connected })), node: { rssMB: Math.round(process.memoryUsage().rss / 1048576) } });
});
app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado' }));
// production: the same process serves the built game (npm run build -> dist/); in development Vite does it
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (fs.existsSync(path.join(DIST, 'index.html'))) {
  // only Vite's hashed bundles are cached for good; art/sound files keep their name when they change, so they are revalidated every time (the icons of new abilities were stuck in old caches)
  app.use('/assets', express.static(path.join(DIST, 'assets'), { maxAge: 0, etag: true, setHeaders: (res, f) => { res.set('Cache-Control', /index-[\w-]+\.(js|css)$/.test(f) ? 'public, max-age=31536000, immutable' : 'no-cache'); } }));
  app.use(express.static(DIST, { maxAge: 0, etag: true, setHeaders: (res, f) => { if (/\.html$|version\.json$/.test(f)) res.set('Cache-Control', 'no-cache, no-store, must-revalidate'); } }));
}
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.type === 'entity.parse.failed' ? 'JSON no válido' : 'Error del servidor' });
});

// ---------- Lobby / rooms ----------
const MAX_PLAYERS = 10, MAX_TEAM = 5;
const GRACE_MS = Number(process.env.GRACE_MS) || 10000;
const LOAD_MS = Number(process.env.LOAD_MS) || 60000;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rooms = new Map();      // code -> room
const userRoom = new Map();   // userId -> code
const sockets = new Map();    // userId -> ws

const sendRaw = (ws, s) => { if (ws && ws.readyState === 1) ws.send(s, { compress: false }); };   // never per-socket deflate: see toRoomZ
const send = (ws, msg) => sendRaw(ws, JSON.stringify(msg));
const err = (ws, msg) => send(ws, { t: 'error', msg });
const teamCount = (room, t) => [...room.players.values()].filter((p) => p.team === t).length;
const playerList = (room) => [...room.players.values()].map((p) => ({
  id: p.id, name: p.name, team: p.team, champ: p.champ, locked: !!p.locked, ready: p.ready, host: p.id === room.host, connected: p.connected,
}));
// serialised once for the whole room (snapshots go to up to 10 sockets); the room's headless host gets it too
const toRoom = (room, msg, except) => {
  const s = JSON.stringify(msg);
  for (const p of room.players.values()) if (p.id !== except) sendRaw(sockets.get(p.id), s);
  if (room.bot && room.bot.id !== except) sendRaw(sockets.get(room.bot.id), s);
};
const toRoomRaw = (room, s, except) => {
  for (const p of room.players.values()) if (p.id !== except) sendRaw(sockets.get(p.id), s);
};
// The host's broadcasts (60 snapshots/s) are compressed ONCE per room, not once per socket. permessage-deflate with context takeover:
// a socket's inflater window is the text of the compressed messages it got so far. Every player of the room gets the same broadcasts,
// so one deflate with the last 8 KB of that text as dictionary is a valid continuation for all of them, and the same frame is written
// to every socket. Everything else a player receives goes uncompressed (sendRaw), which keeps those windows identical. A socket that
// joins (or misses one, z.gen = -1) gets plain copies until the next reset (every 2 s), where it starts with everybody else.
const ZDICT = 8192, ZRESET_MS = 2000, Z_LEVEL = Number(process.env.WS_DEFLATE_LEVEL) || 3;
const zOk = (ws) => { const p = ws._extensions?.['permessage-deflate']?.params; return !!p && !p.server_no_context_takeover && !(p.server_max_window_bits < 15); };
function toRoomZ(room, s, except) {
  if (!DEFLATE) return toRoomRaw(room, s, except);
  const z = (room.z ||= { gen: 0, t: 0, dict: null }), now = Date.now(), buf = Buffer.from(s);
  if (now - z.t >= ZRESET_MS) {
    z.gen++; z.t = now; z.dict = null;
    for (const p of room.players.values()) { const ws = sockets.get(p.id); if (ws?.readyState === 1 && zOk(ws)) { ws.z = z; ws.zGen = z.gen; } }
  }
  const out = zlib.deflateRawSync(buf, { level: Z_LEVEL, memLevel: 7, windowBits: 15, finishFlush: zlib.constants.Z_SYNC_FLUSH, ...(z.dict && { dictionary: z.dict }) });
  const frame = Sender.frame(out.subarray(0, out.length - 4), { fin: true, rsv1: true, opcode: 1, mask: false, readOnly: true });   // RFC 7692: without the trailing 00 00 ff ff
  const d = z.dict ? Buffer.concat([z.dict, buf]) : buf; z.dict = d.length > ZDICT ? d.subarray(d.length - ZDICT) : d;
  for (const p of room.players.values()) {
    const ws = sockets.get(p.id); if (!ws || ws.readyState !== 1) continue;
    if (p.id === except) { if (ws.z === z) ws.zGen = -1; continue; }   // it misses this one: its window is no longer the room's
    if (ws.z === z && ws.zGen === z.gen && ws._sender._state === 0) ws._sender.sendFrame(frame);   // _state 0: nothing queued in ws's own sender
    else { if (ws.z === z) ws.zGen = -1; sendRaw(ws, s); }
  }
}
const HOST_BCAST = '{"t":"relay","to":null,"data":';   // exactly how net.js serialises a broadcast relay ({ t, to: null, data })
const roomMsg = (room) => ({ t: 'room', code: room.code, public: room.public, host: room.host, state: room.state, players: playerList(room), ...(room.bot && { hostUp: room.bot.connected }) });
const pushRoom = (room) => toRoom(room, roomMsg(room));

function newCode() {
  let c;
  do { c = Array.from({ length: 6 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join(''); } while (rooms.has(c));
  return c;
}

function addPlayer(room, user) {
  const team = teamCount(room, 0) <= teamCount(room, 1) ? 0 : 1;
  room.players.set(user.id, { id: user.id, name: user.name, team, champ: null, ready: false, connected: true, timer: null });
  userRoom.set(user.id, room.code);
}

function createRoom(user, isPublic) {
  const room = { code: newCode(), public: isPublic, host: user.id, state: 'lobby', players: new Map(), loaded: new Set(), loadTimer: null };
  rooms.set(room.code, room);
  addPlayer(room, user);
  return room;
}

function removePlayer(room, id) {
  const p = room.players.get(id);
  if (!p) return;
  clearTimeout(p.timer);
  room.players.delete(id);
  room.loaded.delete(id);
  userRoom.delete(id);
  if (!room.players.size) { clearTimeout(room.loadTimer); endBot(room); rooms.delete(room.code); return; }
  if (room.host === id) {
    const all = [...room.players.values()];
    room.host = (all.find((q) => q.connected) || all[0]).id;
  }
  pushRoom(room);
  checkLoaded(room);
}

function go(room) {
  clearTimeout(room.loadTimer);
  room.state = 'playing';
  toRoom(room, { t: 'go' });
  pushRoom(room);
}
function checkLoaded(room) {
  if (room.state !== 'loading') return;
  const need = [...room.players.values()].filter((p) => p.connected);
  if (need.every((p) => room.loaded.has(p.id)) && (!room.bot || room.bot.loaded)) go(room);
}

// ---- server-hosted matches: a headless Chromium (server/host.js) runs the Arena as host; every player is a client ----
// The host joins as a bot user that is not a room player: negative id, no champion, authenticated by a one-time secret.
const HOST_URL = process.env.HOST_URL || null;   // page the host loads (default: this server); dev: http://localhost:5173/
const bots = new Map();   // secret -> { id, code }
let botSeq = 0, selfPort = 0;
async function startBot(room) {
  const secret = crypto.randomBytes(24).toString('hex'), id = -(++botSeq);
  room.bot = { id, secret, connected: false, loaded: false };
  bots.set(secret, { id, code: room.code });
  userRoom.set(id, room.code);
  const url = new URL(HOST_URL || `http://127.0.0.1:${selfPort}/`); url.searchParams.set('bot', secret);
  if (process.env.HEADLESS_HOST === 'fake') return;   // fake: server tests connect as the host themselves
  const e = await openHost(room.code, url.toString());
  if (room.bot?.id !== id) closeHost(room.code, e);   // the room ended while Chromium was starting: endBot found no page to close
}
function endBot(room) {
  const b = room.bot; if (!b) return;
  room.bot = null; bots.delete(b.secret); userRoom.delete(b.id);
  sockets.get(b.id)?.terminate(); sockets.delete(b.id);
  closeHost(room.code);
}

function onDisconnect(user) {
  if (user.bot) {   // the host page lost its socket (crash, closed): players see "anfitrión desconectado" after a while
    const room = rooms.get(user.room);
    if (room?.bot?.id === user.id) { room.bot.connected = false; pushRoom(room); }
    return;
  }
  const room = rooms.get(userRoom.get(user.id));
  const p = room?.players.get(user.id);
  if (!p) return;
  p.connected = false;
  if (room.state === 'lobby') {
    p.timer = setTimeout(() => removePlayer(room, user.id), GRACE_MS);
  } else if (![...room.players.values()].some((q) => q.connected)) {
    // nobody left in a running game: drop the whole room
    for (const q of [...room.players.values()]) removePlayer(room, q.id);
    return;
  }
  pushRoom(room);
  checkLoaded(room);
}

const needRoom = (ws, user) => {
  const room = rooms.get(userRoom.get(user.id));
  if (!room) err(ws, 'No estás en ninguna sala');
  return room;
};

const BOT_MSGS = new Set(['relay', 'loaded', 'host_over']);   // all a host page may send
const handlers = {
  ping(ws, user, m) { send(ws, { t: 'pong', ts: Number(m.ts) || 0 }); },
  quick_join(ws, user) {
    if (userRoom.has(user.id)) return err(ws, 'Ya estás en una sala');
    let room = [...rooms.values()].find((r) => r.public && r.state === 'lobby' && r.players.size < MAX_PLAYERS);
    if (room) addPlayer(room, user); else room = createRoom(user, true);
    pushRoom(room);
  },
  create_room(ws, user, m) {
    if (userRoom.has(user.id)) return err(ws, 'Ya estás en una sala');
    pushRoom(createRoom(user, !!m.public));
  },
  join_room(ws, user, m) {
    if (userRoom.has(user.id)) return err(ws, 'Ya estás en una sala');
    const room = rooms.get(str(m.code).trim().toUpperCase());
    if (!room) return err(ws, 'No existe una sala con ese código');
    if (room.state !== 'lobby') return err(ws, 'La partida ya ha comenzado');
    if (room.players.size >= MAX_PLAYERS) return err(ws, 'La sala está llena');
    addPlayer(room, user);
    pushRoom(room);
  },
  leave_room(ws, user) {
    const room = needRoom(ws, user);
    if (room) removePlayer(room, user.id);
  },
  pick_champ(ws, user, m) {
    const room = needRoom(ws, user); if (!room) return;
    if (room.state !== 'lobby') return err(ws, 'La partida ya ha comenzado');
    if (typeof m.key !== 'string' || !m.key || m.key.length > 40) return err(ws, 'Campeón no válido');
    const p = room.players.get(user.id); p.champ = m.key; p.locked = true;   // choosing = confirming (the client only sends this on 'Seleccionar' / double click)
    pushRoom(room);
  },
  unlock_champ(ws, user) {
    const room = needRoom(ws, user); if (!room) return;
    if (room.state !== 'lobby') return err(ws, 'La partida ya ha comenzado');
    room.players.get(user.id).locked = false;
    pushRoom(room);
  },
  set_ready(ws, user, m) {
    const room = needRoom(ws, user); if (!room) return;
    if (room.state !== 'lobby') return err(ws, 'La partida ya ha comenzado');
    room.players.get(user.id).ready = !!m.ready;
    pushRoom(room);
  },
  set_team(ws, user, m) {
    const room = needRoom(ws, user); if (!room) return;
    if (room.state !== 'lobby') return err(ws, 'La partida ya ha comenzado');
    if (m.team !== 0 && m.team !== 1) return err(ws, 'Equipo no válido');
    const p = room.players.get(user.id);
    if (p.team === m.team) return;
    if (teamCount(room, m.team) >= MAX_TEAM) return err(ws, 'Ese equipo está lleno');
    p.team = m.team;
    pushRoom(room);
  },
  start_game(ws, user) {
    const room = needRoom(ws, user); if (!room) return;
    if (room.host !== user.id) return err(ws, 'Solo el anfitrión puede iniciar la partida');
    if (room.state !== 'lobby') return err(ws, 'La partida ya ha comenzado');
    if (![...room.players.values()].every((p) => p.locked && p.champ)) return err(ws, 'Todos los jugadores deben confirmar su campeón');
    room.state = 'loading';
    room.loaded = new Set();
    room.seed = crypto.randomInt(2 ** 31); room.startPlayers = playerList(room);
    const begin = () => {
      if (room.state !== 'loading' || rooms.get(room.code) !== room) return;
      room.loadTimer = setTimeout(() => go(room), LOAD_MS);
      toRoom(room, { t: 'start', seed: room.seed, players: room.startPlayers, host: room.host });
      pushRoom(room);
    };
    // 2+ players: the server hosts the match (headless Chromium) and nobody's browser simulates it; solo games stay local as always
    if (room.players.size < 2) return begin();
    // never fall back to a player's browser: the server hosts or the match does not start
    const abort = (why) => { console.error(`[host ${room.code}] could not start:`, why); endBot(room); if (room.state === 'loading') { room.state = 'lobby'; pushRoom(room); } err(ws, 'El servidor no pudo alojar la partida, inténtalo de nuevo'); };
    if (!hostEnabled) return abort('no Chromium (set CHROME_PATH or install chromium)');
    startBot(room).then(() => { if (room.bot) { room.host = room.bot.id; begin(); } }, (e) => abort(e.message));
  },
  loaded(ws, user) {
    const room = needRoom(ws, user); if (!room) return;
    if (room.state !== 'loading') return;
    if (user.bot) { if (room.bot?.id === user.id) room.bot.loaded = true; } else room.loaded.add(user.id);
    checkLoaded(room);
  },
  host_over(ws, user) {   // the host's match ended: let the last events reach everyone, then free the Chromium page
    const room = rooms.get(user.room);
    if (!user.bot || room?.bot?.id !== user.id || room.state !== 'playing') return;
    room.state = 'over'; pushRoom(room);
    setTimeout(() => { if (room.bot?.id === user.id) endBot(room); }, 5000);
  },
  relay(ws, user, m, raw) {
    const room = rooms.get(userRoom.get(user.id));
    if (!room) return;
    if (raw.length > 65536) return err(ws, 'Mensaje demasiado grande');
    if (!user.bot) {   // the host sends snapshots + events at ~60 msg/s for the whole room: not limited
      const now = Date.now();
      if (now - ws.rateAt >= 1000) { ws.rateAt = now; ws.rateN = 0; }
      if (++ws.rateN > 150) return; // silently drop above 150 msg/s (inputs are 60/s + casts / shop; each input repeats the 2 previous ones)
    }
    const out = { t: 'relay', from: user.id, data: m.data };
    if (m.to != null) { if (m.to !== user.id && (room.players.has(m.to) || m.to === room.bot?.id)) send(sockets.get(m.to), out); }
    else if (!room.bot) toRoomZ(room, JSON.stringify(out), user.id);   // a player's browser hosting (no server host): its snapshots, compressed once too
    else toRoom(room, out, user.id);
  },
  chat(ws, user, m) {
    const room = needRoom(ws, user); if (!room) return;
    const text = str(m.text).trim();
    if (!text || text.length > 200) return err(ws, 'El mensaje debe tener entre 1 y 200 caracteres');
    toRoom(room, { t: 'chat', from: user.id, name: user.name, text });
  },
};

// ---------- WebSocket ----------
const server = http.createServer(app);
// snapshots are deltas (keyframe every second, src/netgame.js): ~0.5-1.5 KB of JSON at 60 Hz per player. permessage-deflate keeps its
// window between messages (context takeover), so each delta compresses against the previous ones; ~64 KB of zlib state per socket.
// The host page's own socket (localhost) never compresses: it would only cost CPU on both ends. WS_DEFLATE=0 turns it off for players too.
const DEFLATE = process.env.WS_DEFLATE === '0' ? false : { threshold: 200, zlibDeflateOptions: { level: Number(process.env.WS_DEFLATE_LEVEL) || 3, memLevel: 7 }, serverNoContextTakeover: false, serverMaxWindowBits: 15, clientNoContextTakeover: true, concurrencyLimit: 8 };
const wss = new WebSocketServer({ noServer: true, maxPayload: 70 * 1024, perMessageDeflate: DEFLATE });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://x');
  const token = url.searchParams.get('token') || '', bot = bots.get(token);
  const local = /^(::1|127\.|::ffff:127\.)/.test(req.socket.remoteAddress || '');   // host pages always connect from this machine
  const user = url.pathname !== '/ws' ? null : bot ? (local ? { id: bot.id, name: 'Servidor', bot: true, room: bot.code } : null) : userFromToken(token);
  if (!user) { socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n'); return socket.destroy(); }
  if (user.bot) delete req.headers['sec-websocket-extensions'];   // the host page: no permessage-deflate on localhost
  wss.handleUpgrade(req, socket, head, (ws) => connect(ws, user));
});

function connect(ws, user) {
  const old = sockets.get(user.id);
  sockets.set(user.id, ws);
  if (old) { send(old, { t: 'error', msg: 'Sesión abierta en otra ventana' }); old.close(4000, 'replaced'); }
  ws.alive = true; ws.rateAt = 0; ws.rateN = 0;
  ws.on('pong', () => { ws.alive = true; });
  send(ws, { t: 'hello', user });
  const room = rooms.get(userRoom.get(user.id));
  const p = room?.players.get(user.id);
  if (user.bot) {   // the match host: it gets the start data (it builds the same roster as every player) and is shown as connected
    if (room?.bot?.id !== user.id) { ws.close(4001, 'gone'); return; }
    room.bot.connected = true;
    send(ws, { t: 'start', seed: room.seed, players: room.startPlayers, host: user.id, state: room.state });
    pushRoom(room);
  } else if (p && room.state === 'over') {   // came back after the end of the match: out of the room, to the menu
    removePlayer(room, user.id); send(ws, { t: 'left' });
  } else if (p) {
    p.connected = true; clearTimeout(p.timer); pushRoom(room);
    // match in progress: hand the player the start data again so a fresh page (refresh / closed tab / new device) drops straight back into the game
    if (room.seed != null && (room.state === 'loading' || room.state === 'playing')) send(ws, { t: 'start', seed: room.seed, players: room.startPlayers, rejoin: true, state: room.state, host: room.host });
  }

  ws.on('message', (buf) => {
    const raw = buf.toString();
    // host broadcasts (snapshots, ~20 per second per match) are forwarded as they are: no parse + re-serialise of a few KB each time
    if (user.bot && raw.startsWith(HOST_BCAST) && raw.length <= 65536) { const room = rooms.get(user.room); if (room?.bot?.id === user.id) toRoomZ(room, `{"t":"relay","from":${user.id},"data":${raw.slice(HOST_BCAST.length)}`); return; }
    let m;
    try { m = JSON.parse(raw); } catch { return err(ws, 'Mensaje no válido'); }
    const h = m && typeof m.t === 'string' && Object.hasOwn(handlers, m.t) && (!user.bot || BOT_MSGS.has(m.t)) ? handlers[m.t] : null;
    if (!h) return err(ws, 'Mensaje desconocido');
    try { h(ws, user, m, raw); } catch (e) { console.error(e); err(ws, 'Error del servidor'); }
  });
  ws.on('close', () => {
    if (sockets.get(user.id) !== ws) return; // replaced by a newer socket
    sockets.delete(user.id);
    onDisconnect(user);
  });
  ws.on('error', () => {});
}

const beat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false;
    ws.ping();
  }
}, 25000);
beat.unref();

export function start(port = Number(process.env.PORT) || 3001) {
  return new Promise((resolve) => server.listen(port, () => { selfPort = server.address().port; resolve(server); }));
}
export async function stop() {
  clearInterval(beat);
  for (const ws of wss.clients) ws.terminate();
  await stopHosts();
  return new Promise((resolve) => server.close(resolve));
}
export const _bots = bots;   // tests: they connect as the host with its secret (HEADLESS_HOST=fake)

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start().then((s) => console.log(`SUIKA FIGTHER server en http://localhost:${s.address().port}${hostEnabled ? ' (partidas online alojadas en el servidor)' : ''}`));
  // puppeteer hooks SIGTERM to close Chromium, which would keep node alive: close the hosts and exit (Railway redeploys)
  for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { stopHosts().finally(() => process.exit(0)); setTimeout(() => process.exit(0), 5000).unref(); });
}
