# Habilidades nuevas (Codex) — iconos, sprites de animación y objetos

Mismo estilo pixel art y mismo formato que el resto (ver `art/SPRITE_SPEC.md`, `art/AXEL_SPEC.md`, `art/JORBI_SPEC.md`). Sobrescribe los archivos indicados.
Tiras de animación: PNG horizontal de N celdas iguales de 512x512, fondo MAGENTA PURO #FF00FF plano, personaje mirando a la DERECHA, misma escala en todos los cuadros, pies sobre la misma línea base (~90 % de la altura de la celda), ~74 % de la altura de la celda, contorno negro, bordes duros. Mantén cara, ropa y proporciones EXACTOS de la referencia (`art/ref/<personaje>.png`).

## 1) Axel — E "Regateador hábil" (nuevo: laptop Canaima agujero negro)
- `art/raw/axel/power3.png` — 6 cuadros (tira de 3072x512): Axel planta los pies y LANZA al suelo, con las dos manos, una laptop pequeña estilo Canaima (portátil blanca/azul claro con una manzana-no, sin logos reales); al caer la laptop se abre y emite una chispa morada. Cuadros: preparación, brazo atrás, lanzamiento, soltar, recoger, pose final con una sonrisa traviesa.
- `art/raw/icons/axel_p3.png` — 128x128, fondo magenta: una laptop abierta con la pantalla mostrando un remolino/agujero negro morado que absorbe pequeñas partículas y monedas doradas.

## 2) Jorbi — R "15 Minutos más" (reloj de arena)
- `art/raw/jorbi/ult.png` — 8 cuadros (tira de 4096x512): Jorbi saca un RELOJ DE ARENA dorado grande, lo levanta con las dos manos sobre su cabeza, lo voltea y el reloj brilla (arena cyan/dorada cayendo hacia arriba), pose final con el reloj en alto y energía alrededor. Sin transformación muscular (la habilidad ya no lo transforma).
- `art/raw/icons/jorbi_ult.png` — 128x128, fondo magenta: un reloj de arena dorado con flechas circulares hacia atrás (rewind) en cyan.
- `art/raw/objects/hourglass.png` — 512x512, fondo magenta: un reloj de arena dorado GRANDE y brillante, centrado, vista frontal, arena cyan, ornamentos dorados (se muestra en las pantallas de todos los jugadores como anuncio).

## 3) Leandro — E... en realidad W/F "Lanzamiento de contrato" (proyectil)
- `art/raw/objects/contract.png` — 512x512, fondo magenta: UN contrato enrollado/doblado en pergamino verde ácido (veneno), con sello rojo de cera y gotas verdes goteando, ligeramente inclinado como volando hacia la derecha (el juego lo rota en el aire). Es el proyectil: se lanzan varios en abanico.
- `art/raw/icons/leandro_p2.png` — 128x128 (actualiza el icono): tres contratos verdes en abanico con una nube tóxica verde detrás.
