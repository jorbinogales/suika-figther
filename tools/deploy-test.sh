#!/usr/bin/env bash
# Despliega el entorno de PRUEBAS de Suika Figther (rama test) en este servidor.
# Se ejecuta DENTRO del clon de pruebas (p. ej. ~/suika-figther-test).
# Uso:  bash tools/deploy-test.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3002}"
export DB_PATH="${DB_PATH:-$PWD/server/data/test.db}"
export JWT_SECRET="${JWT_SECRET:-secreto-solo-para-pruebas}"

echo "== Suika Figther · entorno de pruebas (puerto $PORT) =="
git pull --ff-only
npm ci
npm run build

if pm2 describe suika-test >/dev/null 2>&1; then
  PORT="$PORT" pm2 restart suika-test --update-env
else
  PORT="$PORT" pm2 start server/index.js --name suika-test
fi
pm2 save
echo "Listo: http://127.0.0.1:$PORT  (público vía Caddy: https://suikatest.hayai.com.ve)"
