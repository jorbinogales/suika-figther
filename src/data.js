// Champion definitions. Rank arrays are indexed by (rank-1); rank 0 = not learned.
// Level N (1..12) grants N skill points; 4 abilities x 3 ranks = 12 points max.

export const CLASSES = {
  ai:       { label: 'Poder de IA',    desc: 'Mago tecnologico: poca vida/defensa, dano magico' },
  hacker:   { label: 'Hacker',         desc: 'Asesino: dano fisico, caza usuarios de IA' },
  cyber:    { label: 'Cybersecurity',  desc: 'Tanque: gran defensa y aguante' },
  soporte: { label: 'Soporte', desc: 'Curación, apoyo y control a distancia' },
  programador: { label: 'Programador', desc: 'Luchador balanceado: golpes, movilidad y fuerza' },
  devops:   { label: 'Soporte',        desc: 'Soporte: curacion, reparacion y preparacion' },
};

// champion-select filter tabs (icons: art/raw/classes -> public/assets/classes/<id>.png)
export const CLASS_TABS = ['todos', 'ai', 'hacker', 'cyber', 'soporte', 'programador'];
export const classLabel = id => (id === 'todos' ? 'Todos' : CLASSES[id]?.label || id);

export const ABILITY_KEYS = ['p1', 'p2', 'p3', 'ult'];
export const MAX_LEVEL = 12;
export const MAX_RANK = 3;
export const ULT_LEVELS = [4, 8, 12];   // the ultimate can only be learned/upgraded at these levels

export const CHAMPIONS = {
  leandro: {
    name: 'Leandro', cls: 'ai', ref: 'ref_leandro', height: 118,
    stats: { hp: 420, mana: 320, atk: 12, ap: 60, armor: 10, mr: 10, speed: 150, run: 250, range: 420, atkCd: 0.75 },
    grow: { hp: 0.06, atk: 0.04, ap: 0.08 },
    basic: { kind: 'projectile', dmg: 0, apScale: 0.55, base: 14, type: 'magic', speed: 560, vfx: 'magic_missile',
             every3: { mult: 2.4, scale: 1.8 }, windup: 0.22, dur: 0.45 },
    abilities: {
      p1: { name: 'Fiebre de cactus', icon: 'leandro_p1', preview: 'cactus', short: 'Cactus en una zona: daño de IA y aturden.', cd: [10, 9, 8], mana: [40, 45, 50], windup: 0.35, dur: 0.6,
            desc: 'Cactus aparecen en una zona a tu elección (dentro de su alcance), causan daño de IA (escala fuerte con tu poder IA) y stunean a los enemigos. La zona crece con cada nivel.',
            stun: [0.8, 1.0, 1.2], radius: [90, 110, 130], range: 360, dmg: [30, 50, 70], apScale: 0.7 },
      p2: { name: 'Lanzamiento de contrato', icon: 'leandro_p2', preview: 'contract', short: 'Contratos en abanico: infectan el área y envenenan.', cd: [8, 7, 6], mana: [35, 40, 45], windup: 0.35, dur: 0.6,
            desc: 'Lanza varios contratos hacia el frente en abanico: se van alejando y separando más. Al impactar a un enemigo infectan el área a su alrededor (zona verde) y envenenan a todos los que estén dentro. El veneno causa la mitad del daño del impacto. El daño escala con tu poder de IA. El alcance crece con el nivel.',
            speed: 480, reach: [320, 440, 560], count: [3, 4, 5], spread: 0.75, areaRadius: [95, 110, 125], areaLife: [3, 3.5, 4], poisonRatio: 0.5, dmg: [20, 35, 50], apScale: 0.6 },
      p3: { name: '4 Cauchos', icon: 'leandro_p3', preview: 'tire', short: 'Muro de 4 cauchos con vida que bloquea proyectiles; más nivel, más grandes y resistentes.', cd: [14, 13, 12], mana: [50, 50, 50], windup: 0.3, dur: 0.55,
            desc: 'Muro de 4 cauchos al frente: bloquea cualquier proyectil. Los cauchos tienen vida (los proyectiles enemigos los dañan) y desaparecen cuando se les acaba. Más nivel: cauchos más grandes y con mucha más vida.',
            life: [4, 5, 6], offset: 110, size: [0.55, 0.78, 1], hp: [80, 220, 560] },
      ult: { name: 'IA voy', icon: 'leandro_ult', preview: 'bot_melee', short: 'Invoca bots que pelean a tu lado.', cd: [70, 60, 50], mana: [100, 100, 100], windup: 0.6, dur: 1.0,
             desc: 'Invoca bots (2 melee + 2 distancia) que pelean a su lado. Mejorar agrega mas bots. Los bots se hacen más fuertes con tu poder de IA: cuanto más tengas, más vida y más daño tienen.',
             life: 14, melee: [2, 3, 4], ranged: [2, 3, 4], botApScale: 0.45, botHpScale: 1.2 },
    },
    // second branch: when the ability is first learned the player picks this one OR the one in `abilities` (see Fighter.setBranch / the HUD choice window)
    alt: {
      p1: { name: 'Poder del peine', icon: 'leandro_p1b', preview: 'comb', anim: 'power1b', short: 'Peine en mano: ataques directos; nv 2 lanza ondas, nv 3 ondas rojas con más daño.', v: 'comb', cd: [14, 13, 12], mana: [35, 40, 45], windup: 0.25, dur: 0.4,
            desc: 'Leandro se equipa un peine gigante sobre la mano y pasa a pelear CUERPO A CUERPO durante unos segundos, con daño de IA (escala con tu poder de IA). Nivel 1: solo ataques básicos directos. Nivel 2: cada golpe lanza además una onda de corto alcance. Nivel 3: las ondas son ROJAS y hacen más daño. El espacio que abarca crece con cada nivel.',
            time: [7, 8, 9], reach: [110, 145, 175], atkCd: 0.55, dmg: [24, 36, 48], apScale: 0.5 },
      p2: { name: 'Poder de la secadora', icon: 'leandro_p2b', preview: 'hair_dryer', anim: 'power2b_pull', short: 'Secadora en línea recta: jala o repele (Mayús). Más nivel, más alcance.', v: 'dryer', cd: [12, 11, 10], mana: [40, 45, 50], windup: 0.2, dur: 0.45,
            desc: 'Apunta la línea de la secadora y confirma con clic (o pulsando F otra vez). Por defecto JALA a los enemigos de la línea hacia ti; mantén Mayús mientras apuntas para REPELERLOS lejos (las flechas y el color de la zona cambian). Causa daño de IA y los afectados no pueden escapar mientras son arrastrados. Alcance corto al inicio que crece con cada nivel.',
            length: [260, 420, 580], width: 130, hold: 0.45, speed: 1100, dmg: [35, 55, 75], apScale: 0.6 },
      p3: { name: 'Lanzamiento de cauchos', icon: 'leandro_p3b', preview: 'tire', anim: 'power3b', short: 'Lanza 4 cauchos lejos que botan 3 veces; al mejorar rompen el suelo y dejan fuego.', v: 'throw', wide: true, cd: [16, 15, 14], mana: [60, 65, 70], windup: 0.35, dur: 0.6,
            desc: 'La cámara se aleja mucho para mostrar el mapa. Arrojas 4 cauchos hacia donde apuntas (muy lejos): cada uno bota 3 veces SIEMPRE hacia delante y causa daño de IA donde cae. Nivel 1: cauchos normales. Nivel 2: al rebotar rompen el suelo y aturden un instante a quien cae debajo. Nivel 3: cauchos en llamas que además rompen la tierra y dejan fuego.',
            range: 1500, count: 4, spacing: 52, bounces: 2, speed: 760, radius: 85, stun: 0.6, fire: 3, dmg: [28, 42, 56], apScale: 0.45 },
      ult: { name: 'Filtraciones', icon: 'leandro_ultb', preview: 'virtual_cage', anim: 'ultb', short: 'Revela a los enemigos; luego te teletransportas junto a uno y lo encierras en una arena virtual.', v: 'leak', wide: true, cd: [80, 70, 60], mana: [100, 100, 100], windup: 0.5, dur: 0.8,
             desc: '1ª activación: filtras la ubicación de todos los campeones enemigos durante unos segundos (solo ves una pequeña parte de su entorno). 2ª activación: eliges a un enemigo y te teletransportas junto a él desde cualquier parte del mapa, creando un ESCENARIO VIRTUAL amplio: solo vosotros dos os quedáis dentro, nadie de fuera puede entrar y el resto del mapa se ve totalmente oscuro para quien está dentro; los de fuera no ven el terreno de la arena. Al terminar, Leandro vuelve a donde estaba antes de activarla y el enemigo también (si murió dentro, su cuerpo aparece en su posición original).',
             reveal: [4, 5, 6], sight: 230, recast: 8, radius: 480, cage: [5, 6, 7] },
    },
  },
  xeviche: {
    name: 'Xeviche', cls: 'ai', ref: 'ref_xeviche', height: 128,
    stats: { hp: 620, mana: 340, atk: 18, ap: 55, armor: 20, mr: 22, speed: 140, run: 235, range: 400, atkCd: 0.8 },
    grow: { hp: 0.07, atk: 0.03, ap: 0.08 },
    basic: { kind: 'projectile', apScale: 0.5, base: 12, type: 'magic', speed: 620, obj: 'lego_1', scale: 0.11,   // every click throws a lego (a different colour each hit of the combo)
             windup: 0.2, dur: 0.45 },
    abilities: {
      p1: { name: 'Lluvia de lego', icon: 'xeviche_p1', cd: [8, 7, 6], mana: [40, 45, 50], windup: 0.2, dur: 0.75,
            desc: 'Lanza rápidamente una ráfaga de piezas de lego hacia donde apuntas. Cada pieza que impacta causa daño de IA. Cuanto más alto el nivel de la habilidad, más piezas lanza y más daño causa. Escala con tu poder de IA.',
            pieces: [5, 7, 9], gap: 0.07, speed: 720, dmg: [14, 19, 24], apScale: 0.28 },
      p2: { name: 'Arepa reina pepiada', icon: 'xeviche_p2', passive: true,
            desc: 'Pasiva: un escudo lo vuelve inalcanzable ante cualquier habilidad o ataque. En cuanto recibe un ataque básico o una habilidad, el escudo desaparece (y el golpe no le hace nada) hasta que vuelve a recargarse. Mejorarla reduce el tiempo de recarga.',
            cd: [14, 11, 8] },
      p3: { name: 'Una bonita sonrisita', icon: 'xeviche_p3', cd: [14, 13, 12], mana: [60, 65, 70], windup: 0.3, dur: 0.6,
            desc: 'Lanza un corazón hacia donde apuntas. Si impacta a un enemigo, este pierde el control de su campeón y camina lentamente hacia Xeviche durante unos segundos (no puede atacar ni usar habilidades). Causa un poco de daño de IA.',
            speed: 480, range: 520, lure: [2.0, 2.5, 3.0], dmg: [20, 35, 50], apScale: 0.3 },
      ult: { name: 'Karis Harem', icon: 'xeviche_ult', cd: [90, 80, 70], mana: [120, 120, 120], windup: 0.5, dur: 3.5,
             desc: 'Xeviche se da la vuelta e invoca a tres empleadas con el mismo uniforme. Cada una dispara su propio láser, así que son tres rayos paralelos que atraviesan cualquier unidad causando daño de IA continuo (cada láser golpea por separado). Xeviche no puede moverse hasta que la habilidad termine. Mejorarla aumenta el tiempo y el daño de los láseres. Escala con tu poder de IA.',
             length: 650, beamW: 52, spread: 74, time: [3, 4, 5], dps: [70, 95, 120], apScale: 0.55 },
    },
  },
};

