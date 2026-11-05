# Iconos de los 7 objetos morados nuevos (nivel 3)

Formato IDÉNTICO a los iconos de objetos existentes (mira `public/assets/items/garras_vampiricas.png`, `nucleo_ia.png`, `chaleco_antibalas.png` como referencia de estilo y de "morado = nivel 3"):
- pixel art con contorno negro, un solo objeto centrado ocupando ~75 % del cuadro, fondo MAGENTA PURO #FF00FF plano, sin sombra de suelo ni texto;
- imagen cuadrada de 256x256 por icono, un archivo por objeto: `art/raw/items_new/<id>.png`;
- cada icono debe mostrar un objeto reconocible que combine el aspecto de sus dos materiales (los iconos actuales de los materiales están en `public/assets/items/<material>.png`; hay versiones provisionales ya mezcladas en `art/raw/items_extra/<id>.png` que puedes usar como guía, pero hazlos mejores y coherentes).

| id (nombre del archivo) | Nombre | Materiales (mira sus iconos) | Qué dibujar |
|---|---|---|---|
| exoesqueleto | Exoesqueleto | mancuerna_codigo + anillo_vitalidad | un torso/brazo de exoesqueleto metálico gris con articulaciones y un anillo verde de vitalidad en el pecho |
| moto_electrica | Moto eléctrica | cadena_bici + capa_cifrado | una pequeña moto eléctrica de perfil con ruedas y chispas azules, un candado/cifrado como detalle |
| botiquin_maestro | Botiquín maestro | antidoto + barra_energetica | un botiquín blanco con cruz roja y una barra energética / vial azul asomando, brillo de curación |
| centro_mando | Centro de mando | maletin_soldados + escudo_emergencia | un maletín militar abierto con soldaditos y un escudo azul brillante delante |
| arsenal_artillero | Arsenal artillero | mortero_portatil + bomba_humo | un mortero con un proyectil y una granada de humo gris al lado |
| propulsor_cohete | Propulsor cohete | sprint_energia + teleport_base | un propulsor/cohete pequeño con llama naranja y un destello de teletransporte |
| consola_overclock | Consola de overclock | termo_cafe + memoria_ram | una consola/placa con chips RAM y un termo de café humeante conectado, brillo azul de poder de IA |

Entrega los 7 PNG, verifica que son 256x256 con fondo magenta puro y avísame: yo los proceso con `python tools/process_sprites.py`.

---
## Ronda 2: 3 objetos de cortacuración (mismo formato: 256x256, fondo magenta #FF00FF, `art/raw/items_new/<id>.png`)
Misma línea visual que los iconos anteriores. Idea común: un corazón/herida vendada o con grieta.
- `cuarentena_digital` — Cuarentena digital (poder de IA): pantalla holográfica azul con un corazón rojo agrietado y una cinta de cuarentena (rayas amarillas/negras) cruzada.
- `ransomware` — Ransomware (ataque físico): un candado rojo con un martillo clavado/cruzado y un corazón roto detrás.
- `espinas_firewall` — Espinas de firewall (tanque cybersecurity): escudo de firewall azul/gris cubierto de pinchos metálicos con un corazón rojo vendado en el centro.
