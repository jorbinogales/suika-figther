# Arte conceptual de campeones (selección de campeón) — Codex

Para CADA uno de los 10 campeones crea DOS imágenes a partir de su referencia `art/ref/<id>.png` (cara, ropa, colores y proporciones EXACTOS; no cambies su identidad) y de su kit de habilidades. NO es pixel art de juego: es **arte conceptual ilustrado** (estilo concept art de videojuego MOBA, pintura digital con pincelada visible, iluminación dramática, contornos suaves, colores intensos), con la estética tecnológica/futurista del juego (azul cian y ámbar de acento, circuitos, robots).

## A) Arte vertical completo -> `art/raw/concept/<id>.png`
- Tamaño EXACTO **768 x 1152** (vertical, 2:3). Fondo opaco (NO magenta, NO transparente): un escenario/ambiente difuso con luz y partículas acorde al campeón, que no distraiga.
- Personaje de **cuerpo completo** (de la cabeza a los pies visibles), centrado, pose heroica y con actitud acorde a su personalidad, ocupando ~85 % del alto. La cara bien visible, mirando levemente al frente.
- Debe mostrar su arma/herramienta/objeto característico y un efecto sutil de una de sus habilidades (fuego, tinta, robots, etc.). Sin texto, sin logos, sin marcos, sin marca de agua.
- Deja libre el borde inferior ~8 % (se superpone el nombre).

## B) Icono de cara -> `art/raw/concept/<id>_face.png`
- Tamaño EXACTO **256 x 256**, cuadrado, solo **rostro y cuello/hombros** del personaje (primer plano de la cara, centrada, ocupa ~80 %), mismo estilo e iluminación que el arte vertical, fondo simple del color de ambiente del campeón (opaco). Sin texto ni marcos. Debe leerse bien a 96 px.

## Campeones (id | nombre | clase | habilidades -> usa esto para la pose, el objeto y el ambiente)
| id | nombre | clase | habilidades / personalidad |
|----|--------|-------|-----------------------------|
| leandro | Leandro | Poder de IA (mago tecnológico) | Fiebre de cactus, Lanzamiento de contrato, 4 Cauchos, IA voy — invoca IA, contratos y cactus; aire de mago tecnológico |
| xeviche | Xeviche | Cybersecurity (tanque) | Lanzamiento de lego, Arepa reina pepiada, Setup, Temblor — grande y resistente, defensor; legos, arepas, setup gamer |
| jorbi | Jorbi | Programador | Hay money, Rico caldito, Hora de ponerse mamado, 15 Minutos más — programador luchador, dinero, caldito humeante, energía |
| axel | Axel-kun | Soporte | Malware, Proveedor humilde, Regateador hábil, No estoy solo — comerciante/soporte, virus, aliados, bolsa de mercancías |
| julio | Julio | Programador | Trazo, Ola de tinta, Charco de tinta, El arte de las gotas — artista de la tinta, pinceles y ondas de tinta oscura |
| luis | Luis | Hacker (asesino) | Antivirus, Amenaza, Hacker profesional, Tu programa es mío — hacker sigiloso, capucha, pantallas holográficas, código verde |
| eliud | Eliud | Programador | Huevo granada, Trampa de huevos, Lanza, Paquete sorpresa — granjero/guerrero con huevos explosivos, gallina, lanza |
| hector | Héctor | Cybersecurity (tanque) | Proteína, Cadenas engrasadas, Equipo de protección, Ciclismo profesional — fisicoculturista con equipo de protección, bicicleta y cadenas |
| yonaiker | Yonaiker | Soporte | Robot centinela, Trampa invisible, Robot de curación, Barricada — técnico/ingeniero de campo, pistola-herramienta, robots minigun y de curación a sus pies |
| junior | Junior | Programador (peleador) | Ancla de abordaje, Voltereta, Lanzallamas, Bombardeo — capitán de navío corpulento con gorra de capitán blanca/azul con ancla dorada, lanzallamas a la espalda, misiles cayendo al fondo |

Entrega: 10 PNG verticales + 10 PNG de cara (20 archivos). Verifica tamaños exactos antes de terminar.