// Jorbi — programador (luchador). Melee. p3 is a PASSIVE (every 3rd basic attack is a heavy critical hit).
CHAMPIONS.jorbi = {
  name: 'Jorbi', cls: 'programador', ref: 'ref_jorbi', height: 124,
  stats: { hp: 650, mana: 220, atk: 40, ap: 15, armor: 28, mr: 20, speed: 140, run: 230, range: 90, atkCd: 0.7 },
  grow: { hp: 0.075, atk: 0.05, ap: 0.03 },
  basic: { kind: 'melee', base: 16, atkScale: 1.0, type: 'physical', reach: 95, windup: 0.2, dur: 0.4, vfx: 'punch' },
  abilities: {
    p1: { name: 'Hay money', icon: 'jorbi_p1', cd: [9, 8, 7], mana: [40, 45, 50], windup: 0.3, dur: 0.55,
          desc: 'Lanza un fajo de billetes al frente: todo el trapecio frente a Jorbi se cubre de billetes, causa daño físico y ralentiza.',
          dmg: [40, 65, 90], atkScale: 0.7, slow: [0.3, 0.4, 0.5], slowTime: 2.5, length: 280, nearW: 90, farW: 230 },
    p2: { name: 'Rico caldito', icon: 'jorbi_p2', cd: [9, 8, 7], mana: [15, 15, 15], windup: 0, dur: 0.22,
          desc: 'Se desplaza al instante hacia donde apunta. Tiene 3 cargas de dash: cada carga se recarga por separado después de usarla (el enfriamiento corre por dash).',
          dashes: 3, dashDist: [260, 290, 320] },
    p3: { name: 'Hora de ponerse mamado', icon: 'jorbi_p3', passive: true,
          desc: 'Pasiva: el tercer golpe de tu combo de ataques básicos es un golpe fuerte que causa daño crítico.',
          critMult: [1.8, 2.3, 2.8] },
    ult: { name: '15 Minutos más', icon: 'jorbi_ult', cd: [80, 70, 60], mana: [100, 100, 100], windup: 0.9, dur: 1.4,
           desc: 'Retrocede la partida 5 segundos (10 en rango 2 y 15 en rango 3) y avisa a todos los jugadores: los súbditos vivos y los campeones vivos, aliados y enemigos, regresan a donde estaban (se muestra el camino que recorrieron). Al terminar, los aliados ganan un escudo y velocidad de movimiento y los enemigos quedan ralentizados durante unos segundos.',
           rewind: [5, 10, 15], travel: [1.3, 1.8, 2.3], buffTime: [2.5, 3, 3.5], shield: [90, 140, 190], shieldHpPct: 0.06, speedBoost: [0.3, 0.35, 0.4], slow: [0.4, 0.5, 0.6] },
  },
};

