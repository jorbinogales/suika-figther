// Forces players onto the newest build: compares the id this page was built with against the server's current one.
// If they differ the cache is wiped and the page reloads (immediately in the launcher, after the match if one is running).
const MINE = typeof __BUILD_ID__ === 'undefined' ? 'dev' : __BUILD_ID__;
let shown = false;

async function wipe() {
  try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) { /* ignore */ }
  try { if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (e) { /* ignore */ }
}
async function update(id) {
  if (shown) return; shown = true;
  const el = document.createElement('div'); el.id = 'newver';
  el.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(2,6,14,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#cfe3ff;font-family:Rajdhani,Segoe UI,sans-serif;text-align:center;padding:24px';
  el.innerHTML = '<div style="font:900 clamp(22px,4vw,40px) Orbitron,sans-serif;letter-spacing:.14em;color:#ffd23f">NUEVA VERSIÓN DISPONIBLE</div><div style="font-size:18px;max-width:460px">Actualizando el juego para que tengas la versión más reciente…</div><div style="font-size:14px;color:#7a8db3">La página se recargará sola.</div>';
  document.body.appendChild(el);
  await wipe();
  const u = new URL(location.href); u.searchParams.set('v', id);   // new URL: the browser cannot serve the old index.html from its cache
  setTimeout(() => location.replace(u.toString()), 1200);
}
async function check() {
  if (MINE === 'dev') return;
  try {
    const r = await fetch('/api/version?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
    const { id } = await r.json();
    if (id && id !== 'dev' && id !== MINE) { if (document.querySelector('#ui')) update(id); else window.__newVersion = id; }   // in a match: wait for the launcher
  } catch (e) { /* offline: try again later */ }
}
export function watchVersion() {
  check(); setInterval(check, 60000);
  window.addEventListener('focus', check);
  setInterval(() => { if (window.__newVersion && document.querySelector('#ui')) update(window.__newVersion); }, 2000);
}
