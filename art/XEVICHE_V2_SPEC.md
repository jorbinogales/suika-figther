# Xeviche V2 (rediseño + nuevo kit: ahora "Poder de IA", mago) — arte (Codex)

Formato idéntico al resto de campeones (`art/SPRITE_SPEC.md`, encuadre como `art/raw/jorbi/walk.png`): tiras horizontales de celdas cuadradas 512x512, fondo MAGENTA PURO #FF00FF plano, mira a la DERECHA, misma escala en todos los cuadros, pies en la misma línea (~90 %), ~74 % de la altura, contorno negro, bordes duros, pixel art. Los EFECTOS rojo/rosa deben ser rojo carmesí o coral, NUNCA magenta/fucsia (se confundiría con el fondo clave).

## NUEVO DISEÑO DE XEVICHE (reemplaza al actual: ya no es el tanque corpulento de camiseta marrón)
Misma cara, pelo, gafas y rasgos que `art/ref/xeviche.png`, pero **más delgado** (complexión esbelta, hombros normales, sin barriga) y con **camisa de vestir gris distinguida de manga larga con franjas naranjas en los bordes de las mangas (puños) y en el cuello**, y **pantalón caqui** (color arena) con zapatos oscuros. Aspecto de empresario joven y elegante, mago tecnológico. Mismo estilo pixel art y contorno negro.

## A) Animaciones -> `art/raw/xeviche/<anim>.png` (SOBRESCRIBE las 9 existentes)
| anim | cuadros | descripción |
|------|---------|-------------|
| idle | 4 | respiración tranquila, postura elegante, una mano en el bolsillo |
| walk | 6 | caminata |
| run | 6 | carrera inclinada hacia delante |
| attack | 5 | ataque básico mágico: extiende una mano con la palma abierta y dispara un pequeño bloque de lego (preparar, disparo, recuperar) |
| power1 | 6 | "Lluvia de lego": lanza piezas de lego con ambas manos a toda velocidad, ráfaga rápida (brazos alternando, pequeño destello en las manos) |
| power2 | 6 | "Arepa reina pepiada" (pasiva, se usa para el aviso de escudo): se frota las manos y un escudo de energía azul claro lo envuelve; termina con el escudo brillando |
| power3 | 6 | "Una bonita sonrisita": guiña un ojo, forma un corazón con los dedos y lo lanza hacia delante con un beso, sonrisa pícara |
| ult | 8 | "Karis Harem": se da la vuelta y se queda de ESPALDAS a la cámara (se ve su espalda, de pie, brazos cruzados o manos en la cintura, pose de jefe), con un leve resplandor dorado; los últimos cuadros mantienen la pose de espaldas (bucle apto) |
| death | 6 | cae y queda tendido, último cuadro = pose final |

## B) Ayudantes de Karis Harem -> `art/raw/statics/helper_a.png`, `helper_b.png`, `helper_c.png`
Tres empleadas jóvenes, estilizadas y bonitas (pixel art estilizado, tono cómico y simpático, vestuario de oficina decente), con el MISMO uniforme: camisa gris con franjas naranjas en puños y cuello y falda/pantalón caqui, zapatos oscuros; cada una con peinado y color de pelo distinto (a: pelo largo negro, b: coleta castaña, c: pelo corto rubio). Tira horizontal de **6 cuadros de 256x256** cada una (mira a la DERECHA): cuadros 1-2 aparecen (destello de teletransporte y aterrizaje), 3-6 en bucle "canalizando": ambas manos extendidas hacia delante lanzando energía con destellos en las palmas.

## C) Efectos / objetos
- `art/raw/objects/lego_brick.png`: 1024x256 = 4 cuadros de 256x256, cada uno una pieza de lego distinta (roja, azul, amarilla, verde), vista lateral, 2x4 tacos, brillo; se usan como proyectiles.
- `art/raw/objects/heart.png`: 512x512, UN gran corazón rojo carmesí con brillo y pequeñas chispas, pixel art, centrado ~60 %.
- `art/raw/statics/shield_bubble.png`: 1536x256 = 6 cuadros de 256x256 en bucle, esfera de energía azul claro translúcida con destellos hexagonales que rodea a un personaje (centrada, ocupa ~85 % de la celda), pulso suave.
- `art/raw/statics/beam_harem.png`: 1536x256 = 6 cuadros de 256x256 en bucle: rayo horizontal grueso que sale del borde IZQUIERDO hacia la DERECHA (núcleo blanco, capa dorada y borde cian, chispas), cada cuadro algo distinto; debe poder estirarse a lo largo (centrado verticalmente, ocupa ~70 % de la altura).

## D) Iconos de habilidad 128x128 (fondo magenta, uno centrado, como art/raw/icons/*.png) -> `art/raw/icons/`
- xeviche_p1.png  tres piezas de lego (rojo, azul, amarillo) volando con estela
- xeviche_p2.png  una esfera/escudo azul brillante con una arepa dorada en el centro
- xeviche_p3.png  un corazón rojo con una cara sonriente guiñando
- xeviche_ult.png tres siluetas de empleadas de pie con un gran rayo dorado-blanco saliendo hacia la derecha

## E) Referencia y arte conceptual (al final, con el nuevo diseño)
- Actualiza `art/ref/xeviche.png` (1122x1402, mismo estilo que las otras refs, cuerpo completo de frente) con el nuevo diseño.
- Regenera `art/raw/concept/xeviche.png` (768x1152 splash art vertical: mago-empresario esbelto de camisa gris con franjas naranjas y pantalón caqui, lanzando una ráfaga de piezas de lego con una mano mientras un corazón flota a su lado, tres ayudantes difusas al fondo, escenario: oficina futurista; paleta gris, naranja y cian) y `art/raw/concept/xeviche_face.png` (256x256, rostro del nuevo diseño con cuello de camisa gris y franja naranja).

Entrega todo y verifica tamaños exactos. Avísame al terminar.