// Axel-kun — soporte (ranged). Q = random malware (virus / troyano / gusano), F = healing zone that follows him,
// E = shield + speed for him and nearby allies (placeholder design for "regateador hábil"), R = turns enemies in an area against their own team.
CHAMPIONS.axel = {
  name: 'Axel-kun', cls: 'soporte', ref: 'ref_axel', height: 120,
  stats: { hp: 520, mana: 380, atk: 34, ap: 25, armor: 18, mr: 18, speed: 135, run: 215, range: 380, atkCd: 0.8 },
  grow: { hp: 0.06, atk: 0.04, ap: 0.05 },
  basic: { kind: 'projectile', base: 12, atkScale: 0.9, type: 'physical', speed: 540, obj: 'laptop_white', windup: 0.22, dur: 0.45 },
  abilities: {
    p1: { name: 'Malware', icon: 'axel_p1', cd: [14, 13, 12], mana: [50, 55, 60], windup: 1.1, dur: 1.5,
          desc: 'Descarga un programa pirata (queda inmóvil mientras elige). Lanza una laptop de un tipo al azar, 33% cada uno. Al impactar deja una zona infectada con el icono del virus durante varios segundos: cualquier enemigo que pase queda afectado. VIRUS: veneno, silencio y ralentización. TROYANO: daño. GUSANO: ceguera.',
          dmg: [50, 80, 110], apScale: 0.5, radius: 150, speed: 520, zoneLife: [5, 6, 7], silence: [1.0, 1.3, 1.6], slow: [0.3, 0.4, 0.5], slowTime: 3, poisonTime: 4, blind: [3, 4, 5] },
    p2: { name: 'Proveedor humilde', icon: 'axel_p2', cd: [22, 20, 18], mana: [60, 65, 70], windup: 0.3, dur: 0.8,
          desc: 'Crea una zona de curación a su alrededor que lo acompaña mientras se mueve, durante unos segundos, mientras lee mangas.',
          radius: [170, 190, 210], life: [6, 7, 8], hps: [20, 30, 40], apScale: 0.25 },
    p3: { name: 'Regateador hábil', icon: 'axel_p3', cd: [18, 17, 16], mana: [60, 60, 60], windup: 0.3, dur: 0.7,
          desc: 'Deja una laptop Canaima en el suelo que funciona como un agujero negro: arrastra hacia su centro a todos los enemigos que estén en el área de eventos. Tras unos segundos explota y causa daño de IA a quienes sigan dentro.',
          range: 400, radius: [170, 190, 210], life: [3, 3.5, 4], pull: 240, dmg: [70, 110, 150], apScale: 0.6 },
    ult: { name: 'No estoy solo', icon: 'axel_ult', cd: [90, 80, 70], mana: [100, 100, 100], windup: 0.8, dur: 1.3,
           desc: 'Al alzar la voz, los campeones y tropas rivales en un área elegida se vuelven aliados por unos segundos: no ejecutan poderes y atacan con básicos a su aliado más cercano.',
           radius: [220, 260, 300], range: 420, charm: [3, 4, 5] },
  },
};

// Julio — programador (ranged artist). Skills (Q/F/E/R) leave INK marks on enemies; any later hit (basic or skill) makes the ink explode.
CHAMPIONS.julio = {
  name: 'Julio', cls: 'programador', ref: 'ref_julio', height: 120,
  stats: { hp: 560, mana: 340, atk: 24, ap: 62, armor: 20, mr: 20, speed: 138, run: 222, range: 400, atkCd: 0.8 },
  grow: { hp: 0.065, atk: 0.04, ap: 0.075 },
  // two alternating basic animations: #1 slow drawing (slow shot), #2 fast scribble (fast shot)
  basic: { kind: 'projectile', alt: true, base: 14, apScale: 0.5, type: 'magic', obj: 'ink_drawing',
           slow: { windup: 0.36, dur: 0.6, speed: 380, cd: 0.95 }, fast: { windup: 0.14, dur: 0.3, speed: 760, cd: 0.45 } },
  ink: { time: 7, apScale: 0.55, base: 25 },   // the explosion when ink is consumed
  abilities: {
    p1: { name: 'Trazo', icon: 'julio_p1', cd: [9, 8, 7], mana: [55, 60, 65], windup: 0.45, dur: 0.8,
          desc: 'Traza una S de tinta que atraviesa a los enemigos como un láser, dejando el suelo marcado, y causa enorme daño de IA. Los marca con tinta.',
          dmg: [90, 140, 190], apScale: 0.8, length: 620, width: 70, amp: 80 },
    p2: { name: 'Ola de tinta', icon: 'julio_p2', cd: [12, 11, 10], mana: [45, 50, 55], windup: 0.15, dur: 0.5,
          desc: 'Dash hacia el frente que daña a todos los que atraviesa y los marca con tinta.',
          dmg: [50, 80, 110], apScale: 0.5, dashDist: [320, 350, 380] },
    p3: { name: 'Charco de tinta', icon: 'julio_p3', cd: [14, 13, 12], mana: [50, 50, 50], windup: 0.3, dur: 0.65,
          desc: 'Crea un charco de tinta: ralentiza a los enemigos dentro y, si permanecen varios segundos, los stunea.',
          radius: [110, 125, 140], life: [8, 9, 10], slow: [0.35, 0.45, 0.55], stunAfter: [2.5, 2.2, 1.9], stun: [1.0, 1.2, 1.4], range: 340 },
    ult: { name: 'El arte de las gotas', icon: 'julio_ult', cd: [90, 80, 70], mana: [100, 100, 100], windup: 0.8, dur: 1.4,
           desc: 'Caen gotas de tinta del cielo sobre todos los campeones enemigos del mapa (1 segundo entre cada ronda, hasta 3 veces), causando daño de IA y marcándolos.',
           dmg: [90, 140, 190], apScale: 0.6, drops: [1, 2, 3], radius: 80 },
  },
};

// Luis — hacker (melee fists). Q robots, W invisibility, E silence aura, R takes control of an enemy champion.
CHAMPIONS.luis = {
  name: 'Luis', cls: 'hacker', ref: 'ref_luis', height: 122,
  stats: { hp: 570, mana: 300, atk: 48, ap: 45, armor: 24, mr: 18, speed: 150, run: 245, range: 85, atkCd: 0.65 },
  grow: { hp: 0.07, atk: 0.055, ap: 0.06 },
  basic: { kind: 'melee', base: 15, atkScale: 1.0, type: 'physical', reach: 92, windup: 0.18, dur: 0.4, vfx: 'punch' },
  abilities: {
    p1: { name: 'Antivirus', icon: 'luis_p1', cd: [16, 15, 14], mana: [60, 65, 70], windup: 0, dur: 0.3,
          desc: 'Despliega robots voladores permanentes que lo acompañan y disparan láser automáticamente al enemigo que Luis ataque (si los destruyen, vuelve a lanzar la habilidad). Al subirla: más robots y más daño (escala con poder IA).',
          robots: [1, 2, 3], dmg: [12, 18, 26], apScale: 0.22 },
    p2: { name: 'Amenaza', icon: 'luis_p2', cd: [20, 16, 12], mana: [40, 40, 40], windup: 0, dur: 0.3,
          desc: 'Luis se vuelve invisible y se mueve sin ser visto; solo las torretas lo ven. Las habilidades aún lo alcanzan. Deja un rastro de su silueta cada cierto tiempo. Es permanente hasta que Luis ataca, y deja un rastro cada 1.5 s. Si tras salir de la invisibilidad golpea por la espalda a un campeón, causa daño crítico de poder de IA. Al subirla se reduce el enfriamiento.' },
    p3: { name: 'Hacker profesional', icon: 'luis_p3', cd: [20, 18, 16], mana: [60, 65, 70], windup: 0, dur: 0.3,
          desc: 'Silencia las habilidades de los enemigos mientras estén cerca de Luis. Solo se liberan si atacan a Luis.',
          radius: [260, 300, 340], duration: [8, 9, 10] },
    ult: { name: 'Tu programa es mío', icon: 'luis_ult', cd: [100, 80, 60], mana: [100, 100, 100], windup: 0.7, dur: 1.0,
           desc: 'Toma el control total de un campeón enemigo durante varios segundos. El cuerpo de Luis desaparece y reaparece donde empezó. Al subirla se reduce el enfriamiento.',
           range: 480, control: [3, 4, 5] },
  },
};

