# Cola de trabajo — sprites en 8 direcciones (fase 2)

El piloto de Xeviche (idle + walk, 5 direcciones) quedó APROBADO: calidad y sincronía correctas. Sigue exactamente el mismo formato (`art/SPRITES_8DIR_SPEC.md`) y el mismo
nivel de detalle y consistencia de diseño que en esas 10 tiras. Pasos hacia el resto.

Reglas comunes a todo lo que sigue
- Nombres: `art/raw/<personaje>/<anim>_<dir>.png`, dir ∈ s, se, e, ne, n. Tiras de celdas 512x512, fondo magenta #FF00FF, mismos pies/escala que la tira actual del personaje.
- Nº de cuadros: idle 6, walk 8, run 8, attack 6, power1 8, power2 8, power3 8, ult 10. (Si ya existen `art/raw/<personaje>/<anim>.png`, crea SOLO las animaciones que el personaje ya tiene: no inventes
  habilidades que no tenga.) Para `ult` y `power*`, el cuadro de impacto/lanzamiento es el mismo en las 5 direcciones y se ve el gesto de la habilidad actual (mira la tira actual y `src/data.js`).
- Las 5 direcciones de una misma animación comparten la fase de movimiento en cada cuadro. Ciclos (idle/walk/run) en bucle perfecto.
- Efectos de la habilidad (fuego, rayos, proyectiles…) NO van pintados en el sprite del personaje salvo que ya lo estén en la tira actual; no cambies la mecánica.
- No sobrescribas los archivos sin sufijo de dirección.

## Tanda A — Xeviche (completar)
run, attack, power1, power2, power3, ult  × 5 direcciones = 30 tiras. (power3 = corazón, ult = "Karis Harem": en la dirección `n` el personaje ya está de espaldas; en `s` mantenlo girándose/frente
con el mismo gesto de jefe, coherente con la tira actual.)

## Tanda B — locomoción de los otros 9 campeones (idle, walk, run × 5 direcciones = 15 tiras cada uno)
Orden: junior, yonaiker, hector, jorbi, julio, leandro, luis, axel, eliud.
Variantes de skin (se hacen después de su campeón base, mismas reglas): `jorbi_buff` (idle, walk, run), `eliud_hen` (idle, walk, run), `hector_bike` (run).
Mira la referencia de cada uno en `art/ref/<personaje>.png` y su `art/raw/<personaje>/walk.png` para el diseño exacto, antes de dibujar.

## Tanda C — habilidades de los otros 9 campeones
attack, power1, power2, power3, ult (las que tengan) × 5 direcciones. Mismo orden que la tanda B. Junior: `attack3`/`dash` también si existen (6 y 4 cuadros → usa 8 y 6).

## Entrega
Trabaja por personaje y por tanda. Al terminar cada personaje (o cada tanda de Xeviche) deja la hoja de contacto `art/review_8dir/<personaje>_<anim>.png` (5 filas = 5 direcciones) y AVÍSAME con la lista de archivos
para procesarlos y probarlos en el juego antes de que sigas con el siguiente. Si una dirección no cuadra con el diseño, regenera esa tira antes de entregar.


## ACTUALIZACIÓN — Combos de ataques básicos (prioridad tras terminar lo que estés dibujando)
Lee `art/COMBO_8DIR_SPEC.md`. En la Tanda C, `attack` pasa a ser `attack`, `attack2` y `attack3` (3 golpes por campeón, con gestos propios; los de distancia, gestos de distancia).
Haz AHORA, justo después de la tira que estés terminando: Xeviche `attack2` y `attack3` (10 tiras). Después sigue con la cola normal.


## ACTUALIZACIÓN 2 — Ataque con impulso (`lunge`)
Lee la última sección de `art/COMBO_8DIR_SPEC.md`. Además de attack/attack2/attack3, cada campeón necesita `lunge` (6 cuadros, 5 direcciones). Xeviche `lunge` va justo después de su cadena de combo (`attack`, `attack2`, `attack3`).


## ACTUALIZACIÓN 3 (la generación de imágenes ya está disponible: CONTINÚA y recupera lo que falló) — orden de prioridad
Lee `art/COMBO_8DIR_SPEC.md` (diseño de la CADENA de combo: cada golpe continúa al anterior y nunca vuelve al idle; ataque con impulso `lunge`) y `art/NEW_ITEM_ICONS_SPEC.md`.
1. **Iconos de los 7 objetos nuevos** (`art/raw/items_new/<id>.png`, 7 archivos). Son rápidos: hazlos primero.
2. **Xeviche `lunge`** (5 tiras, 6 cuadros) — es lo único que le falta a Xeviche.
3. **Combos de los campeones con locomoción ya hecha, en este orden: Junior, Yonaiker, Héctor, Jorbi**: `attack` (6 cuadros), `attack2` (6), `attack3` (8) y `lunge` (6) en las 5 direcciones (s, se, e, ne, n) = 20 tiras por campeón. Sigue la sección de gestos de cada uno en COMBO_8DIR_SPEC.md; la pose final de un golpe es la inicial del siguiente.
4. **Locomoción pendiente** (`idle` 6, `walk` 8, `run` 8 cuadros × 5 direcciones) y después sus combos y lunge, en este orden: Julio, Leandro, Luis, Axel, Eliud.
Avísame al terminar cada punto (iconos / lunge de Xeviche / cada campeón) con la lista de archivos y hojas de contacto en `art/review_8dir/`. Si una generación falla, reintenta esa tira antes de seguir.
