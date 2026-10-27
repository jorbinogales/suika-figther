// SUIKA FIGTHER launcher server: auth + news (REST) and lobby/relay (WebSocket).
import express from 'express';
import { WebSocketServer } from 'ws';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

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
app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado' }));
// production: the same process serves the built game (npm run build -> dist/); in development Vite does it
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (fs.existsSync(path.join(DIST, 'index.html'))) {
  app.use('/assets', express.static(path.join(DIST, 'assets'), { maxAge: '7d' }));
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

const send = (ws, msg) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); };
const err = (ws, msg) => send(ws, { t: 'error', msg });
const teamCount = (room, t) => [...room.players.values()].filter((p) => p.team === t).length;
const playerList = (room) => [...room.players.values()].map((p) => ({
  id: p.id, name: p.name, team: p.team, champ: p.champ, ready: p.ready, host: p.id === room.host, connected: p.connected,
}));
const toRoom = (room, msg, except) => {
  for (const p of room.players.values()) if (p.id !== except) send(sockets.get(p.id), msg);
};
const roomMsg = (room) => ({ t: 'room', code: room.code, public: room.public, host: room.host, state: room.state, players: playerList(room) });
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
  if (!room.players.size) { clearTimeout(room.loadTimer); rooms.delete(room.code); return; }
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
  if (need.every((p) => room.loaded.has(p.id))) go(room);
}

function onDisconnect(user) {
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

const handlers = {
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
    room.players.get(user.id).champ = m.key;
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
    room.state = 'loading';
    room.loaded = new Set();
    room.loadTimer = setTimeout(() => go(room), LOAD_MS);
    toRoom(room, { t: 'start', seed: crypto.randomInt(2 ** 31), players: playerList(room) });
    pushRoom(room);
  },
  loaded(ws, user) {
    const room = needRoom(ws, user); if (!room) return;
    if (room.state !== 'loading') return;
    room.loaded.add(user.id);
    checkLoaded(room);
  },
  relay(ws, user, m, raw) {
    const room = rooms.get(userRoom.get(user.id));
    if (!room) return;
    if (raw.length > 65536) return err(ws, 'Mensaje demasiado grande');
    const now = Date.now();
    if (now - ws.rateAt >= 1000) { ws.rateAt = now; ws.rateN = 0; }
    if (++ws.rateN > 120) return; // silently drop above 120 msg/s
    const out = { t: 'relay', from: user.id, data: m.data };
    if (m.to != null) { if (room.players.has(m.to) && m.to !== user.id) send(sockets.get(m.to), out); }
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
// snapshots are ~4 KB of repetitive JSON at 15 Hz per player: permessage-deflate cuts that to a third at negligible CPU
const wss = new WebSocketServer({ noServer: true, maxPayload: 70 * 1024, perMessageDeflate: { threshold: 400, zlibDeflateOptions: { level: 3 }, serverNoContextTakeover: true, clientNoContextTakeover: true, concurrencyLimit: 8 } });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://x');
  const user = url.pathname === '/ws' ? userFromToken(url.searchParams.get('token') || '') : null;
  if (!user) { socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n'); return socket.destroy(); }
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
  if (p) { p.connected = true; clearTimeout(p.timer); pushRoom(room); }

  ws.on('message', (buf) => {
    const raw = buf.toString();
    let m;
    try { m = JSON.parse(raw); } catch { return err(ws, 'Mensaje no válido'); }
    const h = m && typeof m.t === 'string' && Object.hasOwn(handlers, m.t) ? handlers[m.t] : null;
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
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
export function stop() {
  clearInterval(beat);
  for (const ws of wss.clients) ws.terminate();
  return new Promise((resolve) => server.close(resolve));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start().then((s) => console.log(`SUIKA FIGTHER server en http://localhost:${s.address().port}`));
}