// Eliud — programador. No mana: RAGE bar fills by dealing / taking damage; full bar -> giant hen mode (melee lance, tougher) for a while.
CHAMPIONS.eliud = {
  name: 'Eliud', cls: 'programador', ref: 'ref_eliud', height: 124, rage: true,
  stats: { hp: 600, mana: 0, atk: 38, ap: 20, armor: 24, mr: 18, speed: 142, run: 232, range: 400, atkCd: 0.8 },
  grow: { hp: 0.07, atk: 0.05, ap: 0.03 },
  // base form throws eggs (ranged, physical); hen form: big lance (melee)
  basic: { kind: 'projectile', obj: 'egg', base: 13, atkScale: 0.95, type: 'physical', speed: 560, windup: 0.22, dur: 0.45,
           hen: { kind: 'melee', base: 24, atkScale: 1.25, reach: 125, type: 'physical', windup: 0.25, dur: 0.5, vfx: 'punch' } },
  hen: { speed: 0.35, hp: 600, hpScale: 0.08, hpMult: 1, atkMult: 1.2, armor: 40, mr: 30, rageHit: 1.6, rageKill: { champ: 35, minion: 8, tower: 15 }, rageSkill: 3.5, rageTaken: 0.55 },
  abilities: {
    p1: { name: 'Huevo granada', icon: 'eliud_p1', cd: [10, 9, 8], mana: [0, 0, 0], windup: 0.3, dur: 0.6,
          desc: 'Lanza un enorme huevo granada al punto elegido: pasados unos segundos explota y daña en área. Funciona igual a pie o sobre la gallina.',
          dmg: [70, 110, 150], atkScale: 0.9, radius: 140, range: 420, fuse: [1.8, 1.6, 1.4] },
    p2: { name: 'Trampa de huevos', icon: 'eliud_p2', cd: [14, 13, 12], mana: [0, 0, 0], windup: 0.3, dur: 0.6,
          desc: 'Despliega huevos en una zona: explotan cuando cualquier unidad enemiga pasa sobre ellos.',
          dmg: [45, 70, 95], atkScale: 0.5, radius: 95, range: 320, eggs: [4, 5, 6], life: 25 },
    p3: { name: 'Lanza', icon: 'eliud_p3', cd: [14, 13, 12], mana: [0, 0, 0], windup: 0.25, dur: 0.55,
          desc: 'Arroja su lanza (alcance corto): atraviesa a los enemigos y queda clavada en el suelo. Cuanto más lejos alcanza a un enemigo, más daño físico causa. Si Eliud la recoge, el enfriamiento se reinicia; si no, la lanza desaparece cuando el poder vuelve a estar listo.',
          dmg: [40, 65, 90], atkScale: 0.6, farBonus: [1.4, 1.6, 1.8], length: 440, width: 54 },
    ult: { name: 'Paquete sorpresa', icon: 'eliud_ult', cd: [70, 60, 50], mana: [0, 0, 0], windup: 0.6, dur: 1.0,
           desc: 'Hace caer del cielo paquetes con una mejora temporal al azar: vida extra, más daño de ataque, más velocidad de ataque o más defensa. Los abre cualquiera que pase por encima. Al subirla hay más cajas y las mejoras duran más y son más fuertes.',
           packages: [1, 2, 3], range: 450, life: 40, effectTime: [8, 12, 16], effectPower: [0.2, 0.3, 0.4] },
  },
};

// Héctor — ciberseguridad (tank, melee). Q heal-over-time until hit, F chains pull him to the enemy, E shield from max HP, R fiery bike dash.
CHAMPIONS.hector = {
  name: 'Héctor', cls: 'cyber', ref: 'ref_hector', height: 126,
  stats: { hp: 880, mana: 240, atk: 46, ap: 15, armor: 42, mr: 26, speed: 132, run: 218, range: 85, atkCd: 0.8 },
  grow: { hp: 0.09, atk: 0.05, ap: 0.03 },
  basic: { kind: 'melee', base: 17, atkScale: 1.0, type: 'physical', reach: 92, windup: 0.22, dur: 0.45, vfx: 'punch' },
  abilities: {
    p1: { name: 'Proteína', icon: 'hector_p1', cd: [22, 20, 18], mana: [40, 45, 50], windup: 0, dur: 0.4,
          desc: 'Se toma una proteína y se cura de forma prolongada (hasta 12 s) o hasta que reciba daño de cualquier tipo. La curación escala con su vida máxima.',
          hps: [18, 26, 34], hpPct: [0.012, 0.016, 0.02], maxTime: 12 },
    p2: { name: 'Cadenas engrasadas', icon: 'hector_p2', cd: [14, 13, 12], mana: [50, 55, 60], windup: 0.25, dur: 0.5,
          desc: 'Lanza cadenas: si atrapan a un enemigo, Héctor es arrastrado por las cadenas hasta él y el enemigo queda aturdido mientras esté atado. Causa daño físico.',
          dmg: [50, 80, 110], atkScale: 0.8, stun: [0.8, 1.0, 1.2], range: 520, speed: 950 },
    p3: { name: 'Equipo de protección', icon: 'hector_p3', cd: [16, 15, 14], mana: [40, 40, 40], windup: 0, dur: 0.4,
          desc: 'Se equipa con protección y gana un escudo temporal (barra blanca delante de su vida). Escala con su vida máxima y su armadura, así que crece con el nivel y con el Setup/equipo.',
          shieldFlat: [60, 100, 140], shieldPct: [0.2, 0.28, 0.36], shieldArmor: [0.8, 1.2, 1.6], time: [6, 7, 8] },
    ult: { name: 'Ciclismo profesional', icon: 'hector_ult', cd: [90, 80, 70], mana: [100, 100, 100], windup: 0.4, dur: 0.6,
           desc: 'Se sube a su bicicleta, que avanza sola y siempre hacia delante: arranca muy lenta y acelera poco a poco hasta alcanzar una gran velocidad. Héctor la dirige libremente por el mapa. Atropella a los enemigos (daño físico y aturdimiento) y deja una estela de fuego. La bici desaparece al acabarse su tiempo (barra blanca bajo el maná); mientras la monta no puede atacar ni usar otras habilidades.',
           life: [8, 9, 10], ramp: 3.5, startSpeed: 50, maxSpeed: [480, 520, 560], dmg: [60, 90, 120], atkScale: 0.6, stun: [0.8, 1.0, 1.2], fireDmg: [18, 26, 34], fireTime: 3.2 },
  },
};

