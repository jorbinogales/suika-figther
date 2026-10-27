# Campamentos reclamables: banderas y naves (Codex)

Mismo pixel art de siempre (bordes duros, contorno negro, sin anti-alias, colores vivos). Fondo MAGENTA PURO #FF00FF plano, sin magenta en el dibujo.

## 1) Banderas ondeantes — 3 tiras en `art/raw/flags/`
Cada archivo: tira horizontal de 6 cuadros de 256x256 (1536 x 256 px), TODOS los cuadros con el mismo mástil en el mismo lugar (mástil de metal oscuro vertical, base centrada abajo, pies del mástil a ~92 % de la altura del cuadro, mástil ocupa ~85 % de la altura). La tela ondea hacia la derecha: 6 posiciones distintas del ondeo en bucle (suave, la tela forma ondas), el resto igual.
- `flag_neutral.png` — tela gris claro/blanca sucia, sin emblema
- `flag_blue.png` — tela AZUL militar con una estrella blanca y un chevron (equipo humano/militar)
- `flag_red.png` — tela ROJA oscura con un engranaje/rayo negro (equipo robot)

## 2) Naves gigantes — 2 imágenes en `art/raw/objects/`
Vista casi cenital 3/4 (se ve desde arriba y un poco de frente), nave de transporte ENORME, simétrica, centrada, ocupa ~92 % de la imagen, 768 x 768 px, con las compuertas de carga abiertas en el vientre (tripas oscuras) y motores brillantes.
- `ship_human.png` — nave militar: casco gris acero y verde oliva, camuflaje, torretas, reactores azul cian, faros blancos, marcas de estrella
- `ship_robot.png` — nave robot: casco negro y rojo oscuro, aristas angulosas, rejillas, reactores rojos brillantes, ojo/lente rojo en el frente
