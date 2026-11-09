# Maduro (nuevo campeón) + su forma Súper Bigote — especificación de arte para Codex

Caricatura en pixel art, igual de estilizada que el resto del plantel (cabeza grande, cuerpo compacto). Mismo formato, escala y pipeline que los demás campeones:
`art/SPRITES_8DIR_SPEC.md` (5 direcciones s/se/e/ne/n, sincronía de fases), `art/COMBO_8DIR_SPEC.md` (cadena de golpes y `lunge`) y `art/SPRITE_SPEC.md`
(celdas cuadradas 512x512, fondo MAGENTA PURO #FF00FF plano, contorno negro, pies en la misma fila, misma altura que `art/raw/jorbi/walk.png`).
Flujo: tiras en `art/raw/<id>/...` y yo ejecuto `python tools/process_sprites.py`. Avísame al terminar cada bloque con hojas de contacto en `art/review_8dir/`.

## Referencias (están en disco)
- `art/ref/maduro.png` — retrato oficial: pelo negro corto peinado hacia atrás, bigote negro grueso y ancho, tez morena, traje negro, camisa blanca, corbata roja,
  banda presidencial tricolor (amarillo, azul con 8 estrellas blancas, rojo) cruzada del hombro derecho a la cadera izquierda con el escudo bordado, cadena de medallones
  dorados al cuello, estrella plateada en la solapa. Complexión robusta. Haz una caricatura de pixel art reconocible, sin burlarte de rasgos físicos más allá del estilo del juego.
- `art/ref/superbigote.jpg` — dibujo animado de "Súper Bigote": casco de obra ROJO con la bandera tricolor en la frente, visor/gafas azules que tapan los ojos, bigote negro
  grueso, traje rojo ajustado, capa azul, guantes y botas azules, cinturón gris con hebilla amarilla, escudo amarillo-rojo con las letras "SB" en el pecho, y un PUÑO BIÓNICO
  metálico gris en el brazo derecho (el que levanta). Su forma debe basarse exactamente en esto.

Dos "personajes de sprite": `maduro` (forma normal) y `maduro_sb` (Súper Bigote, es una variante transformada como `jorbi_buff`: mismo tamaño y misma escala, algo más musculoso).

## Lo que hace cada habilidad (para las poses)
Maduro (normal): ataque básico = lanza DECRETOS (pergaminos enrollados con sello rojo) con la mano; combo: 1 lanzamiento, 2 doble lanzamiento, 3 decreto grande con sello.
- Q "Decreto presidencial": grita por un MEGÁFONO gigante en línea recta (onda de sonido).
- W "Colectivo protector": cruza los brazos y aparecen escoltas de traje oscuro y gafas negras que forman un círculo protector a su alrededor.
- E "Cesta básica / Súper bigote": lanza por encima del hombro una CAJA de cartón vacía (hacia un área o un aliado).
- R "¡Aparición de Súper Bigote!": se abre el saco como un héroe, destello, giro y queda transformado en Súper Bigote (el último cuadro YA ES la pose de Súper Bigote).
Súper Bigote (potenciadas): Q "Puño de hierro" vuela hacia delante y golpea el suelo con el puño metálico; W "Escudo antimperialista" levanta el antebrazo y se forma una burbuja
de energía electromagnética azul; E "Mano de hierro" dispara hacia delante su mano biónica extendida; ataques básicos = puñetazos.

## A) `art/raw/maduro/` (forma normal)
Con sufijo de dirección `_s _se _e _ne _n` (5 direcciones, mismo nº de cuadros y fase en cada una):
idle 6, walk 8, run 8, attack 6, attack2 6, attack3 8, lunge 6.
Sin dirección (mira a la DERECHA, el motor la espeja): `power1.png` 6 (Q megáfono), `power2.png` 6 (W escoltas), `power3.png` 6 (E caja), `ult.png` 8 (transformación), `death.png` 6.
`lunge` = ataque avanzando como un solo ataque con su propia animación (se desliza hacia delante lanzando el decreto).

## B) `art/raw/maduro_sb/` (Súper Bigote, mismas reglas)
Con dirección: idle 6, walk 8, run 8, attack 6, attack2 6, attack3 8, lunge 6. Sin dirección: `power1.png` 6 (Q vuelo + puñetazo al suelo), `power2.png` 6 (W escudo), `power3.png` 6 (E mano de hierro),
`death.png` 6. La capa azul ondea con el movimiento. `lunge` = puñetazo volador hacia delante.

## C) Arte de selección -> `art/raw/concept/` (ver `art/CONCEPT_SPEC.md`)
- `maduro.png` 768x1152 y `maduro_face.png` 256x256 (forma normal, con la banda tricolor; pose firme con megáfono o decreto en la mano).
- `maduro_sb_face.png` 256x256 (cara de Súper Bigote con casco rojo y visor azul, para el retrato mientras está transformado).
Mismo estilo e iluminación que los demás conceptos, sin texto ni marcos.

## D) Iconos de habilidad 128x128, fondo magenta, un solo icono centrado -> `art/raw/icons/`
- `maduro_passive.png`  una moneda dorada que se encoge con una flecha roja hacia abajo (devaluación)
- `maduro_p1.png`       megáfono gigante con ondas de sonido amarillas
- `maduro_p2.png`       círculo de siluetas de escoltas con traje oscuro y gafas negras, brillo azul
- `maduro_p3.png`       caja de cartón vacía abierta con una flecha curva de lanzamiento
- `maduro_ult.png`      escudo amarillo-rojo con "SB" sobre un casco rojo de obra
- `maduro_p1_sb.png`    puño metálico gris golpeando el suelo con grietas y onda de choque
- `maduro_p2_sb.png`    burbuja de energía azul eléctrica con destellos
- `maduro_p3_sb.png`    mano metálica biónica extendida con cables

## E) Objetos -> `art/raw/objects/` (512x512, fondo magenta, UN sujeto centrado ~60 %, pixel art, apuntando a la DERECHA si tiene dirección)
- `decree_scroll.png`  pergamino enrollado con cinta y sello rojo (proyectil del ataque básico)
- `megaphone.png`      megáfono gigante blanco y rojo con la boca a la derecha (ya sin Maduro)
- `bodyguard.png`      escolta de frente, traje negro, gafas negras, brazos cruzados (cuerpo entero, pixel art de juego)
- `empty_box.png`      caja de cartón vacía, tapas abiertas, algo arrugada
- `iron_fist.png`      puño biónico metálico gris apuntando a la derecha con un poco de cable
- `sb_shield.png`      escudo amarillo con borde rojo y las letras "SB" rojas

## Orden de entrega sugerido
1) Sección C (cara y concepto) y D (iconos) -> 2) A: locomoción (idle/walk/run) -> 3) A: ataques y lunge -> 4) A: power1-3, ult, death -> 5) E (objetos)
-> 6) B completo (locomoción, ataques, power1-3, death).