// Maduro — soporte (ranged, magic). Q megaphone decree line (silence), F bodyguards (-20% damage + push), E empty supply box (area: enemies / allies), R = Súper Bigote (15 s):
// his Q / F / E become Iron Fist (dash punch + stun), Anti-imperialist Shield (blocks the first hit or CC) and Iron Hand (grab + armour shred); basic attacks become punches. `sb` holds the transformed kit.
CHAMPIONS.maduro = {
  name: 'Maduro', cls: 'soporte', ref: 'ref_maduro', height: 122,
  stats: { hp: 640, mana: 320, atk: 40, ap: 32, armor: 28, mr: 24, speed: 134, run: 214, range: 380, atkCd: 0.8 },
  grow: { hp: 0.07, atk: 0.04, ap: 0.06 },
  basic: { kind: 'projectile', base: 12, apScale: 0.55, type: 'magic', speed: 580, vfx: 'magic_missile', obj: 'decree_scroll', scale: 0.12, windup: 0.22, dur: 0.42 },
  abilities: {
    p1: { name: 'Decreto presidencial', icon: 'maduro_p1', cd: [10, 9, 8], mana: [60, 65, 70], windup: 0.3, dur: 0.6,
          desc: 'Lanza un discurso por un megáfono gigante en línea recta. Nivel 1: daño mágico y SILENCIO 1.5 s (el segundo campeón golpeado se ralentiza un 40 %). Nivel 2: las ondas se vuelven de un amarillo intenso y además ATURDEN 1 s. Nivel 3: las ondas son rojas, aturden 1.5 s, hacen mucho más daño y dejan manchas en el suelo.',
          dmg: [60, 100, 190], apScale: 0.6, length: 640, width: 84, silence: 1.5, stun: [0, 1, 1.5], slowPct: 0.4, slowTime: 2, stainTime: 7 },
    p2: { name: 'Colectivo protector', icon: 'maduro_p2', cd: [20, 18, 16], mana: [50, 55, 60], windup: 0.1, dur: 0.5,
          desc: 'Invoca guardaespaldas que lo siguen y lo rodean siempre. Al activarla aparecen 2 al instante; después invoca uno nuevo cada 15 s hasta llegar al límite (5 en el nivel 1), y al llegar al máximo no invoca más. Atacan con daño físico a los enemigos cercanos, tienen vida y son permanentes. Al mejorarla aumentan su daño, su vida, su cantidad máxima (5 → 7) y la invocación es más rápida.',
          initial: 2, cap: [5, 6, 7], interval: [15, 12, 10], hp: [260, 380, 520], dmg: [14, 22, 32], atkScale: 0.25 },
    p3: { name: 'La cesta básica', icon: 'maduro_p3', cd: [14, 13, 12], mana: [60, 65, 70], windup: 0.25, dur: 0.6,
          desc: 'Arroja una caja de recursos vacía que, al caer, queda en el mapa durante 1 minuto con su propia vida (desaparece al llegar a 0). Va soltando cucarachas que atacan al objetivo más cercano, y el área alrededor de la caja ENVENENA a los enemigos. Al mejorarla la caja tiene más vida, suelta más bichos y estos son MÁS GRANDES, con más vida y más armadura, y el veneno es más fuerte.',
          range: 520, radius: 80, life: 60, hp: [220, 340, 480], bugEvery: [6, 5, 4], bugCap: [4, 5, 6], bugHp: [60, 110, 180], bugArmor: [5, 18, 32], bugScale: [1, 1.5, 2.1], bugDmg: [8, 12, 16], poison: [10, 15, 22] },
    ult: { name: '¡Aparición de Súper Bigote!', icon: 'maduro_ult', cd: [100, 90, 80], mana: [100, 100, 100], windup: 0.5, dur: 0.9,
           desc: 'Se transforma en el superhéroe Súper Bigote durante 15 s. Una onda expansiva EMPUJA hacia atrás a todos a su alrededor (aliados incluidos, que no reciben daño) y daña a los enemigos. Nivel 1: onda blanca, empuje ligero. Nivel 2: onda azul, aleja más a todos. Nivel 3: onda roja, aleja aún más y causa mucho más daño. Mientras dura gana velocidad y armadura, y su Q, F y E se vuelven ofensivas: Puño de hierro, Escudo antimperialista y Mano de hierro.',
           time: 15, speed: 0.3, armor: [30, 45, 60], mr: [15, 25, 35], radius: [280, 360, 440], push: [200, 330, 470], dmg: [30, 55, 120], apScale: 0.4 },
  },
  sb: {
    basic: { kind: 'melee', base: 22, atkScale: 1.0, type: 'physical', reach: 100, windup: 0.2, dur: 0.42, vfx: 'punch' },
    abilities: {
      p1: { name: 'Puño de hierro', icon: 'maduro_p1_sb', cd: [8, 7, 6], mana: [60, 65, 70], windup: 0.1, dur: 0.5,
            desc: 'Súper Bigote vuela una corta distancia hacia delante y asesta un puñetazo devastador en el suelo. El primer campeón enemigo golpeado recibe daño físico masivo y queda ATURDIDO 1.5 s; los enemigos alrededor del impacto reciben daño colateral.',
            dmg: [90, 140, 190], atkScale: 1.1, dist: 260, stun: 1.5, splash: 0.5, radius: 130 },
      p2: { name: 'Escudo antimperialista', icon: 'maduro_p2_sb', cd: [14, 13, 12], mana: [50, 55, 60], windup: 0.1, dur: 0.4,
            desc: 'Crea un escudo de energía electromagnética que bloquea el primer ataque, proyectil o control de masas que lo golpee. Al bloquear, el escudo estalla y causa daño mágico a los enemigos cercanos según lo bloqueado.',
            time: [4, 4.5, 5], radius: 190, burst: 0.8, base: 60 },
      p3: { name: 'Mano de hierro', icon: 'maduro_p3_sb', cd: [12, 11, 10], mana: [60, 65, 70], windup: 0.2, dur: 0.5,
            desc: 'Estira su mano biónica hacia delante. Si atrapa a un enemigo lo ARRASTRA hacia él y le reduce la armadura un 25 % durante 3 s.',
            dmg: [60, 90, 120], atkScale: 0.7, range: 480, width: 64, shred: 0.25, shredTime: 3 },
    },
  },
};
export const maduroSB = def => ({ ...def, ref: 'ref_superbigote', basic: def.sb.basic, abilities: { ...def.abilities, ...def.sb.abilities } });