---
# V2 — CADA SPLASH ART DEBE SENTIRSE MUY DISTINTO (regenera SOLO los 10 verticales `art/raw/concept/<id>.png`, 768x1152; las caras `_face.png` se quedan)
Problema: los 10 se parecen (mismo encuadre frontal, de pie y centrado, mismo tipo de fondo). Rehazlos variando **pose, ángulo de cámara, escenario, paleta dominante, iluminación y composición**. Prohibido repetir "personaje de pie mirando al frente con fondo borroso". Reglas: encuadres distintos entre sí (contrapicado, picado, 3/4, perfil, plano holandés, de espaldas mirando por encima del hombro, en acción a mitad de salto…), personaje a veces desplazado a un lado con elementos del escenario ocupando el resto, y fondos que cuenten una historia concreta y nítida (no un desenfoque genérico). Mantén cara, ropa y proporciones EXACTAS de la referencia (`art/ref/<id>.png`), cuerpo completo visible, sin texto/marcos, borde inferior libre ~8 %.

| id | pose / situación / escenario | cámara y paleta |
|----|------------------------------|-----------------|
| leandro | mago tecnológico a mitad de un lanzamiento: un brazo extendido lanzando un contrato brillante que se despliega en el aire, cactus de energía brotando del suelo, un pequeño cohete/IA flotando a su lado; escenario: azotea de oficina futurista de noche | picado ligero, paleta violeta y magenta neón |
| xeviche | tanque imponente, plantado con las piernas abiertas y los brazos cruzados o sosteniendo un escudo enorme de piezas lego; setup gamer con monitores al fondo y una arepa gigante flotando como emblema; humo de impactos que rebotan en él | contrapicado heroico (se le ve gigantesco), paleta cian y gris metálico |
| jorbi | programador corriendo/derrapando hacia la cámara con un puñetazo de energía cargado, billetes y monedas volando, un caldito humeante en la otra mano, líneas de velocidad | plano muy cercano y dinámico en perspectiva forzada, paleta verde dinero y dorado |
| axel | comerciante sentado/apoyado con soltura sobre un montón de cajas y mercancía, regateando, con un pequeño virus (bicho digital) en la palma de una mano y aliados difusos detrás; mercado nocturno futurista con farolas | plano 3/4 bajo y de lado, paleta naranja cálido y teal |
| julio | artista de la tinta pintando en el aire: pincel gigante dibujando una ola de tinta oscura que rodea el cuerpo, salpicaduras congeladas en el aire, gotas con reflejos; fondo de lienzo/papel con trazos | composición diagonal, personaje en movimiento de barrido, paleta blanco, negro y toques índigo/azul eléctrico (casi monocromo) |
| luis | hacker de espaldas/3/4 trasero mirando por encima del hombro hacia una pared de pantallas holográficas y código cayendo, capucha, un dron-antivirus junto a él; cuarto oscuro con luz de pantallas | plano holandés ligero, casi siluetado, paleta negro y verde matriz |
| eliud | guerrero de granja en pleno salto lanzando un huevo granada con la mano mientras sostiene una lanza, una gallina furiosa saltando a su lado, explosión de plumas y fuego al fondo; campo/granero al atardecer | de perfil en el aire, ángulo bajo, paleta ámbar, rojo y amarillo |
| hector | fisicoculturista de perfil en una pose de fuerza (haciendo flexión de bíceps o tirando de las cadenas engrasadas con ambas manos) con equipo de protección, su bici de fuego aparcando detrás con llamas; gimnasio/taller industrial con vapor | contrapicado + luz de contraluz naranja, paleta naranja fuego y negro industrial |
| yonaiker | técnico agachado/arrodillado en el suelo reparando o desplegando un pequeño robot centinela, otros robots (minigun y de curación) a su alrededor, herramientas, luces de señal cian; taller/zona de trinchera tecnológica | picado desde arriba-3/4, paleta blanco, azul claro y cian brillante |
| junior | capitán de navío en la proa de un barco de guerra futurista bajo tormenta, una mano señalando al cielo (ordenando el bombardeo) y la otra en la radio, misiles cayendo, olas golpeando, capa de lluvia | contrapicado desde cubierta, paleta azul marino, gris tormenta y destellos naranja |

Entrega: sobrescribe los 10 `art/raw/concept/<id>.png` verificando 768x1152. Avísame al terminar.

---
# V3 — NUEVOS ICONOS DE CARA (regenera los 10 `art/raw/concept/<id>_face.png`, 256x256)
Rehazlos a partir del NUEVO splash art de cada campeón (`art/raw/concept/<id>.png`, ya actualizado): primer plano de la cara (cabeza y algo de cuello/hombros, ocupa ~80 %), con la misma expresión, ángulo de cabeza, iluminación, paleta de colores y accesorios (gorra, capucha, casco, gafas, etc.) que su splash, y un fondo del color/ambiente de ese mismo splash. Cada uno debe verse claramente distinto de los demás y reconocible a 96 px. Cara, pelo y rasgos EXACTOS de la referencia `art/ref/<id>.png`. Sin texto ni marcos. Verifica 256x256.
