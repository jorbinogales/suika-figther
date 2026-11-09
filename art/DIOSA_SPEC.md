# Diosa Canales (nuevo campeón: asesina / escaramuzadora AD, recurso "Farándula") — especificación de arte para Codex

Pixel art con el MISMO estilo, formato y escala que el resto del plantel: `art/SPRITES_8DIR_SPEC.md` (5 direcciones s/se/e/ne/n, misma fase en cada una), `art/COMBO_8DIR_SPEC.md`
(cadena de golpes y `lunge`) y `art/SPRITE_SPEC.md` (celdas cuadradas 512x512, fondo MAGENTA PURO #FF00FF plano, contorno negro, pies en la misma fila, misma altura que `art/raw/jorbi/walk.png`).
Flujo: tiras en `art/raw/diosa/...` y yo ejecuto `python tools/process_sprites.py`. Avísame al terminar cada bloque con hojas de contacto en `art/review_8dir/`.

## Diseño (SOLO esta descripción; no hay foto de referencia)
Cantante / presentadora de espectáculos de escenario, estilo elegante y divertido, con ropa de ESCENARIO COMPLETA (nada revelador):
- pelo negro MUY largo y liso hasta la cintura, ojos marrones grandes, maquillaje marcado, labios rosados, piel morena clara; expresión segura y juguetona;
- vestido de escenario negro de manga larga, hasta la rodilla, con detalles y lazos ROSA fucsia; guantes largos negros con cordones y lazos rosas; tacones de aguja rosas;
- accesorio característico: un micrófono de pie retro, plateado/cromado, con base; lo usa como bastón y como arma (la barra del pie).
Caricatura de pixel art proporcionada como los demás campeones (cabeza algo grande, cuerpo compacto).

## Cómo pelea (para las poses)
Ataque básico cuerpo a cuerpo: golpes con la barra del micrófono y patadas de tacón (combo 1 golpe, 2 golpe con giro, 3 patada/golpe grande); `lunge` = avanza deslizándose con un golpe.
- Q "Pose de portada": dash rápido en línea con una pose de portada de revista (deja destellos rosas); si vuelve a pulsarla, voltereta hacia atrás lanzando besos.
- W "Tumbando la zona": baile con giro de cadera y pelo ondeando, brazos arriba, destellos rosas alrededor.
- E "Tacón de aguja": estocada recta hacia delante con el tacón.
- R "Show principal": se eleva con los brazos abiertos entre focos de luz y cae con un destello de flashes de cámaras.

## A) `art/raw/diosa/`
Con dirección (`_s _se _e _ne _n`): idle 6, walk 8, run 8, attack 6, attack2 6, attack3 8, lunge 6.
Sin dirección (mira a la DERECHA, el motor la espeja): `power1.png` 6 (Q: dash con pose + voltereta), `power2.png` 6 (W baile), `power3.png` 6 (E estocada), `ult.png` 8 (R: elevarse y caer), `death.png` 6.

## B) Arte de selección -> `art/raw/concept/` (ver `art/CONCEPT_SPEC.md`)
`diosa.png` 768x1152 (cuerpo completo con el micrófono, ambiente de escenario con focos rosas) y `diosa_face.png` 256x256 (cara y hombros).

## C) Iconos 128x128, fondo magenta, un icono centrado -> `art/raw/icons/`
- `diosa_passive.png` un par de labios rosas con una pequeña corona y destellos
- `diosa_p1.png`      una portada de revista con un destello y una flecha de dash rosa
- `diosa_p2.png`      un corazón rosa hipnótico con espirales y notas musicales
- `diosa_p3.png`      un tacón de aguja rosa clavado con un destello de impacto
- `diosa_ult.png`     un foco de escenario con flashes de cámara estallando

## D) Objetos -> `art/raw/objects/` (512x512, magenta, UN sujeto centrado ~60 %, apuntando a la DERECHA si tiene dirección)
- `kiss_blast.png`  beso: labios rosas formando un corazón pequeño, con brillo
- `retro_mic.png`   micrófono de pie retro cromado, completo, en vertical
- `camera_flash.png` estallido de flash de cámara blanco con rayos

## Orden de entrega sugerido
B y C (cara e iconos) -> A: idle/walk/run -> A: ataques y lunge -> A: power1-3, ult, death -> D.