// Diosa Canales — asesina / escaramuzadora de daño físico. Resource = "Farándula" (the mana bar: starts empty, fills by fighting, no mana costs).
// Passive Rompiendo el Tabú; Q Pose de portada (dash, recast = backflip + kisses), W Tumbando la Zona (charm those who look at her), E Tacón de aguja (back-hit execute), R Show principal.
CHAMPIONS.diosa = {
  name: 'Diosa Canales', cls: 'hacker', ref: 'ref_diosa', height: 120, farandula: true,
  passive: { name: 'Rompiendo el Tabú', icon: 'diosa_passive',
    desc: 'Cuando asesina a un campeón enemigo se vuelve INVISIBLE durante unos segundos, hasta que ataque o lance una habilidad.',
    invis: 4 },
  stats: { hp: 590, mana: 100, atk: 54, ap: 18, armor: 24, mr: 20, speed: 150, run: 236, range: 90, atkCd: 0.7 },
  grow: { hp: 0.07, atk: 0.055, ap: 0.03 },
  basic: { kind: 'melee', base: 15, atkScale: 1.0, type: 'physical', reach: 92, windup: 0.18, dur: 0.38, vfx: 'punch' },
  abilities: {
    p1: { name: 'Pose de portada', icon: 'diosa_p1', cd: [11, 10, 9], mana: [15, 15, 15], windup: 0.05, dur: 0.4,
          desc: 'Avanza rápidamente en una dirección y causa daño físico a todos los enemigos que atraviesa. Si golpea a un campeón puede volver a pulsarla durante 3 s para dar una voltereta hacia atrás lanzando una ráfaga de besos que causa daño de IA (y activa los efectos de impacto).',
          dmg: [50, 85, 120], atkScale: 0.7, dist: 300, width: 56, recast: 3, recastCd: 0.4, kissDmg: [45, 75, 105], kissAp: 0.5, back: 200, kissRange: 420 },
    p2: { name: 'Tumbando la zona', icon: 'diosa_p2', cd: [18, 17, 16], mana: [35, 35, 35], windup: 0.15, dur: 0.7,
          desc: 'Ejecuta un baile provocativo a su alrededor. Los campeones enemigos que la miren quedan ENCANTADOS 1.25 s y caminan indefensos hacia ella; los que estén de espaldas solo se ralentizan un 50 %. Por cada campeón afectado gana un escudo temporal.',
          radius: 300, charm: [1.25, 1.4, 1.55], slow: 0.5, slowTime: 2, shield: [60, 85, 110], shieldTime: 4 },
    p3: { name: 'Tacón de aguja', icon: 'diosa_p3', cd: [9, 8, 7], mana: [20, 20, 20], windup: 0.18, dur: 0.45,
          desc: 'Da una poderosa estocada con su tacón. De frente causa daño y ralentiza gravemente (60 %). Si golpea por la espalda, causa además daño según la vida que le falta al objetivo: una ejecución.',
          dmg: [60, 95, 130], atkScale: 0.8, reach: 165, width: 60, slow: 0.6, slowTime: 2, backPct: [0.25, 0.3, 0.35] },
    ult: { name: 'Show principal', icon: 'diosa_ult', cd: [100, 90, 80], mana: [50, 50, 50], windup: 0.1, dur: 1.0,
           desc: 'Marca en el suelo un círculo de luces y se vuelve invulnerable 1 s (sigue visible) mientras se limpia de cualquier control de masas. Al caer explota en flashes de cámaras: ciega 1.5 s a los campeones enemigos del círculo y les ROBA el 50 % de su oro; llena su Farándula y durante 8 s sus habilidades se recargan el doble de rápido.',
           radius: 450, blind: 1.5, cdrTime: 8, steal: 0.5 },
  },
};

// small helper
export const rk = (arr, rank) => arr[Math.min(Math.max(rank, 1), arr.length) - 1];

// Yonaiker — soporte (ranged, physical). Q = toggle machine gun (aboard), F = smoke grenade (on foot) / supply crates (aboard), E = bomber ship (charge bar fills only by landing basic hits),
// R = smoke screen (aboard).
CHAMPIONS.yonaiker = {
  name: 'Yonaiker', cls: 'soporte', ref: 'ref_yonaiker', height: 118, charge: true,   // no mana: a charge bar fills until the ship picks him up
  stats: { hp: 540, mana: 0, atk: 46, ap: 20, armor: 20, mr: 18, speed: 138, run: 220, range: 400, atkCd: 0.85 },
  grow: { hp: 0.06, atk: 0.045, ap: 0.05 },
  basic: { kind: 'projectile', base: 12, atkScale: 0.9, type: 'physical', speed: 620, vfx: 'bullet_tracer', scale: 1.3, windup: 0.22, dur: 0.4 },
  abilities: {
    p1: { name: 'Ametralladora', icon: 'yonaiker_gun', cd: [1, 1, 1], mana: [0, 0, 0], windup: 0, dur: 0.15, toggle: true,
          desc: 'Solo a bordo de la nave. Se activa y se desactiva con la tecla: mientras está encendida, la nave dispara balas sin parar sobre el área de la mira (un círculo con una mira de punta roja), sin gastar nada. Cada bala cae en un punto al azar del área y causa poco daño físico (escala con tu ataque) a los enemigos que toca. Se apaga sola al volver a tierra. Mejorarla dispara más rápido y causa más daño.',
          rate: [0.1, 0.09, 0.08], dmg: [5, 7, 9], atkScale: 0.12, area: 80, hit: 40 },
    p2: { name: 'Granada de humo', icon: 'yonaiker_p2', cd: [12, 11, 10], mana: [0, 0, 0], windup: 0.3, dur: 0.6,
          desc: 'A pie: lanza una granada de humo a la zona que elijas (dentro de su alcance). La nube envenena a todos los enemigos que estén dentro causando daño físico continuo (escala con tu ataque) y además ciega a los campeones enemigos mientras permanezcan dentro (la zona se marca con un círculo morado; al salir recuperan la vista). A bordo de la nave: pide suministros por radio y caen tres cajas de ayuda sobre la zona de la mira; el aliado que las recoja (pasando por encima) obtiene una ventaja al azar: vida, maná, más ataque, más defensa, más velocidad de ataque o más velocidad de movimiento.',
          range: 520, radius: 140, life: [5, 6, 7], dps: [16, 24, 32], atkScale: 0.3,
          crateCd: [28, 25, 22], heal: [0.2, 0.28, 0.36], buff: [0.2, 0.28, 0.36], time: [8, 10, 12] },
    p3: { name: 'Bombardero', icon: 'yonaiker_p1', cd: [3, 2.6, 2.2], mana: [0, 0, 0], windup: 0.2, dur: 1.0,
          desc: 'Yonaiker no usa maná: tiene una barra de nave que NO se llena sola; solo sube cuando dispara y acierta daño con sus ataques básicos. Al llenarse se detiene y una nave pasa a recogerlo. A bordo tiene una vista aérea (50 % más lejos que la normal) con la mira en el centro de la pantalla; se mueve con WASD. Con clic (o manteniendo E) lanza un misil, con unos segundos de enfriamiento entre misil y misil, sobre el área de la mira, que causan daño físico y quemadura (escala con tu ataque) y dejan llamas y la tierra rasgada. La barra se vacía mientras vuela (el vuelo dura mucho más que antes); al vaciarse, la nave lo devuelve a tierra y la barra empieza de cero. A bordo no puede ser atacado. Mejorarla alarga el vuelo, carga más rápido por impacto y aumenta el daño.',
          gainBasic: [4, 4.6, 5.2], time: [28, 34, 40], rate: [3, 2.6, 2.2], dmg: [55, 85, 115], atkScale: 0.7, hit: 95, burn: [10, 14, 18], burnTime: 3, fireLife: 4, fireDmg: [8, 12, 16] },
    ult: { name: 'Cortina de humo', icon: 'yonaiker_ult', cd: [100, 90, 80], mana: [0, 0, 0], windup: 0.4, dur: 0.8,
           desc: 'Solo a bordo de la nave. Lanza una gran nube de humo donde apunta la mira, marcada con un círculo morado: todos los campeones enemigos que estén dentro quedan cegados (ven muy poco a su alrededor) y silenciados (no pueden usar habilidades) mientras permanezcan en el círculo; al salir recuperan la vista y las habilidades.',
           radius: 650, time: [6, 8, 10] },
  },
};

