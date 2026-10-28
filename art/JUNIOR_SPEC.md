# Junior (nuevo campeón, "Peleador", cuerpo a cuerpo; capitán de un navío que da órdenes) — arte (Codex)

Referencia: `art/ref/junior.png` (hombre corpulento con barriga, gafas, barba corta, pelo negro, camisa azul abotonada, jeans azules, mochila negra, tenis negros). Mantén cara, ropa, colores y proporciones EXACTOS, pero añade un detalle de capitán: una GORRA DE CAPITÁN NAVAL blanca y azul marino con ancla dorada (sin cambiar lo demás). Mismo formato que los demás campeones (`art/SPRITE_SPEC.md`, encuadre como `art/raw/jorbi/walk.png`): un PNG por animación, tira horizontal de N celdas cuadradas de 512x512, fondo MAGENTA PURO #FF00FF plano, mira a la DERECHA, misma escala en todos los cuadros, pies en la misma línea (~90 %), ~74 % de la altura, contorno negro, bordes duros.

## A) art/raw/junior/<anim>.png
| anim    | cuadros | descripción |
|---------|---------|-------------|
| idle    | 4 | respiración fuerte, puños levantados en guardia, ceño de capitán |
| walk    | 6 | caminata pesada y segura |
| run     | 6 | carrera más rápida inclinado hacia delante |
| attack  | 5 | ataque básico: PUÑETAZO recto (preparar, golpe con el brazo extendido, recuperar) |
| attack3 | 6 | 4º golpe (el más fuerte): puñetazo con giro de cadera, aura blanca de impacto en el último cuadro |
| power1  | 6 | "Ancla de abordaje": gira una ancla de hierro atada a una cadena sobre la cabeza y la lanza hacia delante con las dos manos (dibuja solo la parte de cadena cerca de sus manos) |
| power2  | 5 | "Voltereta": voltereta hacia delante (rodando en el aire, cuerpo encogido) y caída en cuclillas con un escudo azul brillante tenue al final |
| power3  | 6 | "Lanzallamas": se echa al hombro y sostiene con las dos manos un lanzallamas (tanque en la espalda, boquilla delante) ya apuntando; llama pequeña en la boquilla; bucle apto para caminar apuntando |
| ult     | 8 | "Bombardeo": se lleva una radio a la boca con una mano y con la otra señala al cielo ordenando, última pose con el brazo en alto, destellos de señal roja |
| death   | 6 | cae de espaldas y queda tendido, último cuadro = pose final (la gorra cerca) |

## B) Iconos 128x128 (fondo magenta, uno centrado, estilo de art/raw/icons/*.png) -> art/raw/icons/
- junior_p1.png  un ancla de hierro con cadena arrastrando una silueta
- junior_p2.png  una persona en voltereta con un escudo azul
- junior_p3.png  un lanzallamas con una gran llama naranja
- junior_ult.png tres misiles cayendo con trazos de fuego y una mira roja

## C) Objetos -> art/raw/objects/ (512x512, fondo magenta, UN sujeto centrado ~60 %, pixel art)
- anchor_chain.png  ancla de hierro grande atada a un tramo corto de cadena, apuntando a la DERECHA
- missile.png       misil militar cayendo en VERTICAL con la punta hacia ABAJO (vista casi lateral), aletas, estela de fuego arriba
- ground_crack.png  grieta/rotura de suelo vista desde arriba (estrella de grietas oscuras con piedras sueltas y polvo) centrada, sobre fondo magenta
- fist_progress.png 2048x512: 4 cuadros de 512x512 con un icono de PUÑO en pixel art: 1) solo el contorno del puño a trazos (0 %) con 1/3 relleno rojo desde abajo, 2) 2/3 relleno, 3) casi lleno y brillante, 4) puño completamente relleno, rojo-naranja, con destello de aviso (listo para aturdir)

## D) Tiras de efecto (celdas 256x256, fondo magenta) -> art/raw/statics/
- flame_jet.png  1536x256 (6 cuadros, bucle): chorro de fuego horizontal que sale desde el borde IZQUIERDO hacia la DERECHA (cono de llama naranja-amarillo con núcleo blanco, chispas), cada cuadro con forma distinta
