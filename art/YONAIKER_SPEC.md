# Yonaiker (nuevo campeón, clase "Soporte", ataca a distancia con daño físico) — arte (Codex)

Referencia: `art/ref/yonaiker.png` (joven, pelo negro corto con degradado, camiseta blanca con estampado, jeans azul oscuro, tenis negros; mantén cara, ropa, colores y proporciones EXACTOS). Mismo formato que los demás campeones (`art/SPRITE_SPEC.md`, encuadre como `art/raw/jorbi/walk.png`): un PNG por animación, tira horizontal de N celdas cuadradas de 512x512, fondo MAGENTA PURO #FF00FF plano, mira a la DERECHA, misma escala en todos los cuadros, pies sobre la misma línea (~90 % de la altura), ~74 % de la altura de la celda, contorno negro, bordes duros. Es un técnico/ingeniero de campo que despliega robots; lleva una pequeña pistola-herramienta tecnológica (cuerpo blanco y azul) en la mano derecha.

## A) art/raw/yonaiker/<anim>.png
| anim   | cuadros | descripción |
|--------|---------|-------------|
| idle   | 4 | respiración tranquila, la pistola-herramienta en la mano |
| walk   | 6 | ciclo de caminata |
| run    | 6 | carrera más rápida |
| attack | 5 | ataque básico: apunta la pistola-herramienta hacia delante y dispara (preparar, disparo con destello pequeño, retroceso, recuperar) |
| power1 | 6 | "Robot centinela": se agacha y entierra en el suelo un pequeño robot (lo deja caer y lo cubre de tierra con la mano), termina con un montículo diminuto |
| power2 | 6 | "Trampa": se agacha y coloca una placa/trampa plana en el suelo con una mano, la camufla, se levanta con un guiño |
| power3 | 6 | "Centinela de visión": clava en el suelo una pequeña torre-antena con un ojo/lente y una cruz verde, ajusta una pantalla en su muñeca |
| ult    | 8 | "Barricada": golpea el suelo con el pie y levanta con ambas manos una barricada metálica portátil frente a él (dispositivo que despliega paneles), termina con los brazos abiertos |
| death  | 6 | cae y queda tendido, último cuadro = pose final |

## B) Iconos 128x128 (fondo magenta, un icono centrado, mismo estilo que art/raw/icons/*.png) -> art/raw/icons/
- yonaiker_p1.png  un pequeño robot centinela con un cañón asomando de un montículo de tierra
- yonaiker_p2.png  una trampa de placa con dientes/red metálica y un destello azul, medio camuflada con hojas
- yonaiker_p3.png  una torre-antena con un ojo azul y una cruz verde, con ondas de vigilancia
- yonaiker_ult.png una barricada metálica con dos torretas robot en los extremos, con chispas

## C) Objetos -> art/raw/objects/ (512x512, fondo magenta, UN sujeto centrado ~60 %, pixel art, vista 3/4 desde arriba)
- sentry_robot.png   robot centinela pequeño y rechoncho, azul y blanco, de pie con un cañón en el brazo derecho, apuntando a la derecha
- sentinel_robot.png robot-antena de visión y curación: cuerpo cilíndrico blanco, un gran ojo-lente azul y una cruz verde luminosa, antena y ondas
- trap_plate.png     placa de trampa plana en el suelo (vista casi cenital), metálica con dientes plegados y un símbolo azul tenue
- barricade_seg.png  UN panel de barricada metálico (gris azulado con franjas amarillas de aviso), horizontal, visto desde arriba/3-4, ~doble de ancho que de alto
- turret_robot.png   torreta robot pequeña y distinta a las torres militares y a las robot rojas: base redonda blanca-azul, torreta giratoria con dos cañones cortos y un ojo cian, aspecto de dron-torreta compacto, apuntando a la derecha

## Aclaración: el robot de la Q y el centinela de la E son DISTINTOS
- Q = `sentry_robot.png`: robot ARTILLERO bajito y ancho, con cañón; color azul/blanco con detalles naranjas de advertencia.
- E = `sentinel_robot.png`: robot de VISIÓN/CURACIÓN alto y delgado, cuerpo cilíndrico blanco con antena, ojo-lente azul y cruz verde; sin armas. Debe verse claramente distinto del de la Q.
- Extra para la Q enterrado: `art/raw/objects/sentry_mound.png` (512x512): un pequeño montículo de tierra removida con una mirilla/lente apenas asomando.

## Extra: imágenes de DISPARO de los robots estáticos (mismo tamaño y encuadre que su imagen normal, 512x512, fondo magenta)
- `art/raw/objects/sentry_robot_fire.png`: el mismo robot artillero de la Q en el instante de disparar: destello de boca de cañón cian-blanco grande, ligero retroceso del cañón, ojos más brillantes.
- `art/raw/objects/turret_robot_fire.png`: la misma torreta robot disparando: destellos en los dos cañones, ojo cian brillante, ligero retroceso.

## V2 (reemplaza lo anterior para la R y la animación de ataque de los robots estáticos)
Mismo pixel art, fondo MAGENTA #FF00FF plano, mismas reglas de siempre.

### Animaciones de ataque (tiras horizontales, celdas cuadradas de 256x256, el robot centrado con la base en la misma línea en todos los cuadros, mirando a la DERECHA) -> `art/raw/statics/`
- `sentry_fire.png` — 1024x256 (4 cuadros): el robot artillero de la Q (el mismo de `sentry_robot.png`) ATACANDO: 1) se asoma y apunta, 2) dispara con gran destello de boca y retroceso del cañón y del cuerpo, 3) humo y casquillo saliendo, 4) vuelve a la posición. Debe ser una animación de dibujo real (no un simple cambio de escala).
- `sentry_idle.png` — 256x256: el mismo robot en reposo, apuntando a la derecha.
- `minigun_idle.png` — 256x256: TORRETA MINIGUN recta y compacta (distinta de la torreta robot de la Q y de las torres militares): base cuadrada de acero con soportes, pivote, un bloque de 6 cañones rotatorios largos apuntando a la derecha, cinta de munición lateral, luces rojas/naranjas, colores gris oscuro y naranja de advertencia.
- `minigun_fire.png` — 1024x256 (4 cuadros): la misma torreta minigun disparando en ráfaga: el bloque de cañones girando (distinta posición en cada cuadro), destellos de boca alternados en los cañones, casquillos saliendo, vibración mínima del cuerpo.

### La reja de la R -> `art/raw/objects/` (vista TOP-DOWN, no 3/4)
- `fence_h.png` — 1024x256: una reja metálica LARGA y RECTA horizontal, vista desde arriba: dos rieles de acero gris azulado con postes cada cierto tramo, barrotes entre los rieles, franjas amarillas y negras de aviso en los postes de los extremos, remaches. Ocupa casi todo el ancho de la imagen y ~45 % del alto, centrada.
- `fence_v.png` — 256x1024: la MISMA reja pero vertical (girada 90°), vista desde arriba, centrada.

### Robot de curación de la E, animado (flota y emite señal)
- `art/raw/statics/sentinel_float.png` — 1024x256 (4 cuadros, bucle): el MISMO robot de visión/curación de `sentinel_robot.png` FLOTANDO a poca altura sobre el suelo (pequeña sombra elíptica fija debajo), con un ligero vaivén vertical entre cuadros y los DOS arcos curvos de señal (ondas cian) que salen de su antena PULSANDO: cada cuadro muestra las ondas en una fase distinta (más pequeñas -> más grandes -> se desvanecen), la cruz verde parpadea suave.
