// Local server for the installed game: serves <gameDir> statically and proxies /api/* and the /ws WebSocket to the remote server,
// so the unmodified web client (relative URLs, location.host) works inside the desktop window. No Electron imports.
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm' };
const HOP = new Set(['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'te', 'trailer']);

// remote: base URL of the real server (http/https only). Everything the proxy sends goes to this host, never to a client-chosen one.
export function createGameServer({ gameDir, remote }) {
  const target = new URL(remote);
  if (!/^https?:$/.test(target.protocol)) throw new Error('Servidor no válido: ' + remote);
  const lib = target.protocol === 'https:' ? https : http;
  const wsBase = (target.protocol === 'https:' ? 'wss://' : 'ws://') + target.host;
  const root = path.resolve(gameDir);
  let port = 0;
  const hostOk = (req) => req.headers.host === `127.0.0.1:${port}`;   // blocks DNS-rebinding from web pages
  const isApi = (u) => u === '/api' || u.startsWith('/api/') || u.startsWith('/api?');

  const installedId = () => { try { return JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')).id; } catch { return 'dev'; } };

  function proxy(req, res) {
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) if (!HOP.has(k) && k !== 'host' && k !== 'origin' && k !== 'referer') headers[k] = v;
    const up = lib.request({ protocol: target.protocol, hostname: target.hostname, port: target.port || undefined, method: req.method, path: req.url, headers: { ...headers, host: target.host }, timeout: 30000 }, (r) => {
      const out = {};
      for (const [k, v] of Object.entries(r.headers)) if (!HOP.has(k)) out[k] = v;
      res.writeHead(r.statusCode || 502, out);
      r.pipe(res);
    });
    up.on('timeout', () => up.destroy(new Error('timeout')));
    up.on('error', () => { if (!res.headersSent) { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'No se pudo conectar con el servidor' })); } else res.destroy(); });
    res.on('close', () => up.destroy());
    req.pipe(up);
  }

  function serveStatic(req, res, pathname) {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    let rel;
    try { rel = decodeURIComponent(pathname); } catch { res.writeHead(400); return res.end(); }
    let file = path.resolve(root, '.' + rel);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    const send = (f, st) => {
      const ext = path.extname(f).toLowerCase();
      res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-cache' });   // local disk: always revalidate, so replaced files never go stale
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(f).on('error', () => res.destroy()).pipe(res);
    };
    fs.stat(file, (e, st) => {
      if (!e && st.isDirectory()) { file = path.join(file, 'index.html'); return fs.stat(file, (e2, st2) => (e2 ? notFound() : send(file, st2))); }
      if (!e && st.isFile()) return send(file, st);
      notFound();
    });
    function notFound() {
      if (path.extname(rel)) { res.writeHead(404); return res.end(); }   // missing asset: a real 404, not index.html
      const idx = path.join(root, 'index.html');
      fs.stat(idx, (e, st) => (e ? (res.writeHead(404), res.end()) : send(idx, st)));
    }
  }

  const server = http.createServer((req, res) => {
    if (!hostOk(req)) { res.writeHead(421); return res.end(); }
    const pathname = new URL(req.url, 'http://x').pathname;
    // the client compares this with the build id it was compiled with; answer with the installed one so it never reloads in a loop
    if (pathname === '/api/version') { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }); return res.end(JSON.stringify({ id: installedId() })); }
    if (isApi(req.url)) return proxy(req, res);
    serveStatic(req, res, pathname);
  });

  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: 1024 * 1024 });
  const deny = (socket, line) => { socket.write(`HTTP/1.1 ${line}\r\nConnection: close\r\n\r\n`); socket.destroy(); };
  const closeCode = (c) => (c === 1000 || (c >= 3000 && c <= 4999) ? c : 1000);
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname !== '/ws' || !hostOk(req) || req.headers.origin !== `http://127.0.0.1:${port}`) return deny(socket, '403 Forbidden');
    socket.on('error', () => {});
    // connect upstream first: if the server refuses (bad token -> 401) the browser sees the same failed handshake
    const upstream = new WebSocket(wsBase + '/ws' + url.search, { perMessageDeflate: true, maxPayload: 1024 * 1024, handshakeTimeout: 15000 });
    const queue = [];
    let client = null;
    upstream.on('unexpected-response', (_q, r) => { r.resume(); deny(socket, `${r.statusCode} ${r.statusMessage || 'Error'}`); });
    upstream.on('error', () => { if (!client) deny(socket, '502 Bad Gateway'); else client.terminate(); });
    upstream.on('message', (data, isBinary) => { if (client) client.send(data, { binary: isBinary }); else queue.push([data, isBinary]); });
    upstream.on('close', (code, reason) => { if (client) client.close(closeCode(code), reason); });
    upstream.on('open', () => {
      wss.handleUpgrade(req, socket, head, (ws) => {
        client = ws;
        for (const [d, b] of queue.splice(0)) ws.send(d, { binary: b });
        ws.on('message', (data, isBinary) => { if (upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary: isBinary }); });
        ws.on('close', (code, reason) => { if (upstream.readyState <= WebSocket.OPEN) upstream.close(closeCode(code), reason); });
        ws.on('error', () => upstream.terminate());
        if (upstream.readyState > WebSocket.OPEN) ws.close(1000);   // upstream already gone while we were upgrading
      });
    });
  });

  return {
    listen: () => new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => { port = server.address().port; resolve(`http://127.0.0.1:${port}`); }); }),
    close: () => new Promise((resolve) => { for (const ws of wss.clients) ws.terminate(); server.close(() => resolve()); server.closeAllConnections?.(); }),
  };
}
