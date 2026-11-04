# Combo de ataques básicos — animaciones por golpe (5 direcciones)

El ataque básico ahora es un **combo de 3 golpes** (clic + clic + clic). Cada golpe tiene su propia animación:

| golpe | animación | nº de cuadros | momento del impacto / disparo |
|-------|-----------|---------------|-------------------------------|
| 1 | `attack`  | 6 | cuadro 3 (a mitad de la animación) |
| 2 | `attack2` | 6 | cuadro 3; ligeramente más rápido y seco que el 1 |
| 3 | `attack3` (remate) | 8 | cuadro 5; más lento, con anticipación larga y movimiento de todo el cuerpo (paso adelante), es el golpe fuerte |

Formato idéntico al resto (`art/SPRITES_8DIR_SPEC.md`): `art/raw/<personaje>/<anim>_<dir>.png`, dir ∈ s, se, e, ne, n; celdas 512x512; fondo magenta #FF00FF; mismos pies/escala; las
5 direcciones comparten fase en cada cuadro (el cuadro de impacto es el mismo en todas). NO dibujes los efectos del proyectil (salvo lo que ya lleva la tira `attack` actual); el motor dispara el proyectil.

**Cada combo respeta el estilo del campeón: los de distancia hacen gestos de distancia (lanzar, disparar, conjurar), los de cuerpo a cuerpo golpean.**
Nota: durante el golpe el personaje puede dar un pequeño impulso hacia delante; en el remate el cuerpo avanza un poco. No hace falta animar un deslizamiento: pinta solo el gesto.

## Gestos por campeón
**Distancia (proyectil)**
- **Xeviche** — `attack`: la actual (palma abierta, lanza un lego). `attack2`: dos chasquidos rápidos con la otra mano, lanza dos legos pequeños seguidos. `attack3`: empuja con las dos manos hacia delante lanzando un bloque grande de lego.
- **Leandro** — `attack`: gesto de conjuro con una mano, lanza el misil. `attack2`: dos conjuros rápidos (mano derecha e izquierda). `attack3`: junta las dos manos, carga un instante y lanza un misil grande.
- **Axel** — `attack`: lanza la laptop como frisbee. `attack2`: lanza una segunda laptop rápido con el otro brazo (doble lanzamiento). `attack3`: lanzamiento por encima del hombro, fuerte, con paso adelante.
- **Julio** — `attack`: dibujo lento con el stylus y lo lanza (la actual). `attack2`: garabato rápido (la animación `attack2` actual). `attack3`: trazo amplio de arriba abajo que lanza una gran mancha de tinta.
- **Eliud** — `attack`: lanza un huevo. `attack2`: lanza dos huevos rápidos, uno tras otro. `attack3`: lanza un huevo gigante con las dos manos, desde abajo.
- **Yonaiker** — `attack`: un disparo. `attack2`: dos disparos seguidos (doble toque). `attack3`: ráfaga de tres disparos con el arma hacia delante.

**Cuerpo a cuerpo**
- **Jorbi** — `attack`: directo con el puño derecho. `attack2`: cruzado con el izquierdo. `attack3`: golpe fuerte (crítico), con la anticipación larga y paso adelante.
- **Luis** — `attack`: golpe rápido. `attack2`: gancho. `attack3`: remate con codo o palma.
- **Héctor** — `attack`: directo. `attack2`: cruzado. `attack3`: patada alta (es ciclista, patada con pierna fuerte).
- **Junior** — `attack`: directo. `attack2`: cruzado. `attack3`: puñetazo grande de remate (el `attack3` actual como base).

## Orden de trabajo
1. **Xeviche**: `attack2` y `attack3` en las 5 direcciones (10 tiras). Hoja de contacto en `art/review_8dir/xeviche_attack2.png` y `xeviche_attack3.png`.
2. Después, para cada campeón (en el orden de la cola, tras completar su locomoción): `attack`, `attack2`, `attack3` en 5 direcciones (15 tiras por campeón; si ya existe alguna, solo las que falten).


# ⚠ REEMPLAZA TODO LO ANTERIOR DE ESTE ARCHIVO — DISEÑO DEFINITIVO DEL COMBO: UNA CADENA CONTINUA DE POSES

El combo son 3 clics y cada golpe es la CONTINUACIÓN del anterior. **El personaje NUNCA vuelve al reposo (idle) entre un golpe y el siguiente**:
- `attack` (golpe 1): empieza desde la postura de reposo, lanza, y su ÚLTIMO cuadro es una POSE DE COMBATE A (el personaje se queda ahí, esperando el siguiente clic, p. ej. con la mano alzada).
- `attack2` (golpe 2): su PRIMER cuadro es IDÉNTICO al último de `attack` (pose A). Lanza con un gesto distinto y su último cuadro es la pose de combate B.
- `attack3` (golpe 3, remate): su PRIMER cuadro es IDÉNTICO al último de `attack2` (pose B). Es el golpe más fuerte y termina en la pose C (puede relajarse algo hacia el reposo; después el juego vuelve a idle).
El motor mantiene congelado el último cuadro de cada golpe mientras el jugador no hace clic (ventana de ~0,6 s) y SOBRESCRIBE el primer cuadro de `attack2`/`attack3` con el último del anterior para que la unión sea perfecta,
así que dibuja la cadena pensando que el final de un golpe es literalmente el inicio del siguiente (misma pose, mismo ángulo, mismos pies).

