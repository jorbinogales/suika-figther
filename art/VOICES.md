# Voces de los campeones (ElevenLabs)

Cada campeón tiene **una voz única** de la biblioteca de la cuenta de ElevenLabs del proyecto. Los archivos están en `public/assets/voice/<campeón>/<evento>.mp3` y se generan con `python tools/gen_voices.py`.
Las voces y los diálogos se editan en `tools/voice_lines.py` (todos los diálogos son cortos). Modelo: `eleven_v3`.

> Nota: no se clonan ni se imitan voces de personas reales. Para los personajes basados en personas conocidas (p. ej. Maduro) se usa una voz genérica de la biblioteca con el tono del personaje.

| Campeón | Voz (nombre en ElevenLabs) | voice_id | Estilo |
|---|---|---|---|
| leandro | Leandro | `UlfHrayvmPwBsB6iRxRH` | Voz generada en español latino: tono tecnológico y sarcástico, el "ingeniero de IA". |
| xeviche | carlos | `zSPJ694fdnzmEKl5n9wI` | Voz masculina joven, natural y enérgica en español latino: fresco y bromista como el ceviche. |
| jorbi | Joseph Corona - Clear and Professional | `SIpDYvpsUzCaJ0WmnSA8` | Voz venezolana clara y segura: el programador con acento de casa. |
| axel | Zemus | `GxkcfDcHhI1xatMjkEAC` | Voz juvenil, fresca y un poco melancólica: el "kun" tímido que ayuda. |
| julio | Benji - Warm & Deep Spanish Storyteller | `GLTzATUtINGy37b1y7gn` | Voz cálida y profunda de narrador: el artista de la tinta. |
| luis | Alejandro - Horror y Misterio | `lr39dERdpNg6kPUtWZTO` | Voz grave de misterio: el hacker que aparece desde las sombras. |
| eliud | Murdock - Deep and commanding voice | `OLmSqlYzB06EIKJRy5b0` | Voz profunda y autoritaria: el guerrero de los huevos. |
| hector | Erick - Cinematic Storyteller | `nFcvfxkh4Fldtkn096yh` | Voz cinematográfica y épica: el ciclista cibernético. |
| yonaiker | Santiago - Gravelly and commanding | `VXZKNah1ssrzM8c81OiY` | Voz rasposa de veterano: el soldado de apoyo. |
| junior | RTS Soldado Raso (es-latam) | `gnOUdvJjUt7U06eNRlqE` | Voz joven y entusiasta de soldado raso: golpea primero y pregunta después. |
| maduro | George | `7GCLDRn3tm42Ra1CZCPL` | Voz profesional de español latino, tono de discurso. Es una voz genérica de la biblioteca: NO imita ni clona a la persona real. |
| diosa | Jennifer-Warm Colombian | `Y11rBAl8on4Ba9ZpY3DY` | Voz femenina cálida y segura con acento colombiano: la diva de las cámaras. |

## Diálogos

Eventos: al seleccionar el campeón, al morir, al encontrarse con un campeón enemigo, al atacar (Maduro y Diosa) y hasta 3 frases por cada habilidad (se elige una al azar). Los diálogos llevan etiquetas de expresión de eleven_v3.

### leandro

| Evento | Diálogo |
|---|---|
| Al seleccionar el campeón | [confident] Leandro conectado. Vamos a programar. <br> [excited] Sistema listo. ¡Empecemos! |
| Al morir | [sighs] Error cuatrocientos cuatro. Me perdí. <br> [gasps] ¡Qué mal compilé eso! |
| Al encontrarse con un campeón enemigo | [confident] Objetivo detectado. Ejecutando plan. <br> [whispers] Te encontré. No te muevas. <br> [laughs] Qué sorpresa. ¡Un adversario! |
| Q | [excited] ¡Que florezcan los cactus! <br> [laughs] Cuidado, que pinchan. <br> [confident] Esto compila perfecto. |
| F | [confident] Firma aquí, por favor. <br> [laughs] ¡Lee la letra pequeña! <br> [excited] ¡Contrato aprobado! |
| E | [shouting] ¡Cuatro muros de goma! <br> [confident] Aquí no pasa nadie. <br> [excited] ¡Que rueden las ideas! |
| R | [shouting] ¡Activando mi ejército de bots! <br> [excited] ¡Inteligencia artificial, al ataque! <br> [laughs] ¿Quién dijo que estaba solo? |
| Q (2ª versión) | [excited] ¡A peinar este problema! <br> [laughs] Qué desenredo tan elegante. <br> [confident] El peine nunca falla. |
| F (2ª versión) | [excited] ¡Aire a presión! <br> [laughs] ¡Sécate de una vez! <br> [confident] Un soplo de sabiduría. |
| E (2ª versión) | [shouting] ¡Lluvia de cauchos! <br> [excited] ¡Rebote calculado! <br> [laughs] ¡Mira cómo saltan! |
| R (2ª versión) | [whispers] Te tengo en mi red. <br> [confident] Filtración completada. <br> [laughs] Ya sé dónde estás. |

