# Yonaiker V3 (nuevo kit: bombardero aéreo, cajas de ayuda y humo) — arte (Codex)

Formato idéntico al resto (`art/SPRITE_SPEC.md`, encuadre como `art/raw/jorbi/walk.png`): tiras horizontales de celdas cuadradas 512x512, fondo MAGENTA PURO #FF00FF plano, mira a la DERECHA, misma escala en todos los cuadros, pies en la misma línea (~90 %), ~74 % de la altura, contorno negro, bordes duros, pixel art. Efectos rojos/rosas: rojo carmesí o coral, NUNCA magenta/fucsia. Yonaiker conserva su diseño exacto (`art/ref/yonaiker.png`: camiseta blanca, jeans, pelo negro, pistola-herramienta).

## A) Animaciones nuevas de habilidades -> `art/raw/yonaiker/<anim>.png` (SOBRESCRIBE solo estas 4; idle/walk/run/attack/death se quedan)
| anim | cuadros | descripción |
|------|---------|-------------|
| power1 | 6 | "Bombardero": se detiene y espera mirando al cielo con una mano levantada haciendo señal a una nave que llega; los últimos cuadros (bucle apto) con el brazo en alto, cabello moviéndose por el viento de la nave, luces rojas de señal |
| power2 | 6 | "Granada de humo": saca una granada de humo, quita el seguro con los dientes/mano y la lanza hacia delante con el brazo (preparar, lanzar, recuperar) |
| power3 | 6 | "Cajas de ayuda": se lleva una radio de mano a la boca con una mano y con la otra señala al cielo pidiendo suministros, destellos de señal azul |
| ult | 8 | "Cortina de humo": lanza al aire un gran bote de humo gris-verde hacia arriba con ambas manos y se cubre la boca con el antebrazo mientras el humo sale; últimos cuadros con el brazo extendido |

## B) Nave (splash art LATERAL) -> `art/raw/objects/yon_ship_side.png`
**Vista lateral pura (de perfil) de una nave bombardera/transporte VTOL futurista**, mirando a la DERECHA: fuselaje gris acero y blanco con detalles azul cian y franjas naranjas de aviso, dos grandes turbinas verticales con propulsión azul, cabina con cristal, ametralladoras laterales, bahía de carga con rampa baja abierta (por donde recoge a Yonaiker), tren de aterrizaje, 4 lanzamisiles bajo las alas con misiles. Pixel art detallado con contorno negro, sombreado nítido. Fondo magenta plano. Tamaño EXACTO **1024x512**, la nave ocupa ~90 % del ancho.
Además la versión splash ilustrada de esa nave en vuelo (concept art, NO pixel art, estilo de `art/raw/concept/*.png`) -> `art/raw/concept/yon_ship.png` 1152x768 (horizontal), vista lateral, sobre nubes al atardecer, con Yonaiker visible sentado en la rampa abierta.

## C) Objetos y efectos -> `art/raw/objects/` y `art/raw/statics/`
- `art/raw/objects/bomber_reticle.png` 512x512 (magenta): mira de bombardero vista desde arriba: círculo doble verde fosforescente con cruz central, marcas de distancia, esquinas en corchete, sin relleno (el centro debe quedar vacío).
- `art/raw/objects/supply_crate.png` 512x512: caja de suministros militar azul grisáceo con cruz blanca y bandas amarillas colgando de un paracaídas blanco pequeño (vista casi de frente, el paracaídas arriba), un solo sujeto centrado ~70 %.
- `art/raw/statics/smoke_cloud.png` 1536x256 = 6 cuadros de 256x256 en bucle: nube de humo gris-verdoso vista desde arriba, esponjosa y arremolinada, semitransparente en los bordes, centrada (ocupa ~90 %), cada cuadro algo distinto (remolino).
- `art/raw/objects/smoke_grenade.png` 512x512: granada de humo cilíndrica verde militar con anilla y vapor, un sujeto centrado ~50 %.

## D) Iconos de habilidad 128x128 (fondo magenta, uno centrado, como art/raw/icons/*.png) -> `art/raw/icons/`
- yonaiker_p1.png  la nave bombardera de perfil soltando misiles con estelas de fuego y una mira verde debajo
- yonaiker_p2.png  una granada de humo soltando una nube verdosa
- yonaiker_p3.png  una caja de suministros con paracaídas y cruz blanca
- yonaiker_ult.png un enorme mapa/zona cubierta por una nube de humo gris con un símbolo de silencio (boca tapada) en el centro

## E) Arte conceptual nuevo (al final)
- `art/raw/concept/yonaiker.png` 768x1152 (vertical, estilo de los otros splash arts, MUY distinto al anterior): Yonaiker de pie al borde de la rampa abierta de su nave bombardera en pleno vuelo, de lado hacia la cámara con el viento sacudiéndole la ropa, una mano sobre la radio y la otra señalando el objetivo; abajo, el mapa en llamas por los misiles y columnas de humo; cielo naranja de atardecer. Contrapicado dramático, paleta blanco, naranja y azul acero.
- `art/raw/concept/yonaiker_face.png` 256x256: rostro de Yonaiker con el casco-auriculares de piloto y el reflejo naranja del atardecer, mismo estilo que las otras caras.

Entrega todo y verifica tamaños exactos. Avísame al terminar.