Nº de cuadros: attack 6, attack2 6, attack3 8. Instante de lanzamiento (el motor dispara el proyectil ahí): cuadro 3 en attack y attack2; cuadro 5 en attack3.
**NO dibujes el proyectil en vuelo** (lo pone el motor). Sí puedes dibujar el objeto en la mano ANTES de soltarlo y la mano vacía DESPUÉS.
Misma regla para las 5 direcciones (s, se, e, ne, n) con la misma fase por cuadro. Truco recomendado: genera los 3 golpes de una dirección como una sola secuencia continua (por ejemplo una cuadrícula de 3 filas: fila 1 = attack, fila 2 = attack2, fila 3 = attack3)
para que la pose final de una fila sea la inicial de la siguiente, y luego recórtalas en tiras.

## XEVICHE — su proyectil es UN LEGO por clic (no volea ni bloque gigante)
- `attack`: desde reposo, levanta la mano derecha con un lego rojo en la palma, lo lanza hacia delante (palma abierta) en el cuadro 3 y se queda en la pose A: postura de combate, mano derecha alzada con la palma abierta delante, pies separados, torso ligeramente girado.
- `attack2`: parte de la pose A. Cambia de mano / gesto: lanza otro lego (azul) con la mano izquierda con un movimiento de revés lateral (cuadro 3). Termina en la pose B: mano izquierda alzada delante, la derecha baja y atrás, peso en el otro pie.
- `attack3`: parte de la pose B. Anticipación más larga (se echa un paso atrás y junta las dos manos con un lego amarillo grande), lo empuja con las dos manos hacia delante dando un paso adelante (cuadro 5) y termina en la pose C: ambos brazos extendidos al frente, cuerpo avanzado.

## OTROS CAMPEONES (misma idea, cada uno con SU mecánica; no tienen que ser iguales)
Cada uno define su combo con su estilo (distancia = gestos de lanzar/disparar/conjurar con su proyectil propio; cuerpo a cuerpo = golpes encadenados) y su propia pose de combate entre golpes. Se pedirán en la Tanda C con este mismo formato de cadena. Ejemplos:
- Leandro (prompt mágico): escribe/proyecta un prompt con la mano; la pose entre golpes mantiene la mano que conjura alzada.
- Cuerpo a cuerpo (Jorbi, Luis, Héctor, Junior): guardia de combate entre golpes (puños arriba), jab → cruzado → remate sin volver al reposo.


# ATAQUE CON IMPULSO (`lunge`) — animación propia, NO forma parte del combo
Si el jugador ataca mientras avanza hacia donde apunta, el campeón hace UN SOLO ataque especial: se impulsa hacia delante (70–110 px) y ataca durante el impulso. No es un golpe del combo y no continúa ninguna cadena:
empieza desde una pose de carrera/reposo y termina volviendo a una pose de pie lista (después el juego pasa a reposo).
Archivos: `art/raw/<personaje>/lunge_<dir>.png`, dir ∈ s, se, e, ne, n. **6 cuadros** (3072x512), mismo formato, mismos pies/escala, misma fase por cuadro en las 5 direcciones.
Cuadro de lanzamiento/impacto: **cuadro 4** (el motor dispara el proyectil o el golpe ahí). Cuadros 2-4: el cuerpo se desplaza hacia delante (inclinación, paso largo o pequeño salto/deslizamiento); NO pintes estelas ni polvo ni el proyectil en vuelo.
**Gesto por campeón** (cada uno con su estilo; los de distancia, de distancia):
- **Xeviche** — se impulsa hacia delante con un paso/salto corto lanzando un lego con una mano (el brazo contrario atrás para equilibrio).
- **Leandro** — se lanza hacia delante mientras conjura su prompt con una mano adelantada.
- **Axel** — se desliza hacia delante y lanza la laptop como frisbee en pleno impulso.
- **Julio** — se lanza hacia delante trazando un trazo amplio con el stylus y soltándolo.
- **Eliud** — avanza corriendo y arroja un huevo con un brazo.
- **Yonaiker** — se desliza hacia delante disparando con el arma al frente.
- **Jorbi** — se lanza con un puñetazo recto largo (estocada de puño).
- **Luis** — arremete con un golpe de palma/codo rápido hacia delante.
- **Héctor** — patada deslizante o patada voladora corta hacia delante.
- **Junior** — embestida con el hombro y puñetazo.
Prioridad: Xeviche `lunge` (5 tiras) justo después de su cadena de combo; luego cada campeón junto a su Tanda C.