### xeviche

| Evento | Diálogo |
|---|---|
| Al seleccionar el campeón | [excited] ¡Xeviche, fresco y listo! <br> [laughs] Hoy el menú soy yo. |
| Al morir | [sighs] Me quedé sin limón. <br> [gasps] ¡Ay! Me deshice. |
| Al encontrarse con un campeón enemigo | [laughs] ¿Y tú de dónde saliste? <br> [whispers] Mmm, qué apetitoso. <br> [confident] Aquí vengo yo. |
| Q | [laughs] ¡Cuidado con los bloques! <br> [excited] ¡Pisa un lego y llora! <br> [shouting] ¡Llueven legos! |
| F | [excited] ¡Sirvan la comida! <br> [laughs] Come primero, ataca después. <br> [confident] Está calientita. |
| E | [whispers] Sonríe para mí. <br> [laughs] Mira qué sonrisita. <br> [confident] Ven, acércate. |
| R | [shouting] ¡Bienvenidos todos! <br> [laughs] Hay lugar para muchos. <br> [excited] ¡Que empiece la fiesta! |

### jorbi

| Evento | Diálogo |
|---|---|
| Al seleccionar el campeón | [confident] Jorbi presente. A trabajar. <br> [excited] ¡Hora de producir! |
| Al morir | [sighs] Se acabó el sueldo. <br> [gasps] ¡No! ¡Mis ahorros! |
| Al encontrarse con un campeón enemigo | [confident] Hablemos de negocios. <br> [laughs] Mira quién llegó. <br> [whispers] Te estaba esperando. |
| Q | [laughs] Esto es dinero fácil. <br> [excited] ¡Lluvia de billetes! <br> [confident] Cobro por adelantado. |
| F | [shouting] ¡A toda velocidad! <br> [excited] ¡Muévete, que me alcanzas! <br> [laughs] ¡Aquí voy! |
| E | [shouting] ¡Hora de entrenar! <br> [excited] ¡Más pesas! <br> [angry] ¡Nadie me detiene! |
| R | [confident] Quince minutos más, jefe. <br> [laughs] Solo cinco minutos más. <br> [excited] ¡Tiempo extra! |

### axel

| Evento | Diálogo |
|---|---|
| Al seleccionar el campeón | [excited] Axel-kun, ¡listo para ayudar! <br> [whispers] Haré lo mejor que pueda. |
| Al morir | [sighs] Mi malware falló. <br> [gasps] ¡Lo siento, equipo! |
| Al encontrarse con un campeón enemigo | [whispers] Ojalá seamos amigos. <br> [confident] Nos vemos en el campo. <br> [laughs] ¡Hola! ¿Peleamos? |
| Q | [laughs] Un virus, cortesía de la casa. <br> [excited] ¡Descarga completada! <br> [whispers] No abras ese archivo. |
| F | [confident] Tengo lo que necesitas. <br> [excited] ¡Entrega rápida! <br> [laughs] Todo a buen precio. |
| E | [laughs] Eso vale la mitad. <br> [confident] Te lo dejo a buen precio. <br> [excited] ¡Trato hecho! |
| R | [shouting] ¡No estoy solo! <br> [excited] ¡Vengan, amigos! <br> [confident] Mi equipo me acompaña. |

### julio

