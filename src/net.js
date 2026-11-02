// Client side of the launcher server: REST (accounts, news) + one WebSocket (rooms, lobby, relay).
const LS = 'devbrawl_session';
// ?bot=<secret>: this page is the server's headless match host (server/host.js), not a player
export const BOT = new URLSearchParams(location.search).get('bot');
const store = { get: () => { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { return null; } }, set: v => { try { v ? localStorage.setItem(LS, JSON.stringify(v)) : localStorage.removeItem(LS); } catch (e) { /* ignore */ } } };

export const net = {
  token: null, user: null, ws: null, room: null, online: false, subs: new Set(), retry: null,

  async api(path, body) {
    const o = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { headers: {} };
    if (this.token) o.headers.Authorization = 'Bearer ' + this.token;
    let r; try { r = await fetch('/api' + path, o); } catch (e) { throw new Error('No se pudo conectar con el servidor. ¿Está encendido? (npm run server)'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Error del servidor');
    return j;
  },
  async auth(kind, data) { const r = await this.api('/' + kind, data); this.token = r.token; this.user = r.user; store.set({ token: r.token }); this.connect(); return r.user; },
  async restore() {   // resume a saved session
    const s = store.get(); if (!s?.token) return false;
    this.token = s.token;
    try { this.user = (await this.api('/me')).user; this.connect(); return true; } catch (e) { if (/servidor|conectar/i.test(e.message)) { this.token = null; return false; } this.logout(); return false; }
  },
  logout() { this.token = null; this.user = null; this.room = null; store.set(null); clearTimeout(this.retry); this.ws?.close(); this.ws = null; this.online = false; },
  news() { return this.api('/news'); },

  connect() {
    if (!this.token || this.ws) return;
    const ws = this.ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?token=${encodeURIComponent(this.token)}`);
    ws.onopen = () => { this.online = true; this.emit({ t: '_online' }); if (!BOT) { clearInterval(this.pinger); const ping = () => this.send('ping', { ts: performance.now() }); ping(); this.pinger = setInterval(ping, 2000); } };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.t === 'pong') { const r = performance.now() - m.ts, h = this.pings || (this.pings = []); h.push(r); if (h.length > 8) h.shift(); this.ping = Math.round(h.reduce((a, b) => a + b) / h.length); this.pingMax = Math.round(Math.max(...h)); return; } if (m.t === 'room') this.room = m; if (m.t === 'left') this.room = null; this.emit(m); };
    ws.onclose = () => { clearInterval(this.pinger); this.ping = null; this.pings = []; this.ws = null; this.online = false; this.emit({ t: '_offline' }); if (this.token) this.retry = setTimeout(() => this.connect(), 2000); };
  },
  send(t, o = {}) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ t, ...o })); },
  on(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
  emit(m) { this.subs.forEach(f => f(m)); },
  get me() { return this.room?.players?.find(p => p.id === this.user?.id) || null; },
};