// Junior — peleador cuerpo a cuerpo, capitán de un navío. Basic punches: every 3rd hit stuns. Q = anchor drag, W = somersault + shield, E = flamethrower (5 s, can move), R = missile barrage.
CHAMPIONS.junior = {
  name: 'Junior', cls: 'programador', ref: 'ref_junior', height: 122,
  stats: { hp: 780, mana: 260, atk: 44, ap: 18, armor: 34, mr: 22, speed: 135, run: 215, range: 90, atkCd: 0.8 },
  grow: { hp: 0.085, atk: 0.05, ap: 0.03 },
  basic: { kind: 'melee', base: 15, atkScale: 1.0, type: 'physical', reach: 92, windup: 0.22, dur: 0.45, vfx: 'punch' },
  fist: { hits: 3, stun: 1.0, dmg: 0.9, reset: 6 },   // the 3rd punch of the combo stuns
  abilities: {
    p1: { name: 'Ancla de abordaje', icon: 'junior_p1', cd: [14, 13, 12], mana: [55, 60, 65], windup: 0.35, dur: 0.7,
          desc: 'Se lanza como un ancla hacia donde apuntas y arrastra consigo a todo campeón enemigo que alcance. Los arrastra sin que puedan actuar, pero no los aturde: solo si chocan con una pared quedan aturdidos al impactar y la rompen. Causa daño físico.',
          range: 440, width: 110, speed: 1100, dmg: [40, 65, 90], atkScale: 0.7, wallStun: [1.6, 2.0, 2.4], wallDmg: [30, 45, 60] },
    p2: { name: 'Voltereta', icon: 'junior_p2', cd: [10, 9, 8], mana: [40, 40, 40], windup: 0, dur: 0.38,
          desc: 'Realiza una voltereta rápida hacia donde apuntas. Al terminar obtiene un escudo temporal.',
          dist: [170, 190, 210], shield: [70, 110, 150], shieldHpPct: 0.06, time: [3, 3.5, 4] },
    p3: { name: 'Lanzallamas', icon: 'junior_p3', cd: [18, 17, 16], mana: [60, 60, 60], windup: 0.25, dur: 0.45,
          desc: 'Se equipa un lanzallamas durante 5 segundos y quema todo lo que está frente a él (zona en forma de triángulo). Los enemigos alcanzados quedan quemados un tiempo. Puede moverse mientras lo mantiene encendido. Escala con ataque físico.',
          length: 300, nearW: 70, farW: 260, active: 5, dps: [26, 38, 50], atkScale: 0.45, burn: [3, 3.5, 4] },
    ult: { name: 'Bombardeo', icon: 'junior_ult', cd: [90, 80, 70], mana: [100, 100, 100], windup: 0.8, dur: 1.2,
           desc: 'Ordena un bombardeo: caen misiles del cielo sobre una gran zona, causando daño físico a todo el que esté dentro. Siguen cayendo durante 5 segundos (más a mayor nivel).',
           range: 650, radius: [300, 330, 360], time: [5, 6.5, 8], dmg: [55, 80, 105], atkScale: 0.45, rate: 0.16, hit: 95 },
  },
};

// Targeting preview shown while aiming a power (first press/click), cast on the second click.
//  line: projectile trajectory | circle: area/range | wall: row of objects placed at the cursor
export function aimSpec(champ, key, rank, f) {
  const a = (f?.def?.abilities || CHAMPIONS[champ].abilities)[key];
  switch (champ + ':' + key) {
    case 'leandro:p1':  return a.v === 'comb' ? { type: 'circle', radius: rk(a.reach, rank), color: 0x66ffcc } : { type: 'zone', max: a.range, radius: rk(a.radius, rank), color: 0x7dff5a };
    case 'leandro:p2':  return a.v === 'dryer' ? { type: 'dryer', length: rk(a.length, rank), width: a.width, color: 0x5ad7ff } : { type: 'trapezoid', length: Math.round(rk(a.reach, rank) * 0.84), nearW: 70, farW: Math.round(rk(a.reach, rank) * 0.66 + 40), color: 0xb0ff60 };
    case 'leandro:p3':  return a.v === 'throw' ? { type: 'tirethrow', min: 300, max: a.range, count: a.count, spacing: a.spacing, bounces: a.bounces, color: 0x9ad7ff } : { type: 'wall', min: 80, max: 260, count: 4, spacing: Math.round(84 * rk(a.size, rank)), color: 0x9ad7ff };
    case 'leandro:ult': return a.v === 'leak' ? { type: 'pick', radius: 1800, color: 0x66ffcc } : { type: 'circle', radius: 160, color: 0x66ffcc };
    case 'xeviche:p1':  return { type: 'line', range: 620, width: 46, color: 0xffd23f };
    case 'xeviche:p3':  return { type: 'line', range: a.range, width: 44, color: 0xff3b60 };
    case 'julio:p1':    return { type: 'line', range: a.length, width: a.width, color: 0x8a5cff };
    case 'julio:p2':    return { type: 'line', range: rk(a.dashDist, rank), width: 56, color: 0x6a8cff };
    case 'julio:p3':    return { type: 'zone', max: a.range, radius: rk(a.radius, rank), color: 0x7a4cff };
    case 'julio:ult':   return { type: 'circle', radius: 70, color: 0x8a5cff };
    case 'luis:p1':     return { type: 'circle', radius: 70, color: 0x5dff8a };
    case 'luis:p2':     return { type: 'circle', radius: 60, color: 0x7ee0ff };
    case 'luis:p3':     return { type: 'circle', radius: rk(a.radius, rank), color: 0x33ff88 };
    case 'luis:ult':    return { type: 'pick', radius: a.range, color: 0x33ff88 };
    case 'eliud:p1':    return { type: 'zone', max: a.range, radius: a.radius, color: 0xffb020 };
    case 'eliud:p2':    return { type: 'zone', max: a.range, radius: a.radius, color: 0xffd23f };
    case 'eliud:p3':    return { type: 'line', range: a.length, width: a.width, color: 0xff8a4a };
    case 'eliud:ult':   return { type: 'zone', max: a.range, radius: 70, color: 0x7ee0ff };
    case 'hector:p1':   return { type: 'circle', radius: 60, color: 0x5dff8a };
    case 'hector:p2':   return { type: 'line', range: a.range, width: 44, color: 0xc9a14a };
    case 'hector:p3':   return { type: 'circle', radius: 60, color: 0x7ee0ff };
    case 'axel:p1':     return { type: 'line', range: 900, width: 44, color: 0xc77dff };
    case 'axel:p2':     return { type: 'circle', radius: rk(a.radius, rank), color: 0x5dff8a };
    case 'axel:p3':     return { type: 'zone', max: a.range, radius: rk(a.radius, rank), color: 0x9a5cff };
    case 'axel:ult':    return { type: 'zone', max: a.range, radius: rk(a.radius, rank), color: 0xffd23f };
    case 'jorbi:p1':    return { type: 'trapezoid', length: a.length, nearW: a.nearW, farW: a.farW, color: 0x7dff8a };
    case 'jorbi:p2':    return { type: 'line', range: rk(a.dashDist, rank), width: 46, color: 0xffd23f };
    case 'jorbi:ult':   return { type: 'circle', radius: 95, color: 0x66d0ff };
    case 'yonaiker:p2': return { type: 'zone', max: a.range, radius: a.radius, color: 0x9be37a };
    case 'junior:p1': return { type: 'line', range: a.range, width: a.width, color: 0x66b0ff };
    case 'junior:p2': return { type: 'line', range: rk(a.dist, rank), width: 60, color: 0x7ee0ff };
    case 'junior:p3': return { type: 'trapezoid', length: a.length, nearW: a.nearW, farW: a.farW, color: 0xff7a2a };
    case 'junior:ult': return { type: 'zone', max: a.range, radius: rk(a.radius, rank), color: 0xff4a3a };
    case 'xeviche:ult': return { type: 'line', range: a.length, width: a.spread * 2 + a.beamW, color: 0xffd23f };   // the three lasers side by side
    case 'diosa:p1': return { type: 'line', range: a.dist, width: a.width, color: 0xff4fa3 };
    case 'diosa:p3': return { type: 'line', range: a.reach, width: a.width, color: 0xff9ad0 };
    case 'maduro:p1': return f?.sb ? { type: 'line', range: a.dist + 60, width: 70, color: 0xff4a3a } : { type: 'line', range: a.length, width: a.width, color: 0xffd23f };
    case 'maduro:p3': return f?.sb ? { type: 'line', range: a.range, width: a.width, color: 0xc0c8d8 } : { type: 'zone', max: a.range, radius: a.radius, color: 0xffd23f };
  }
  return { type: 'circle', radius: 80, color: 0xffffff };
}