| Evento | Diálogo |
|---|---|
| Al seleccionar el campeón | [confident] Julio. Pinto mi victoria. <br> [excited] ¡El lienzo está listo! |
| Al morir | [sighs] La tinta se secó. <br> [gasps] ¡Mi obra quedó inconclusa! |
| Al encontrarse con un campeón enemigo | [whispers] Un lienzo nuevo. <br> [confident] Serás parte de mi arte. <br> [laughs] Qué buen modelo. |
| Q | [confident] Una línea basta. <br> [excited] ¡Un trazo perfecto! <br> [whispers] Arte en un solo movimiento. |
| F | [shouting] ¡Que fluya la tinta! <br> [excited] ¡Ola de color! <br> [laughs] ¡Cuidado con las manchas! |
| E | [laughs] Mancha y obra maestra. <br> [confident] Pisa mi charco. <br> [excited] ¡Qué hermoso desastre! |
| R | [shouting] ¡Lluvia de tinta! <br> [excited] ¡Arte para todos! <br> [confident] Cada gota es única. |

### luis

| Evento | Diálogo |
|---|---|
| Al seleccionar el campeón | [whispers] Luis. Ya estoy dentro. <br> [confident] Conexión establecida. |
| Al morir | [sighs] Conexión perdida. <br> [gasps] ¡Me hackearon! |
| Al encontrarse con un campeón enemigo | [whispers] Te tengo localizado. <br> [confident] Dirección encontrada. <br> [laughs] Qué fácil de rastrear. |
| Q | [confident] Escaneando amenazas. <br> [whispers] Antivirus activo. <br> [excited] ¡Sistema protegido! |
| F | [whispers] Ahora me ves, ahora no. <br> [laughs] No puedes rastrearme. <br> [confident] Modo fantasma. |
| E | [confident] Nada se me escapa. <br> [whispers] Acceso concedido. <br> [excited] ¡Contraseña descifrada! |
| R | [whispers] Ahora eres mi marioneta. <br> [confident] Tomo el control. <br> [laughs] Tu sistema es mío. |

### eliud

| Evento | Diálogo |
|---|---|
| Al seleccionar el campeón | [shouting] ¡Eliud! ¡Que ruede el huevo! <br> [confident] Estoy listo para la batalla. |
| Al morir | [sighs] Me rompí como un huevo. <br> [gasps] ¡Mis huevos! |
| Al encontrarse con un campeón enemigo | [shouting] ¡Cuidado con los huevos! <br> [laughs] Mira quién viene. <br> [confident] Prepárate. |
| Q | [shouting] ¡Huevo granada! <br> [excited] ¡Cuidado, explota! <br> [laughs] ¡Atrápalo! |
| F | [confident] Pisa si te atreves. <br> [laughs] Trampa lista. <br> [whispers] No mires al suelo. |
| E | [shouting] ¡Lanza al frente! <br> [angry] ¡Cuidado, que pica! <br> [excited] ¡Ataque directo! |
| R | [excited] ¿Quién quiere una sorpresa? <br> [laughs] ¡Paquete especial! <br> [shouting] ¡Llegó el regalo! |

### hector

| Evento | Diálogo |
|---|---|
| Al seleccionar el campeón | [confident] Héctor. Sobre dos ruedas. <br> [excited] ¡A pedalear! |
| Al morir | [sighs] Se rompió la cadena. <br> [gasps] ¡Me caí de la bici! |
| Al encontrarse con un campeón enemigo | [confident] Ahí va el ciclista. <br> [excited] ¡Carrera a la vista! <br> [laughs] Alcánzame si puedes. |
| Q | [confident] A llenar el tanque. <br> [excited] ¡Más proteína! <br> [laughs] Fuerza de ciclista. |
| F | [confident] Bien engrasado, siempre. <br> [shouting] ¡Cadenas fuera! <br> [excited] ¡Atrapado! |
| E | [confident] Casco puesto, vamos. <br> [excited] ¡Protección máxima! <br> [laughs] Seguridad primero. |
| R | [shouting] ¡A pedalear sin freno! <br> [excited] ¡Velocidad total! <br> [laughs] ¡No me alcanzan! |

### yonaiker

| Evento | Diálogo |
|---|---|
| Al seleccionar el campeón | [confident] Yonaiker. Cubro tu espalda. <br> [whispers] Listo para el deber. |
| Al morir | [sighs] Retírense. Sin mí. <br> [gasps] ¡Me dieron! |
| Al encontrarse con un campeón enemigo | [whispers] Enemigo a la vista. <br> [confident] Contacto confirmado. <br> [angry] Ahí está el objetivo. |
| Q | [shouting] ¡Fuego a discreción! <br> [angry] ¡Plomo para todos! <br> [excited] ¡Ráfaga continua! |
| F | [confident] No se ve nada, ¿verdad? <br> [whispers] Humo en la zona. <br> [laughs] Perdidos entre la niebla. |
| E | [shouting] ¡Bombardero en camino! <br> [confident] Aviso: llueve fuego. <br> [excited] ¡Apoyo aéreo! |
| R | [whispers] Aquí nadie ve nada. <br> [confident] Cortina total. <br> [laughs] ¿Dónde estás ahora? |

