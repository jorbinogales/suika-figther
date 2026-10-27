# Entorno de pruebas (staging)

Para probar cambios **antes** de que lleguen a los jugadores — sonido, animaciones, campeones nuevos, mejoras del launcher — sin tocar producción. Es un clon del juego corriendo en paralelo, con sus propias cuentas.

## Cómo queda montado

| | Producción | Pruebas |
|---|---|---|
| Rama | `main` | `test` |
| Clon en el VPS | `~/suika-figther` | `~/suika-figther-test` |
| Proceso pm2 | `suika` | `suika-test` |
| Puerto | 3001 | 3002 |
| Base de datos | `server/data/devbrawl.db` | `server/data/test.db` |
| URL | suikafigther.hayai.com.ve | suikatest.hayai.com.ve |

Las cuentas de pruebas son **aparte**: lo que se registre ahí no existe en producción y viceversa. La base de datos de pruebas se puede borrar cuando se quiera (`server/data/test.db`); se recrea sola al arrancar.

## Puesta en marcha (una sola vez, en el VPS)

```bash
# 1. Clon de pruebas, desde la rama test
git clone -b test https://github.com/jorbinogales/suika-figther.git ~/suika-figther-test
cd ~/suika-figther-test

# 2. Primer despliegue (instala, compila y levanta el proceso suika-test)
bash tools/deploy-test.sh
pm2 save
```

DNS: crear un registro **A** `suikatest` → IP pública del VPS (igual que el de producción).

Caddy: añadir este bloque al Caddyfile y recargar (`sudo systemctl reload caddy`):

```
suikatest.hayai.com.ve {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3002
}
```

## Flujo de trabajo

1. Cada cambio nace en una rama desde `test` y entra con PR **hacia `test`**.
2. En el VPS: `cd ~/suika-figther-test && bash tools/deploy-test.sh`.
3. Se juega y se prueba en **https://suikatest.hayai.com.ve** con cuentas de prueba.
4. Cuando está bueno: PR de `test` → `main`, merge, y despliegue normal de producción (ver `DEPLOY.md`, sección 4).

## Notas

- El script usa un `JWT_SECRET` de mentira, solo para pruebas: las sesiones de staging no protegen nada real. Se puede definir otro por variable de entorno.
- Las noticias (`server/data/news.json`) salen de cada clon: las de pruebas pueden ser de mentira sin afectar el launcher real.
- El puerto 3002 no se abre al exterior; Caddy lo expone por HTTPS como con producción.