/* ---------- basic attack combos ----------
   Click up to 3 times in a row (each next click within COMBO_WINDOW seconds of the previous swing ending): 3 chained hits, each with its own animation
   (attack, attack2, attack3). Every champion's combo keeps his style: melee champions chain strikes; ranged champions chain shots.
   Step fields: anim, dmg (damage multiplier of EACH hit/shot), w / t / cd (windup, animation and cooldown multipliers), lunge (forward impulse in px when you attack
   while moving toward your aim), melee: reachAdd; ranged: shots, gap (s between shots), spread (rad between shots), scale (projectile size), speed, fin (finisher).
   The three hits average to the champion's old basic attack damage per second. */
export const COMBO_WINDOW = 0.7;   // seconds you can pause between clicks without losing the combo
// cd = fraction of the champion's basic-attack cooldown until the next click can start the next hit (the swing is cancelled into it once the hit has landed).
// Chaining hits is therefore faster than the old single attack, so the damage of each hit is lower: a full combo keeps about the old damage per second (+10 %).
// After the 3rd hit (finisher) there is a LONG recovery before the 1st hit of the next combo can start (cd 1.3 x the basic cooldown): no endless bursts.
// Hits 1-2 chain quickly; the damage of the three hits keeps the combo at about the old damage per second (+5 %) over the whole 2.0 x cooldown cycle.
const MELEE = [
  { anim: 'attack',  dmg: 0.55, w: 0.9, t: 0.9,  cd: 0.35 },
  { anim: 'attack2', dmg: 0.6,  w: 0.9, t: 0.9,  cd: 0.35 },
  { anim: 'attack3', dmg: 0.95, w: 1.5, t: 1.3,  cd: 1.3,  reachAdd: 20, fin: true },
];
const RANGED = [
  { anim: 'attack',  dmg: 0.55, w: 0.95, t: 0.95, cd: 0.35 },
  { anim: 'attack2', dmg: 0.28, w: 0.8,  t: 0.9,  cd: 0.35, shots: 2, gap: 0.07, spread: 0.12 },
  { anim: 'attack3', dmg: 0.95, w: 1.4,  t: 1.3,  cd: 1.3,  scale: 1.5, speed: 1.1, fin: true },
];
export const COMBOS = {
  // melee
  jorbi:    MELEE,   // jab, cross, critical finisher (with his passive the finisher is the critical hit)
  luis:     MELEE,   // jab, hook, finisher (the backstab bonus still applies to every hit)
  hector:   MELEE,   // jab, cross, kick finisher
  junior:   MELEE,   // jab, cross, fist finisher: the 3rd punch fills his fist counter and stuns
  // ranged
  leandro:  [RANGED[0], RANGED[1], { ...RANGED[2], finMult: 0.75 }],                       // missile, double missile, big missile
  xeviche:  [{ ...RANGED[0], obj: 'lego_1' }, { ...RANGED[0], anim: 'attack2', dmg: 0.6, w: 0.85, obj: 'lego_2' }, { ...RANGED[2], shots: 1, dmg: 0.95, scale: 1.35, obj: 'lego_3' }],   // red, blue and a bigger yellow lego: one lego per click, no volleys
  axel:     [RANGED[0], RANGED[1], RANGED[2]],                             // laptop, quick double laptop, big laptop
  julio:    [RANGED[0], { ...RANGED[1], dmg: 0.6, shots: 1, spread: 0 }, RANGED[2]],                    // slow drawing, fast scribble, big ink blot (his alternating slow/fast style)
  eliud:    [RANGED[0], RANGED[1], RANGED[2]],                                       // egg, two eggs, giant egg
  yonaiker: [RANGED[0], RANGED[1], { ...RANGED[2], shots: 3, dmg: 0.32, gap: 0.06, spread: 0.1, scale: 1.1, speed: 1 }],   // shot, double tap, 3-round burst
};


/* ---------- attack with a forward impulse ----------
   Basic attack while moving toward your aim = ONE single attack (not a combo hit) with its own animation ('lunge'): the champion launches himself forward and attacks.
   It uses the normal cooldown, does the normal damage of a basic attack and never touches the combo. Each champion can define his own (distance, timing, projectile).
   dist: px travelled; w / t: windup and animation multipliers of his basic; cd: multiplier of the basic cooldown; dmg: damage multiplier; reachAdd (melee), obj / scale / speed (ranged). */
const LUNGE_MELEE = { dist: 95, w: 0.8, t: 0.95, cd: 1.0, dmg: 1.0, reachAdd: 15 };
const LUNGE_RANGED = { dist: 70, w: 0.8, t: 0.95, cd: 1.0, dmg: 1.0, speed: 1.1 };
export const LUNGES = {
  jorbi: LUNGE_MELEE, luis: LUNGE_MELEE, hector: { ...LUNGE_MELEE, dist: 110 }, junior: { ...LUNGE_MELEE, dist: 100 },   // lunging strikes
  xeviche: { ...LUNGE_RANGED, dist: 105, obj: 'lego_4', scale: 1.1 },   // he propels himself forward throwing a (green) lego
  leandro: LUNGE_RANGED, axel: LUNGE_RANGED, julio: LUNGE_RANGED, eliud: LUNGE_RANGED, yonaiker: LUNGE_RANGED,
};