### junior

| Evento | Diálogo |
|---|---|
| Al seleccionar el campeón | [excited] ¡Junior listo! ¡A pelear! <br> [laughs] ¡Vamos a divertirnos! |
| Al morir | [sighs] Ay, eso dolió. <br> [gasps] ¡Me lastimaron! |
| Al encontrarse con un campeón enemigo | [excited] ¡Vamos a los golpes! <br> [laughs] ¡Al fin un rival! <br> [confident] Te voy a ganar. |
| Q | [shouting] ¡Al abordaje! <br> [excited] ¡Te tengo enganchado! <br> [laughs] ¡No escapas! |
| F | [excited] ¡Mira, sin manos! <br> [laughs] ¡Voltereta perfecta! <br> [shouting] ¡Allá voy! |
| E | [shouting] ¡Arde, arde! <br> [laughs] ¡Qué calor! <br> [excited] ¡Lanzallamas listo! |
| R | [shouting] ¡Fuego del cielo! <br> [excited] ¡Bombardeo total! <br> [angry] ¡Todo arde! |

### maduro

| Evento | Diálogo |
|---|---|
| Al seleccionar el campeón | [confident] Maduro en escena. Con permiso. <br> [excited] ¡Aquí estamos, compatriotas! |
| Al morir | [sighs] Esto es una conspiración. <br> [gasps] ¡No puede ser! |
| Al encontrarse con un campeón enemigo | [confident] Compatriota, qué sorpresa. <br> [laughs] Bienvenido al escenario. <br> [whispers] Tengo algo para ti. |
| Al atacar (de vez en cuando) | [confident] Con el pueblo no se juega. <br> [shouting] ¡Toma tu decreto! <br> [laughs] Un solo trazo y a seguir. |
| Q | [confident] Esto lo firmo hoy mismo. <br> [shouting] ¡Decreto aprobado! <br> [excited] ¡Que se escuche mi voz! |
| F | [confident] Mi gente me cuida. <br> [excited] ¡Que me rodeen los míos! <br> [laughs] Estoy bien acompañado. |
| E | [laughs] Ahí les va su cesta. <br> [excited] ¡Ayuda para todos! <br> [confident] Un regalo del pueblo. |
| R | [shouting] ¡Se abre el saco! <br> [excited] ¡Aquí viene el héroe! <br> [laughs] ¡Transformación! |
| Q (Súper Bigote) | [shouting] ¡Siente mi puño! <br> [angry] ¡Puño de hierro! <br> [excited] ¡Directo al suelo! |
| F (Súper Bigote) | [confident] Por aquí nadie pasa. <br> [shouting] ¡Escudo arriba! <br> [angry] ¡Fuera de mi territorio! |
| E (Súper Bigote) | [shouting] ¡Mano de hierro, va! <br> [angry] ¡Toma esto! <br> [excited] ¡Alcance largo! |

### diosa

| Evento | Diálogo |
|---|---|
| Al seleccionar el campeón | [confident] Diosa Canales. Luces, cámara. <br> [laughs] Prepárense para el show. |
| Al morir | [sighs] Se apagaron las luces. <br> [gasps] ¡Mi maquillaje! |
| Al encontrarse con un campeón enemigo | [confident] Mírame bien, querido. <br> [laughs] Qué público tan bonito. <br> [whispers] Hola, preciosura. |
| Al atacar (de vez en cuando) | [whispers] Mírame, mírame. <br> [excited] ¡Click, foto! <br> [laughs] Eso fue por mi portada. |
| Q | [confident] Solo mi mejor ángulo. <br> [laughs] Esta es mi portada. <br> [excited] ¡Una foto, por favor! |
| F | [shouting] ¡Todos al suelo, ya! <br> [laughs] Bailen conmigo. <br> [excited] ¡Que suene la música! |
| E | [confident] Cuidado con el tacón. <br> [laughs] Pisé fuerte, ¿verdad? <br> [excited] ¡Qué puntería! |
| R | [shouting] ¡Luces, cámaras, acción! <br> [excited] ¡El show comienza! <br> [confident] Ahora sí, a brillar. |
