// Electron main process: launcher window -> update the game -> run it from a local server in a second window.
import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { createUpdater, DEFAULT_SERVER } from './updater.js';
import { createGameServer } from './gameserver.js';

app.setName('Suika Figther');   // same userData folder in dev and in the installed app
if (!app.requestSingleInstanceLock()) app.quit();

// server: env SUIKA_SERVER > userData/config.json { "server": "..." } > production default
function serverUrl() {
  let s = process.env.SUIKA_SERVER;
  if (!s) { try { s = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'config.json'), 'utf8')).server; } catch { /* no config */ } }
  try { const u = new URL(s || DEFAULT_SERVER); if (/^https?:$/.test(u.protocol)) return u.origin; } catch { /* fall through */ }
  console.error('Servidor configurado no válido, usando el de producción');
  return DEFAULT_SERVER;
}

let launcher = null, gameWin = null, gameServer = null, updater = null, remote = '';
let state = { phase: 'checking', canPlay: false };
let running = false, autoPlay = null;

const push = (patch) => { state = { ...state, ...patch, appVersion: app.getVersion(), server: remote }; launcher?.webContents.send('state', state); };

// navigation lock: windows only ever show their own origin; http(s) links open in the system browser
function lock(win, origin) {
  const external = (url) => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); };
  win.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (new URL(url).origin !== origin) { e.preventDefault(); external(url); } });
}

async function checkUpdates() {
  if (running) return;
  running = true; clearTimeout(autoPlay);
  push({ phase: 'checking', canPlay: false, error: null });
  try {
    const r = await updater.update();
    if (r.offline) push({ phase: 'offline', installed: r.id, canPlay: true });
    else {
      push({ phase: 'ready', installed: r.id, available: r.id, canPlay: true, updated: r.updated });
      if (!r.updated) autoPlay = setTimeout(play, 700);   // nothing new: go straight into the game
    }
  } catch (e) { push({ phase: 'error', error: e.message, canPlay: false }); }
  running = false;
}

async function play() {
  if (gameWin) return gameWin.focus();
  gameServer = createGameServer({ gameDir: updater.gameDir, remote });
  const origin = await gameServer.listen();
  gameWin = new BrowserWindow({ width: 1280, height: 720, minWidth: 960, minHeight: 540, show: false, backgroundColor: '#050a14', title: 'Suika Figther', autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  gameWin.setMenuBarVisibility(false);
  lock(gameWin, origin);
  gameWin.webContents.on('before-input-event', (e, i) => { if (i.type === 'keyDown' && i.key === 'F11') { gameWin.setFullScreen(!gameWin.isFullScreen()); e.preventDefault(); } });
  gameWin.once('ready-to-show', () => { gameWin.show(); launcher?.close(); });
  gameWin.on('closed', () => { gameWin = null; });
  gameWin.loadURL(origin + '/');
}

function createLauncher() {
  launcher = new BrowserWindow({ width: 520, height: 400, resizable: false, maximizable: false, fullscreenable: false, autoHideMenuBar: true, backgroundColor: '#050a14', title: 'Suika Figther', webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(import.meta.dirname, 'preload.cjs') } });
  launcher.setMenuBarVisibility(false);
  const page = path.join(import.meta.dirname, 'ui', 'index.html');
  lock(launcher, 'file://');
  launcher.on('closed', () => { launcher = null; });
  launcher.loadFile(page);
}

// only the launcher window may drive the updater
const fromLauncher = (e) => launcher && e.sender === launcher.webContents;
ipcMain.on('launcher:ready', (e) => { if (!fromLauncher(e)) return; launcher.webContents.send('state', state); checkUpdates(); });
ipcMain.on('launcher:retry', (e) => { if (fromLauncher(e)) checkUpdates(); });
ipcMain.on('launcher:play', (e) => { if (fromLauncher(e) && state.canPlay) play(); });

app.whenReady().then(() => {
  remote = serverUrl();
  updater = createUpdater({ server: remote, root: app.getPath('userData'), onProgress: (s) => { if (s.phase !== 'done') push({ ...s, canPlay: false }); } });
  // no web permissions (camera, notifications, ...) for anything we show; fullscreen is fine
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'fullscreen'));
  createLauncher();
});
app.on('second-instance', () => { const w = gameWin || launcher; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => { clearTimeout(autoPlay); gameServer?.close(); });
