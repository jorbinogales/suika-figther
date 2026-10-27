# SUIKA FIGTHER

MOBA-brawler en pixel art (Phaser 4 + Vite) con launcher, cuentas y salas online.

- `npm install`
- `npm run dev` (juego) y `npm run server` (servidor del launcher, puerto 3001)
- Arte: Codex genera las imágenes en `art/raw/...`; `python tools/process_sprites.py` y `tools/process_ui.py` las procesan.
- Sonido: `python tools/make_custom_sfx.py` y `python tools/build_sfx.py`.
- Novedades del launcher: `server/data/news.json`.
