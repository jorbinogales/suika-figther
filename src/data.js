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
      p1: { name: 'Fiebre de cactus', icon: 'leandro_p1', cd: [10, 9, 8], mana: [40, 45, 50], windup: 0.35, dur: 0.6,
            desc: 'Cactus aparecen en una zona a tu elección (dentro de su alcance), causan daño de IA (escala fuerte con tu poder IA) y stunean a los enemigos.',
            stun: [0.8, 1.0, 1.2], radius: 130, range: 360, dmg: [30, 50, 70], apScale: 0.7 },
      p2: { name: 'Lanzamiento de contrato', icon: 'leandro_p2', cd: [8, 7, 6], mana: [35, 40, 45], windup: 0.35, dur: 0.6,
            desc: 'Lanza varios contratos hacia el frente en abanico: se van alejando y separando más. Al impactar a un enemigo infectan el área a su alrededor (zona verde) y envenenan a todos los que estén dentro. El daño y el veneno escalan con tu poder de IA.',
            speed: 480, count: [3, 4, 5], spread: 0.75, areaRadius: [95, 110, 125], areaLife: [3, 3.5, 4], poisonTime: 4, poisonApScale: [0.9, 1.2, 1.5], dmg: [20, 35, 50], apScale: 0.6 },
      p3: { name: '4 Cauchos', icon: 'leandro_p3', cd: [14, 13, 12], mana: [50, 50, 50], windup: 0.3, dur: 0.55,
            desc: 'Muro de 4 cauchos al frente: bloquea cualquier proyectil.',
            life: [4, 5, 6], offset: 110 },
      ult: { name: 'IA voy', icon: 'leandro_ult', cd: [70, 60, 50], mana: [100, 100, 100], windup: 0.6, dur: 1.0,
             desc: 'Invoca bots (2 melee + 2 distancia) que pelean a su lado. Mejorar agrega mas bots.',
             life: 14, melee: [2, 3, 4], ranged: [2, 3, 4], botApScale: 0.45 },
    },
  },
  xeviche: {
    name: 'Xeviche', cls: 'cyber', ref: 'ref_xeviche', height: 134,
    stats: { hp: 900, mana: 200, atk: 52, ap: 10, armor: 45, mr: 28, speed: 130, run: 210, range: 85, atkCd: 0.9 },
    grow: { hp: 0.09, atk: 0.05, ap: 0.03 },
    basic: { kind: 'melee', base: 18, atkScale: 1.0, type: 'physical', reach: 100, windup: 0.25, dur: 0.5, vfx: 'punch' },
    abilities: {
      p1: { name: 'Lanzamiento de lego', icon: 'xeviche_p1', cd: [9, 8, 7], mana: [35, 40, 45], windup: 0.4, dur: 0.65,
            desc: 'Lanza un lego gigante que stunea al enemigo alcanzado.',
            speed: 520, stun: [0.9, 1.1, 1.3], dmg: [40, 65, 90], atkScale: 0.6 },
      p2: { name: 'Arepa reina pepiada', icon: 'xeviche_p2', cd: [16, 15, 14], mana: [30, 35, 40], windup: 0, dur: 0.35,
            desc: 'Se come una enorme arepa al instante y restablece vida: una parte fija y una parte que escala con su vida máxima.',
            heal: [60, 100, 140], healHpPct: [0.12, 0.17, 0.22] },
      p3: { name: 'Setup', icon: 'xeviche_p3', passive: true,
            desc: 'Pasiva: cada cierto número de golpes que da (ataques básicos que impactan o habilidades que usa) Xeviche agrega una pieza a su setup. Cada pieza sube su armadura física y su resistencia a la IA (acumulable).',
            interval: [4, 3, 2], maxStacks: [3, 5, 7], armorPer: [6, 8, 10], mrPer: [6, 8, 10] },
      ult: { name: 'Temblor', icon: 'xeviche_ult', cd: [80, 70, 60], mana: [100, 100, 100], windup: 0.55, dur: 1.0,
             desc: 'Se lanza al suelo: todo alrededor tiembla y queda stuneado.',
             radius: [260, 320, 380], stun: [1.4, 1.8, 2.2], dmg: [80, 140, 200], atkScale: 0.8 },
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
          desc: 'Pasiva: cada tercer ataque básico es un golpe fuerte que causa daño crítico.',
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
    ult: { name: 'Ciclismo profesional', icon: 'hector_ult', cd: [90, 80, 70], mana: [100, 100, 100], windup: 0.7, dur: 1.3,
           desc: 'Se sube a su bicicleta y avanza a gran velocidad atravesando unidades. Deja una estela de fuego que causa daño físico y aturde a los enemigos que atraviesa.',
           dist: [560, 640, 720], dmg: [70, 110, 150], atkScale: 0.7, stun: [1.0, 1.3, 1.6], fireDmg: [18, 26, 34], fireTime: 3.2 },
  },
};

// small helper
export const rk = (arr, rank) => arr[Math.min(Math.max(rank, 1), arr.length) - 1];

// Targeting preview shown while aiming a power (first press/click), cast on the second click.
//  line: projectile trajectory | circle: area/range | wall: row of objects placed at the cursor
export function aimSpec(champ, key, rank, f) {
  const a = CHAMPIONS[champ].abilities[key];
  switch (champ + ':' + key) {
    case 'leandro:p1':  return { type: 'zone', max: a.range, radius: a.radius, color: 0x7dff5a };
    case 'leandro:p2':  return { type: 'trapezoid', length: 760, nearW: 70, farW: 560, color: 0xb0ff60 };
    case 'leandro:p3':  return { type: 'wall', min: 80, max: 260, count: 4, spacing: 44, color: 0x9ad7ff };
    case 'leandro:ult': return { type: 'circle', radius: 160, color: 0x66ffcc };
    case 'xeviche:p1':  return { type: 'line', range: 900, width: 56, color: 0xff5a4a };
    case 'xeviche:p2':  return { type: 'circle', radius: 70, color: 0x5dff8a };
    case 'xeviche:p3':  return { type: 'circle', radius: 70, color: 0x7ee0ff };
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
    case 'hector:ult':  return { type: 'line', range: rk(a.dist, rank), width: 80, color: 0xff7a3a };
    case 'axel:p1':     return { type: 'line', range: 900, width: 44, color: 0xc77dff };
    case 'axel:p2':     return { type: 'circle', radius: rk(a.radius, rank), color: 0x5dff8a };
    case 'axel:p3':     return { type: 'zone', max: a.range, radius: rk(a.radius, rank), color: 0x9a5cff };
    case 'axel:ult':    return { type: 'zone', max: a.range, radius: rk(a.radius, rank), color: 0xffd23f };
    case 'jorbi:p1':    return { type: 'trapezoid', length: a.length, nearW: a.nearW, farW: a.farW, color: 0x7dff8a };
    case 'jorbi:p2':    return { type: 'line', range: rk(a.dashDist, rank), width: 46, color: 0xffd23f };
    case 'jorbi:ult':   return { type: 'circle', radius: 95, color: 0x66d0ff };
    case 'xeviche:ult': return { type: 'circle', radius: rk(a.radius, rank), color: 0xff5a4a };
  }
  return { type: 'circle', radius: 80, color: 0xffffff };
}
