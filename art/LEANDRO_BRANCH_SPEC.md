# Leandro — segunda rama de habilidades: ENCARGO DE ARTE PARA CODEX

Cada habilidad de Leandro tiene ahora DOS versiones (el jugador elige una al aprenderla). Esta es la lista de arte de las versiones nuevas.
Mismo estilo y pipeline que el resto del juego: pixel art con contorno negro, fondo MAGENTA PURO #FF00FF plano, celdas cuadradas 512x512, pies en la misma fila y
misma escala que `art/raw/leandro/walk_e.png`. Los iconos/objetos provisionales ya existen (`tools/leandro_placeholders.py`): SOBRESCRIBE los archivos con el MISMO nombre.
Cuando termines un bloque avísame (hojas de contacto en `art/review_8dir/`) y yo ejecuto `python tools/process_sprites.py`. Orden: A → D → B → C.

## A) Iconos 128x128 -> `art/raw/icons/` (un solo icono centrado, fondo magenta)
- `leandro_p1b.png`  Q "Poder del peine": un peine gigante naranja con dientes grandes y una onda de energía turquesa saliendo hacia delante.
- `leandro_p2b.png`  F "Poder de la secadora": secadora de pelo rosada soplando aire, con dos flechas pequeñas opuestas (jalar / repeler).
- `leandro_p3b.png`  E "Lanzamiento de cauchos": cuatro cauchos en el aire con líneas de trayectoria que rebotan hacia delante (tres arcos), el último en llamas.
- `leandro_ultb.png` R "Filtraciones": una cúpula/jaula hexagonal turquesa vista desde arriba con un minimapa tecnológico dentro y un ojo/radar en el centro.

## B) Tiras de poderes de Leandro -> `art/raw/leandro/` (SIN dirección: mira a la DERECHA, el motor la espeja)
- `power1b.png` (8 cuadros) — **Poder del peine**: Leandro saca de su espalda un ENORME peine (más grande que él), lo muestra girándolo y brillando, y lo deja alzado. El último cuadro es la pose con el peine en la mano.
- `power2b_pull.png` (6) — **Secadora, JALAR**: saca la secadora de pelo, apunta al frente y sopla en modo aspirar (líneas de viento que van HACIA él).
- `power2b_push.png` (6) — **Secadora, REPELER**: la misma secadora pero sopla hacia delante con retroceso (líneas de viento que se alejan, el cuerpo se echa atrás).
- `power3b.png` (6) — **Lanzamiento de cauchos**: levanta una pila de 4 cauchos y los lanza por encima del hombro hacia delante; el último cuadro es el seguimiento del tiro.
- `ultb.png` (8) — **Filtraciones**: teclea en un teclado holográfico / móvil con anillos de datos turquesa y glitch; termina con los brazos abiertos (se activa la jaula / el teletransporte).

## C) Skin "Leandro con el peine" -> `art/raw/leandro_comb/` (5 direcciones `_s _se _e _ne _n`, mismos cuadros y fase en cada dirección)
Mientras el peine está activo Leandro lleva el peine naranja gigante en la mano derecha y pelea CUERPO A CUERPO (reglas de `art/COMBO_8DIR_SPEC.md`: los golpes se encadenan, el último cuadro de cada golpe es el primero del siguiente, sin volver a idle).
- `idle_<d>` 6, `walk_<d>` 8, `run_<d>` 8: igual que Leandro pero con el peine en la mano.
- `attack_<d>` 6: barrido horizontal con el peine, impacto en el cuadro 3. `attack2_<d>` 6: barrido de vuelta (revés), más rápido. `attack3_<d>` 8: remate, el peine se alza y golpea hacia abajo con paso adelante; impacto en el cuadro 5.
- `lunge_<d>` 6: ataque con impulso, estocada hacia delante con el peine.
La muerte y los poderes siguen usando las tiras normales de `leandro`. NO dibujes la onda del golpe: la pone el motor.

## D) Objetos 512x512 -> `art/raw/objects/` (UN sujeto centrado, fondo magenta)
- `comb.png`  el peine gigante naranja apuntando a la DERECHA (vista lateral).
- `hair_dryer.png`  la secadora rosada apuntando a la DERECHA.
- `virtual_arena.png`  **escenario virtual** (vista cenital top-down): un pequeño minimapa tecnológico CIRCULAR que llena casi todo el cuadro: suelo de losetas azul oscuro tipo placa de circuitos, rejilla turquesa luminosa, borde hexagonal brillante, emblema en el centro. Debe parecer un terreno digital, no el bosque. Se usará como suelo de la jaula y como cúpula opaca.
- `virtual_cage.png`  anillo/cúpula hexagonal turquesa con barras de luz verticales (el borde de la jaula).
- `tire_squash.png`  el caucho aplastado en el instante de tocar el suelo (más ancho y bajo, con polvo).
- `tire_fire.png`  caucho EN LLAMAS (naranja/amarillo) en el aire, listo para girar.
- `tire_fire_squash.png`  el caucho en llamas aplastado al tocar el suelo, con chispas.
(El caucho normal `tire.png` ya existe.)

## Cómo se usan en el juego
- Q peine: cast `power1b` -> Leandro cambia a la skin `leandro_comb` mientras dura; ataques básicos = combo de peine con onda corta al frente.
- F secadora: con confirmación (flechas de la zona cambian de color y de sentido al repeler) -> `power2b_pull` / `power2b_push`.
- E cauchos: los cauchos saltan en arco SIEMPRE hacia delante (3 botes): rango 1 normal, rango 2 rompe el suelo y aturde un instante, rango 3 caucho en llamas que además deja fuego.
- R filtraciones: `ultb`; escenario virtual `virtual_arena` y oscuridad fuera del círculo para quien está dentro.

## E) NUEVO — animación de la onda del peine ("Getsuga" de Leandro, corto alcance)
Tira `art/raw/objects/comb_wave_anim.png`: 6 cuadros 512x512 (fondo magenta, sin dirección, apunta a la DERECHA), una media luna de energía turquesa/blanca ANGOSTA (alta ~40 % del cuadro, delgada),
que nace (cuadro 1 chispa pequeña), se estira en media luna afilada (2-4, el cuerpo del ataque, con estela y chispas) y se deshace en partículas (5-6). Se repetirá mientras la onda vuela (cuadros 2-4 en bucle).
Estilo pixel art del juego con contorno luminoso (no negro grueso), debe leerse bien sobre tierra y pasto.
