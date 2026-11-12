// Service worker: keeps every game file (/assets/**: scripts, images, sprites, sounds, champion videos) in a cache that belongs to ONE build.
// It is registered as /sw.js?v=<build id>: a new build = a new cache name, and the old caches are deleted when the new worker activates.
// Cache first (files of a build never change); media requests with a Range header get a proper 206 answer built from the cached file.
const V = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = 'suika-' + V;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('suika-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

const range = async (res, h) => {   // "bytes=a-b" -> 206 with that slice
  const m = /bytes=(\d*)-(\d*)/.exec(h); if (!m) return res;
  const buf = await res.arrayBuffer(), n = buf.byteLength, a = m[1] === '' ? Math.max(0, n - +m[2]) : +m[1], b = m[1] === '' || m[2] === '' ? n - 1 : Math.min(+m[2], n - 1);
  if (a > b || a >= n) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${n}` } });
  return new Response(buf.slice(a, b + 1), { status: 206, headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream', 'Content-Length': String(b - a + 1), 'Content-Range': `bytes ${a}-${b}/${n}`, 'Accept-Ranges': 'bytes' } });
};

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith('/assets/')) return;   // pages, /api and the websocket always go to the network
  e.respondWith((async () => {
    const cache = await caches.open(CACHE), key = url.origin + url.pathname;   // the ?timestamp the game appends to some files is ignored: inside one build they are identical
    let res = await cache.match(key);
    if (!res) {
      try {
        const net = await fetch(url.pathname, { cache: 'no-store' });   // always the full file (a Range request is answered below from this copy)
        if (net.ok && net.status === 200) { await cache.put(key, net.clone()); res = net; } else return net;
      } catch (err) { return Response.error(); }
    }
    const h = req.headers.get('range');
    return h ? range(res, h) : res;
  })());
});
