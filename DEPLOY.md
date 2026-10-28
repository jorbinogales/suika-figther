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
npm ci --omit=dev
npm run build                      # genera dist/ (el juego)

# secreto de las sesiones: guárdalo, si cambia se cierran todas las sesiones
export JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET=$JWT_SECRET" > .env.prod   # (no se sube a git)

PORT=3001 JWT_SECRET=$JWT_SECRET pm2 start server/index.js --name suika
pm2 save && pm2 startup            # ejecuta el comando que te imprime para arrancar solo al reiniciar
```
Prueba local: `curl http://127.0.0.1:3001/api/news` debe devolver las noticias.

> En el servidor usa `npm ci --omit=dev`: Electron y electron-builder son solo para construir el instalador en tu PC.

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
cd suika-figther && git pull && npm ci --omit=dev && npm run build && pm2 restart suika
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
Cada `npm run build` genera un id (`dist/version.json`). El juego abierto lo compara con `/api/version` al cargar, cada minuto y al volver a la pestaña; si el id cambió, borra la caché del navegador y recarga solo (en el launcher al instante, durante una partida al volver al launcher). El `index.html` se sirve siempre sin caché y los archivos de `assets/` llevan hash, así que tras `git pull && npm ci --omit=dev && npm run build && pm2 restart suika` todos los jugadores pasan a la nueva versión sin hacer nada.

## Launcher de escritorio (Windows)
Instalable de Windows (Electron) que descarga el juego desde el servidor, lo mantiene actualizado y lo ejecuta. Código en `desktop/`.

- **Cómo funciona:** al abrirse pide `/api/game/manifest` (lista de archivos de `dist/` con tamaño y sha256, la genera el servidor solo y la cachea), verifica los archivos instalados en `%APPDATA%\Suika Figther\game`, descarga **solo lo que falta o cambió** (4 en paralelo, con reintentos y verificación sha256) a `game.tmp` y recién al terminar lo cambia por la carpeta vigente. Si la descarga falla a medias, el juego instalado sigue intacto. Sin red pero con juego instalado, el launcher abre el instalado (para jugar online hace falta servidor).
- **Ejecución:** un servidor local en `127.0.0.1` (puerto aleatorio) sirve el juego instalado y reenvía `/api/*` y el WebSocket `/ws` al servidor remoto; el código del juego no cambia. El cliente comprueba `/api/version` para forzar recargas: dentro del launcher esa ruta responde con la versión **instalada**, así que no hay bucles de recarga.
- **Construir el instalador:** `npm install` y luego `npm run desktop:dist`. Queda en `release/Suika Figther Setup <versión>.exe` (NSIS; elige carpeta de instalación, sin permisos de administrador). `npm run desktop:pack` genera solo la carpeta `release/win-unpacked/` (rápido, para pruebas). El instalador pesa ~120 MB (es Electron) y **no incluye el juego**: solo el launcher.
- **Probar contra un servidor local:** `npm run build`, `PORT=3099 node server/index.js` y en otra terminal `SUIKA_SERVER=http://localhost:3099 npm run desktop` (PowerShell: `$env:SUIKA_SERVER='http://localhost:3099'; npm run desktop`). Con `--user-data-dir=<carpeta>` se usa una instalación aparte. El servidor por defecto es `https://suikafigther.hayai.com.ve`; también se puede fijar en `%APPDATA%\Suika Figther\config.json` con `{ "server": "https://..." }` (la variable de entorno tiene prioridad).
- **Pruebas sin Electron:** `npm run test:desktop` (actualizador: primera instalación, reparación selectiva, fallo a mitad de descarga, offline; y proxy HTTP/WebSocket local). Necesita `npm run build`.
- **Publicar una versión del juego sigue igual:** `git pull && npm ci --omit=dev && npm run build && pm2 restart suika`. El manifest se regenera solo; los launchers instalados descargan la diferencia la próxima vez que se abran.
- **Actualizar el launcher en sí:** el shell Electron **no** se actualiza solo. Si cambia algo de `desktop/` (o Electron), hay que generar y repartir un instalador nuevo; el contenido del juego sí se actualiza solo sin reinstalar nada. (Añadir `electron-updater` más adelante exige instalador firmado y un lugar donde publicar los instaladores.)
- **SmartScreen:** si el instalador no está firmado, Windows muestra «Windows protegió su PC» (Más información > Ejecutar de todas formas). Ver abajo cómo firmarlo.
- Sin icono propio todavía: usa el de Electron. Para uno propio, deja un `build/icon.ico` (256x256) y añade `directories.buildResources: 'build'` en `electron-builder.config.cjs`.

### Firmar el instalador (opcional)
Sin variables de firma el build sigue funcionando y genera un instalador **sin firmar**. Con las variables de una de estas vías, se firma solo (`npm run desktop:dist`). La configuración está en `electron-builder.config.cjs`; elige la primera vía que tenga todas sus variables (Azure > almacén de Windows > .pfx).

| Vía | Variables | Notas |
|---|---|---|
| Certificado `.pfx` (OV/EV en archivo) | `CSC_LINK` (ruta al .pfx o base64), `CSC_KEY_PASSWORD` | Las lee electron-builder directamente. Guarda el .pfx fuera del repo (`*.pfx` y `*.p12` están en `.gitignore`). |
| Azure Trusted Signing | `SUIKA_AZURE_ENDPOINT`, `SUIKA_AZURE_ACCOUNT`, `SUIKA_AZURE_PROFILE`, `SUIKA_AZURE_PUBLISHER` (en la config) + `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` (las lee el firmador) | Cuenta y perfil de certificado creados en Azure; `PUBLISHER` es el CN del certificado (p. ej. `CN=Hayai`). Instala solo el módulo PowerShell `TrustedSigning`. |
| Token USB / EV (signtool) | `SUIKA_SIGN_SHA1` (huella del certificado) **o** `SUIKA_SIGN_SUBJECT` (nombre del titular); opcional `SUIKA_TIMESTAMP_URL` | El token tiene que estar conectado y su certificado visible en el almacén de Windows (`certmgr.msc` > Personal); el controlador del token pedirá el PIN al firmar. Requiere Windows. |

Ejemplos (PowerShell, en la misma terminal que ejecuta el build; no los guardes en archivos del repo):
```powershell
# .pfx
$env:CSC_LINK = 'C:\firmas\suika.pfx'; $env:CSC_KEY_PASSWORD = '...'; npm run desktop:dist
# Azure Trusted Signing
$env:AZURE_TENANT_ID='...'; $env:AZURE_CLIENT_ID='...'; $env:AZURE_CLIENT_SECRET='...'
$env:SUIKA_AZURE_ENDPOINT='https://eus.codesigning.azure.net'; $env:SUIKA_AZURE_ACCOUNT='mi-cuenta'; $env:SUIKA_AZURE_PROFILE='mi-perfil'; $env:SUIKA_AZURE_PUBLISHER='CN=Mi Empresa'
npm run desktop:dist
# Token USB / EV
$env:SUIKA_SIGN_SHA1 = 'AB12...'; npm run desktop:dist
```
Comprobar la firma: `Get-AuthenticodeSignature 'release\Suika Figther Setup 1.0.0.exe' | Format-List Status, SignerCertificate, TimeStamperCertificate` (`Status` debe ser `Valid`; `NotSigned` = sin firmar).

SmartScreen: un certificado normal (OV) o un `.pfx` nuevo siguen mostrando el aviso hasta acumular reputación (descargas); solo desaparece desde el primer día con un certificado EV o con Azure Trusted Signing. `electron-updater` (si algún día se añade para actualizar el launcher) exige instalador firmado.
