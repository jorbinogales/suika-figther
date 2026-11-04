# Sprites en 8 direcciones — especificación para Codex

El juego pasa de sprites que solo miran a la DERECHA (y se espejan para la izquierda) a **8 direcciones**:
arriba, abajo, izquierda, derecha y las cuatro diagonales. Para no dibujar todo dos veces, el motor **espeja** las direcciones del lado
izquierdo. Por lo tanto solo se dibujan **5 direcciones** por animación:

| sufijo | dirección en pantalla | cómo se ve el personaje |
|--------|----------------------|-------------------------|
| `s`  | ABAJO (hacia la cámara)  | de FRENTE, cara y torso completos, simétrico |
| `se` | ABAJO-DERECHA            | 3/4 de frente, mira hacia la cámara y hacia la derecha |
| `e`  | DERECHA                  | de PERFIL puro mirando a la derecha (la vista que ya existe) |
| `ne` | ARRIBA-DERECHA           | 3/4 de ESPALDAS, se aleja de la cámara hacia la derecha (se ve la nuca/espalda, algo de perfil) |
| `n`  | ARRIBA (se aleja)        | de ESPALDAS, nuca y espalda completas, simétrico |

(El motor genera `sw`, `w`, `nw` espejando `se`, `e`, `ne`. NO las dibujes.)

## Archivos
`art/raw/<personaje>/<anim>_<dir>.png` — por ejemplo `art/raw/xeviche/walk_se.png`.

Formato IDÉNTICO al de `art/raw/<personaje>/walk.png` (mira esa imagen y `art/SPRITE_SPEC.md` antes de empezar):
- tira horizontal de celdas CUADRADAS de **512x512** px; el ancho de la imagen = nº de cuadros × 512;
- fondo **MAGENTA PURO #FF00FF plano** (sin degradados, sin sombras en el suelo, sin anti-aliasing contra el magenta);
- pixel art con el MISMO estilo que las tiras actuales: contorno negro de 1 px lógico, paleta limitada, sombreado en bloques, luz desde arriba-izquierda;
- el personaje centrado horizontalmente en su celda, con los PIES apoyados siempre en la misma fila (la misma que en `walk.png` actual, ≈ 89 % de la altura de la celda)
  y la MISMA altura total de personaje que en `walk.png` actual (misma escala en las 5 direcciones y en todos los cuadros);
- mismo diseño exacto del personaje (cara, pelo, gafas, ropa, colores, proporciones) que en `art/ref/<personaje>.png` y en sus tiras actuales. Es el MISMO personaje visto desde otro ángulo:
  si lleva mochila, la mochila se ve de frente/espalda según corresponda; si el pelo tiene raya o flequillo, se ve coherente en cada ángulo.

## Sincronía (lo más importante)
Para cada animación, **las 5 direcciones tienen el MISMO número de cuadros y la MISMA fase de movimiento en cada cuadro**:
el cuadro 3 de `walk_s` es el mismo instante del ciclo (mismo pie delante, mismo balanceo de brazos) que el cuadro 3 de `walk_se`, `walk_e`, `walk_ne` y `walk_n`.
Así el motor puede cambiar de dirección a mitad de la animación sin saltos. En ataques y habilidades, el cuadro de IMPACTO/lanzamiento es el mismo en todas las direcciones.

Ciclos (`idle`, `walk`, `run`) en bucle perfecto: el último cuadro enlaza con el primero sin salto.

## Nº de cuadros (más suaves que los actuales)
| anim | cuadros | notas |
|------|---------|-------|
| idle | 6 | respiración + pequeño balanceo, el carácter propio del personaje (ver sus tiras actuales) |
| walk | 8 | ciclo de paso completo, brazos opuestos a las piernas, leve rebote vertical del cuerpo |
| run  | 8 | inclinado hacia delante, zancada larga, brazos bombeando |

(Habilidades — `attack`, `power1`, `power2`, `power3`, `ult` — se pedirán en una fase posterior con el mismo formato de 5 direcciones.)

## Detalles por dirección
- `s` (frente): el personaje camina hacia el espectador; piernas y brazos se ven acortados por la perspectiva (escorzo), pasos alternando uno-delante-otro. Cara visible.
- `n` (espalda): igual pero de espaldas; se ve el pelo por detrás, la espalda de la ropa, mochila si la hay. Sin cara.
- `se` / `ne`: ángulos de 45°; el personaje se desplaza hacia la derecha y hacia abajo/arriba de la pantalla. Cuida que el torso gire ~45° y que no parezca un perfil con la cabeza torcida.
- `e` (perfil derecho): redibújalo con los nuevos nº de cuadros, mismo estilo que el actual pero con el ciclo mejorado.

## Entrega y verificación
1. Guarda los PNG en `art/raw/<personaje>/` con los nombres exactos. NO sobrescribas `idle.png`, `walk.png`, `run.png` (siguen siendo el respaldo).
2. Verifica tamaños: `ancho = cuadros × 512`, `alto = 512`; magenta puro en el fondo.
3. Haz una hoja de contacto de revisión `art/review_8dir/<personaje>_<anim>.png` con las 5 direcciones en filas (una fila por dirección, todos los cuadros) para comprobar la sincronía de fase.
4. Avísame al terminar cada personaje/animación con la lista de archivos.
