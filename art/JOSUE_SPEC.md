# Josué + su perro (nuevo campeón, clase "Tirador") — spec de arte (Codex)

## Referencias (fotos reales en `art/ref/josue_photos/1.jpg … 5.jpg`)
- **Josué**: joven latino, piel morena clara/trigueña, pelo NEGRO rizado/ondulado algo largo arriba y más corto a los lados, cara redonda con sonrisa amplia y cálida, cejas pobladas, pulsera negra de cuentas en la muñeca, anillo plateado.
  Ropa del juego: **camiseta gris oscuro/carbón** holgada, **jeans azul claro** anchos, **zapatillas marrón chocolate con suela blanca** (tipo Vans). Lleva un **arco recurvo de madera** y un **carcaj de flechas** a la espalda (elemento nuevo de su kit; madera clara, cuerda blanca, plumas de flecha rojas).
- **El perro**: **Rottweiler** adulto grande y musculoso, pelaje NEGRO brillante con las marcas fuego/marrón típicas (hocico, cejas, pecho, patas), lengua rosada afuera, expresión alegre, collar negro. En el juego lleva además un **pañuelo/bandana rojo** al cuello (para leerlo como "del equipo de Josué").

Primero crea `art/ref/josue.png` y `art/ref/josue_dog.png` (hoja de referencia pixel-art, frente + perfil, fondo magenta) igual que las otras `art/ref/<id>.png`, y respeta esos diseños EXACTOS en todo lo demás.

## Formato (IGUAL que los demás campeones)
Lee `art/SPRITE_SPEC.md`, `art/SPRITES_8DIR_SPEC.md` y `art/QUEUE_8DIR.md` y mira `art/raw/eliud/walk_e.png` antes de empezar.
- `art/raw/<id>/<anim>_<dir>.png`, dir ∈ s, se, e, ne, n (las izquierdas las espeja el motor). Tiras horizontales de celdas 512x512, fondo MAGENTA PURO #FF00FF plano, pixel art, contorno negro, pies en la misma línea (~89 % de la altura).
- Las 5 direcciones de cada animación con el mismo nº de cuadros y la misma fase en cada cuadro. Ciclos en bucle perfecto.
- Además deja la tira de perfil sin sufijo `art/raw/<id>/<anim>.png` (= copia de `_e`) y `death.png` (6 cuadros, solo perfil).
- Nº de cuadros: idle 6, walk 8, run 8, attack 6, power1 8, power2 8, power3 8, ult 10, death 6.
- Efectos (flechas volando, trampas, estelas) NO se pintan en el sprite: van como objetos aparte (sección D).
- Hoja de contacto por animación en `art/review_8dir/<id>_<anim>.png` (5 filas = 5 direcciones).

## A) Josué (a pie, con arco) -> `art/raw/josue/`  (Josué ~74 % del alto de la celda, misma escala que Eliud)
| anim | descripción |
|------|-------------|
| idle | respira, arco en la mano izquierda apuntando al suelo, sonrisa |
| walk | ciclo de paso, arco en la mano |
| run | carrera inclinado hacia delante |
| attack | ataque básico: saca una flecha del carcaj, tensa y DISPARA (cuadro 4 = suelta la cuerda), recupera |
| power1 | "Trampa": se agacha y coloca en el suelo una pequeña trampa de cepo (cuadros 4-6 la mano toca el suelo) y se levanta |
| power2 | "Desplazamiento": salto/voltereta lateral hacia atrás mientras dispara flechas en abanico (cuerpo en el aire cuadros 3-6) |
| power3 | "Flecha cargada": tensa el arco al MÁXIMO, cuerpo echado atrás, cuerda temblando (cuadros 1-6 = carga en bucle), cuadro 7 suelta, 8 recupera |
| ult | "Fiel compañero": silba con dos dedos en la boca y señala hacia delante con el brazo (orden al perro), pose orgullosa |
| death | cae de rodillas y queda tendido, el arco al lado |

## B) El perro (Rottweiler) -> `art/raw/josue_dog/`  (perro en cuatro patas, ~45 % del alto de la celda y ~60 % del ancho; misma escala de píxel que Josué, pies en la misma línea)
| anim | descripción |
|------|-------------|
| idle | sentado/de pie jadeando, lengua fuera, mueve la cola |
| walk | trote |
| run | galope a toda velocidad, orejas hacia atrás |
| attack | ataque básico: mordisco cuerpo a cuerpo (embiste y cierra las fauces en el cuadro 3) |
| power1 | "Mordida": GRAN SALTO hacia delante (cuerpo en el aire cuadros 2-5, fauces abiertas), aterriza mordiendo (cuadro 6) |
| power2 | "Cacería": se agazapa en posición de acecho, cuerpo bajo, sigiloso (bucle de acecho); el motor lo hace semitransparente |
| power3 | "Sed de sangre": gruñe enseñando los dientes, pelo erizado, ojos rojos brillantes |
| ult | "Fiel compañero": ladra hacia arriba orgulloso y mueve la cola (cambio de control) |
| death | se tumba de lado, último cuadro = pose final |

## C) Iconos 128x128 (fondo magenta, pixel art, como `art/raw/icons/*.png`) -> `art/raw/icons/`
- josue_ult.png  la cara de Josué y la cabeza del Rottweiler juntas (Fiel compañero)
- josue_p1.png   trampa de cepo metálica abierta en el suelo
- josue_p2.png   arquero en voltereta con 3 flechas en abanico
- josue_p3.png   arco tensado al máximo con una flecha brillante cargada
- josue_dog_p1.png  fauces de Rottweiler saltando con colmillos
- josue_dog_p2.png  ojos de perro brillando entre arbustos en la sombra (sigilo)
- josue_dog_p3.png  gota de sangre con un colmillo

## D) Objetos -> `art/raw/objects/` (512x512, magenta, UN sujeto centrado ~60 %, pixel art 3/4)
- arrow.png          flecha horizontal apuntando a la DERECHA, plumas rojas (proyectil del básico y de la F)
- arrow_charged.png  flecha más grande con una estela/brillo ámbar (flecha cargada de la E)
- bear_trap.png      trampa de cepo abierta colocada en el suelo
- bear_trap_shut.png la misma trampa cerrada (al atrapar)

## E) Splash art + cara -> `art/raw/concept/josue.png` (768x1152) y `art/raw/concept/josue_face.png` (256x256)
Mismas reglas que `art/CONCEPT_SPEC.md` (ilustración digital tipo concept art MOBA, NO pixel art, fondo opaco, sin texto, borde inferior libre ~8 %).
Composición: Josué de cuerpo completo arrodillado en una rama/roca, tensando el arco con una flecha cargada que brilla ámbar, ligero contrapicado; su Rottweiler (bandana roja) a su lado en posición de ataque, gruñendo y a punto de saltar. Escenario: bosque al atardecer con niebla y luz cálida entre los árboles, una trampa de cepo en primer plano medio cubierta de hojas. Paleta: verdes profundos, naranja atardecer, toques rojos de la bandana y las plumas. Cara de Josué EXACTA a las fotos (sonrisa segura, pelo rizado negro).
La cara (`_face`): primer plano de Josué sonriendo con la cabeza del perro asomando junto a su hombro.

## Entrega
Verifica tamaños exactos (ancho = cuadros × 512, alto 512; concept 768x1152 y 256x256; iconos 128x128) y fondo magenta puro. Al terminar lista todos los archivos creados.
