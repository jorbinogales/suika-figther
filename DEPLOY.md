# Despliegue de SUIKA FIGTHER en suikafigther.hayai.com.ve

El juego son dos cosas que corren en **un solo proceso Node**: el servidor (cuentas, noticias, salas, WebSocket) y los archivos del juego compilados (`dist/`).
Necesitas un servidor que mantenga procesos y WebSockets (un VPS, Railway, Render...). **No sirven** hosting estático (GitHub Pages, Netlify, Vercel) porque no hay servidor para las salas.

## 1. DNS
En el panel DNS de `hayai.com.ve` crea un registro **A**: nombre `suikafigther` -> IP pública de tu servidor (y un AAAA si tiene IPv6). Espera a que propague.

## 2. Servidor (Ubuntu 22.04/24.04, 1 GB de RAM alcanza)
```bash
sudo apt update && sudo apt install -y git curl build-essential python3 ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2

git clone https://github.com/jorbinogales/suika-figther.git
cd suika-figther
npm ci
npm run build                      # genera dist/ (el juego)

# secreto de las sesiones: guárdalo, si cambia se cierran todas las sesiones
export JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET=$JWT_SECRET" > .env.prod   # (no se sube a git)

PORT=3001 JWT_SECRET=$JWT_SECRET pm2 start server/index.js --name suika
pm2 save && pm2 startup            # ejecuta el comando que te imprime para arrancar solo al reiniciar
```
Prueba local: `curl http://127.0.0.1:3001/api/news` debe devolver las noticias.

## 3. HTTPS con Caddy (certificado automático)
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

sudo tee /etc/caddy/Caddyfile >/dev/null <<'CADDY'
suikafigther.hayai.com.ve {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3001
}
CADDY
sudo systemctl reload caddy
sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable
```
Caddy pide el certificado solo y reenvía también los WebSockets (`wss://suikafigther.hayai.com.ve/ws`). El puerto 3001 no hace falta abrirlo al exterior.
(Con nginx: `proxy_pass http://127.0.0.1:3001;` más `proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_set_header X-Forwarded-For $remote_addr;` y certbot.)

## 4. Actualizar
```bash
cd suika-figther && git pull && npm ci && npm run build && pm2 restart suika
```
Las noticias del launcher se leen de `server/data/news.json` en cada visita (con `git pull` basta).

## 5. Datos y copias de seguridad
Las cuentas viven en `server/data/devbrawl.db` (SQLite). Haz copia de esa carpeta (`server/data/`) periódicamente, por ejemplo `cp server/data/devbrawl.db ~/backup-$(date +%F).db`.

## Notas
- Primera carga: el juego descarga ~75 MB (sobre todo sonidos). Caddy los comprime y el navegador los guarda en caché.
- Variables útiles: `PORT` (3001 por defecto), `JWT_SECRET`, `DB_PATH`.
- Las partidas online las simula el navegador del anfitrión; el servidor solo gestiona cuentas, salas y reenvía mensajes, así que consume muy poco.
- En móviles el juego muestra un aviso de que no está disponible.

## Actualizaciones forzadas (caché)
Cada `npm run build` genera un id (`dist/version.json`). El juego abierto lo compara con `/api/version` al cargar, cada minuto y al volver a la pestaña; si el id cambió, borra la caché del navegador y recarga solo (en el launcher al instante, durante una partida al volver al launcher). El `index.html` se sirve siempre sin caché y los archivos de `assets/` llevan hash, así que tras `git pull && npm ci && npm run build && pm2 restart suika` todos los jugadores pasan a la nueva versión sin hacer nada.
