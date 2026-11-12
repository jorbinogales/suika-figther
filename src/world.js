import Phaser from 'phaser';
import { inkPath } from './julio.js';
import { CHAMPIONS, ABILITY_KEYS, MAX_RANK, COMBO_WINDOW, aimSpec, rk } from './data.js';
import { preloadVideos } from './versus.js';
import { Fighter, UNIT_DEFS, BODY_R, towerCircle, WORLD_W, WORLD_H, LANE_Y0, LANE_Y1, WALK_Y0, WALK_Y1, dist } from './fighter.js';
import { walk, GW, GH, CELL, cellWalk, walkField, grassField, isWalk as isWalkM, CAMP_SITES, laneYAt, LANE_HALF, RIVER, riverOffset, TOWER_XS, BASE_X, BASE_Y, F } from './mapdata.js';
import { Audio } from './audio.js';
import { runChampAi } from './ai.js';
import { bootScreen } from './bootscreen.js';
import { NetGame } from './netgame.js';
import { BOT } from './net.js';
import { botStart } from './launcher.js';
import { isWalk, OPEN } from './mapdata.js';
import { SurvivalMixin } from './survival.js';
import { BossMixin, laneUnitIgnoresBoss, recordBossAttacker, campCanAttack } from './bosses.js';


const ZOOM_MIN = 0.96, ZOOM_MAX = 1.4;   // default / farthest view = 80 % of the first closer view (1.2), closest = 1.4
const VIEW_H = 640;   // world units visible vertically at zoom 1 (zoom scales this to the window height)
const LANE_MID = BASE_Y;

// vfx sheets in public/assets/vfx (32px frames)
const VFX = ['energy_bolt', 'magic_missile', 'rock_throw', 'poison_dart', 'poison_cloud', 'heal', 'summon', 'shield', 'buff',
  'shockwave', 'punch', 'spark', 'block', 'poison_hit', 'levelup', 'run_dust', 'bullet_tracer', 'cannonball', 'plasma_shot', 'burning_ground', 'fire_trail'];
const ANIM_FPS = { idle: 6, walk: 10, run: 14, attack: 12, power1: 12, power2: 12, power3: 12, ult: 12, death: 8, destroy: 7, transform: 12, attack3: 12, dash: 14, power1b: 12, power2b_pull: 12, power2b_push: 12, power3b: 12, ultb: 12 };
const LOOPS = new Set(['idle', 'walk', 'run', 'puddle_move', 'flame', 'mg']);
// 8-direction sprites: sheets named <anim>_<dir> with dir in s/se/e/ne/n (sw/w/nw are the mirror of se/e/ne); looping cycles run at a fixed cycle time whatever their frame count
const DIR_SUFFIX = new Set(['s', 'se', 'e', 'ne', 'n']);
const CYCLE_SEC = { idle: 1.0, walk: 0.62, run: 0.46 };
const splitDir = a => { const i = a.lastIndexOf('_'); return i > 0 && DIR_SUFFIX.has(a.slice(i + 1)) ? [a.slice(0, i), a.slice(i + 1)] : [a, null]; };

// Top-down tileset crops (x, y, w, h) inside the 384px-wide sheets of resources/map/Nature v1.5
const CROPS = {
  trees:   { tree1: [0, 0, 100, 125], tree2: [100, 0, 100, 125], tree3: [205, 20, 65, 100], treeS1: [288, 0, 34, 64], treeS2: [322, 0, 34, 64] },
  bushes:  { bushA: [0, 4, 64, 48], bushB: [66, 4, 62, 48], bushC: [256, 4, 32, 28], bushD: [290, 4, 32, 28], bushE: [324, 4, 28, 24] },
  rocks:   { rockA: [0, 4, 62, 36], rockB: [64, 4, 62, 36], rockC: [128, 4, 62, 28], rockD: [258, 2, 32, 38], rockE: [292, 2, 30, 38], rockF: [324, 8, 26, 24] },
};
const TREES_BIG = ['tree1', 'tree2', 'tree3'], BUSHES = ['bushA', 'bushB', 'bushC', 'bushD', 'bushE'];
const ROCKS = ['rockA', 'rockB', 'rockC', 'rockD', 'rockE', 'rockF'];
const MAP_SCALE = 2;
const MINION_XP_SHARE = 0.3;   // XP of an allied champion that is near a minion killed by someone else (the killer gets 100 %)
const YR = 0.75;   // the map is seen at an angle: ground areas are ellipses squashed to this ratio, not perfect circles
const eDist = (ax, ay, bx, by) => Math.hypot(ax - bx, (ay - by) / YR);   // distance measured in that ellipse metric
const FOREST = ['wall1', 'wall2', 'wall3', 'tree1', 'tree2', 'tree3', 'tree4', 'bush1', 'bush2', 'trunk1', 'stone1', 'stone2', 'stone3', 'stone4', 'flower1', 'flower2', 'flower3', 'mush1', 'mush2', 'mush3', 'mush4', 'mush5', 'mush6'];
const LANE_YS_N = [0, 1, 2];
const CHAMP_ORDER = ['leandro', 'xeviche', 'jorbi', 'axel', 'julio', 'luis', 'eliud', 'hector', 'yonaiker', 'junior'];   // TAB cycles through these

// circular XP gauge around the level number: gold arc from 12 o'clock, full ring = level up
export function levelGauge(g, cx, cy, r, f, thick) {
  g.fillStyle(0x0b0f1a, 0.92).fillCircle(cx, cy, r + thick * 0.2);
  g.lineStyle(thick, 0x3a3320, 1).beginPath().arc(cx, cy, r - thick / 2, 0, Math.PI * 2).strokePath();
  if (f > 0.005) g.lineStyle(thick, f >= 1 ? 0x7ee0ff : 0xffd23f, 1).beginPath().arc(cx, cy, r - thick / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, f), false).strokePath();
}

const segDist = (x1, y1, x2, y2, cx, cy) => {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / l2)) : 0;
  return Math.hypot(cx - (x1 + t * dx), cy - (y1 + t * dy));
};
const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/* =========================== Boot =========================== */
export class Boot extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() {   // first load: only what the interface needs (the launcher is HTML). Champions, sounds and the map load when a match starts (Arena.preload)
    bootScreen.show(); this.load.on('progress', v => bootScreen.progress(v * 100, 'CARGANDO INTERFAZ...'));
    this.load.json('manifest', 'assets/sprites/manifest.json?' + Date.now());
    this.load.json('uilayout', 'assets/ui/layout.json?' + Date.now());
    this.load.json('sfx', 'assets/sfx/sfx.json?' + Date.now());
    this.load.json('voices', 'assets/voice/voices.json?' + Date.now());
    this.load.on('loaderror', f => { if (!/^(manifest|uilayout)/.test(f.key)) console.warn('missing', f.src); });
  }

  create() {
    const sp = (this.cache.json.get('manifest') || {}).sprites || {};
    if (BOT || location.hash) return this.finish(sp);   // test links and the server host need no videos
    // the champion videos load now, behind the loading screen, so the champion card and the VS screen show them at once
    (window.__swReady || Promise.resolve()).then(() => preloadVideos(Object.keys(CHAMPIONS), (i, n) => bootScreen.progress(100 * i / n, `CARGANDO VIDEOS... ${i}/${n}`))).finally(() => this.finish(sp));
  }

  finish(sprites) {
    this.registry.set('sprites', sprites);
    const h = new URLSearchParams(location.hash.slice(1));
    bootScreen.progress(100, 'LISTO');
    if (BOT) return botStart(this);   // server-side match host: joins its room and starts the arena when the server says so
    if (location.hash) setTimeout(() => bootScreen.hide(), 300);   // test links go straight into the arena
    if (!location.hash) this.scene.start('launcher');   // no test hash: launcher
    else this.scene.start('arena', { allies: h.get('allies') ? h.get('allies').split(',') : (+h.get('mode') > 1 ? ['luis', 'xeviche', 'julio', 'axel'].slice(0, +h.get('mode') - 1) : []), enemies: h.get('enemies') ? h.get('enemies').split(',') : (+h.get('mode') > 1 ? ['hector', 'jorbi', 'eliud', 'leandro', 'luis'].slice(0, +h.get('mode')) : null), player: h.get('char') || 'leandro', enemy: h.get('enemy'), team: +(h.get('team') || 0), training: !!h.get('train'), survival: !!h.get('surv'), haveSprites: sprites });
  }
}

/* =========================== Arena (world) =========================== */
export class Arena extends Phaser.Scene {
  constructor() { super('arena'); }

  init(data) {
    this.playerKey = data.player || 'leandro';
    this.allyKeys = data.allies || []; this.enemyKeys = data.enemies || (data.enemy ? [data.enemy] : null);
    this.enemyKey = data.enemy || null; this.myTeam = data.team || 0; this.training = !!data.training; this.survival = !!data.survival; OPEN.on = this.survival; this.sv = null;
    this.sprites = data.haveSprites || this.registry.get('sprites') || {};
    this.paused = false; this.over = null; this.feed = []; this.cfg = data; this.nidNext = 1000; this.byNid = new Map(); this.net = null;
    this.debugFree = false;
    this.bot = !!data.bot;   // headless match host on the server (?bot=): simulates for everyone, has no player, draws nothing
  }

  // champions that take part in this match (only their sprites, icons, portraits and sounds are loaded)
  matchChamps() {
    const c = this.cfg || {}, set = new Set([this.playerKey, ...(this.allyKeys || []), ...(this.enemyKeys || [])]);
    (c.roster || []).forEach(r => set.add(r.key)); if (this.enemyKey) set.add(this.enemyKey);
    return [...set].filter(k => CHAMPIONS[k]);
  }
  preload() {   // match loading screen: everything the match needs, nothing else
    const m = this.cache.json.get('manifest') || {}, t = Date.now(), all = !!this.bot, LD = this.load;
    // a second match in the same page: whatever is already loaded is not requested again
    const L = { on: (...a) => LD.on(...a), image: (k, u) => { if (!this.textures.exists(k)) LD.image(k, u); }, spritesheet: (k, u, c) => { if (!this.textures.exists(k)) LD.spritesheet(k, u, c); }, multiatlas: (k, j, p) => { if (!this.textures.exists(k)) LD.multiatlas(k, j, p); }, audio: (k, u) => { if (!this.cache.audio.exists(k)) LD.audio(k, u); } };
    const champs = this.matchChamps(), allKeys = Object.keys(CHAMPIONS), mine = k => champs.some(c => k === c || k.startsWith(c + '_')), isChampKey = k => allKeys.some(c => k === c || k.startsWith(c + '_'));
    const ok = k => all || !isChampKey(k) || mine(k);
    if (!this.bot) { bootScreen.show(); L.on('progress', v => bootScreen.progress(8 + v * 80)); L.on('filecomplete', k => bootScreen.progress(undefined, /^sfx_/.test(k) ? 'CARGANDO SONIDOS...' : /^(atl_)/.test(k) ? 'CARGANDO CAMPEONES Y UNIDADES...' : /^(item_|icon_|class_)/.test(k) ? 'CARGANDO HABILIDADES Y OBJETOS...' : 'CONSTRUYENDO EL MAPA...')); }
    champs.forEach(k => { L.image('face_' + k, `assets/concept/${k}_face.webp`); L.image('ref_' + k, `assets/ref_${k}.png`); });
    if (champs.includes('maduro')) L.image('ref_superbigote', 'assets/ref_superbigote.png');
    L.spritesheet('fist_progress', 'assets/objects/fist_progress_sheet.png', { frameWidth: 128, frameHeight: 128 });
    L.image('shadow', 'assets/map/shadow.png'); L.image('virtual_floor', 'assets/virtual_floor.png');
    ['blue', 'red', 'gold', 'blue_l', 'red_l', 'gold_l', 'gold_plain'].forEach(c => L.image('ui_hud_banner_' + c, `assets/ui/hud_banner_${c}.png?${t}`));
    ['hud_hero', 'hud_center', 'hud_minimap', 'hud_items', 'hud_stats', 'hud_enemy', 'hud_target', 'hud_kda', 'hud_score'].forEach(n => L.image('ui_' + n, `assets/ui/${n}.png?${t}`));
    L.spritesheet('ground', 'assets/map/ground.png', { frameWidth: 32, frameHeight: 32 }); L.spritesheet('details', 'assets/map/details.png', { frameWidth: 32, frameHeight: 32 });
    ['trees', 'bushes', 'rocks'].forEach(n => L.image(n, `assets/map/${n}.png`));
    L.image('f_trail', 'assets/map/forest/trail.png'); L.image('f_gt', 'assets/map/forest/gtrans.png');
    ['zap_a', 'zap_b'].forEach(n => L.spritesheet(n, `assets/vfx/${n}.png`, { frameWidth: 112, frameHeight: 112 }));
    ['sentry_robot_fire', 'turret_robot_fire', 'fence_h', 'fence_v'].forEach(n => L.image(n, `assets/objects/${n}.png?${t}`));
    FOREST.forEach(n => L.image('f_' + n, `assets/map/forest/${n}.png`));
    VFX.forEach(n => L.spritesheet('vfx_' + n, `assets/vfx/${n}.png`, { frameWidth: 32, frameHeight: 32 }));
    const sprites = m.sprites || {};
    for (const ch in sprites) if (ok(ch)) L.multiatlas('atl_' + ch, `assets/sprites/${ch}/atlas.json?${t}`, `assets/sprites/${ch}/`);   // one atlas per unit / selected champion
    (m.icons || []).forEach(n => { if (ok(n)) L.image('icon_' + n, `assets/icons/${n}.png?${t}`); });
    (m.classes || []).forEach(n => L.image('class_' + n, `assets/classes/${n}.png?${t}`));
    (m.flags || []).forEach(n => L.spritesheet('flag_' + n, `assets/flags/${n}.png?${t}`, { frameWidth: 128, frameHeight: 128 }));
    Object.entries(m.statics || {}).forEach(([n]) => L.spritesheet('st_' + n, `assets/statics/${n}.png?${t}`, { frameWidth: 192, frameHeight: 192 }));
    (m.stats || []).forEach(n => L.image('stat_' + n, `assets/stats/${n}.png?${t}`));
    (m.items || []).forEach(n => L.image('item_' + n, `assets/items/${n}.png?${t}`));
    (m.aim || []).forEach(n => L.image(n, `assets/aim/${n}.png?${t}`));
    (m.objects || []).forEach(n => { if (n !== 'fist_progress') L.image(n, `assets/objects/${n}.png?${t}`); });
    // sounds: the common ones plus those of the champions in the match
    const sfx = this.cache.json.get('sfx') || {}, files = new Set();
    for (const name in sfx) { const owner = allKeys.find(c => new RegExp('(^|_)' + c + '(_|$)').test(name)); if (all || !owner || champs.includes(owner)) sfx[name].forEach(f => files.add(f)); }
    files.forEach(f => L.audio('sfx_' + f, 'assets/sfx/' + f));
    const vo = this.cache.json.get('voices') || {};   // champion voices (only those in the match)
    for (const c in vo) if (all || champs.includes(c)) vo[c].forEach(e => L.audio(`vo_${c}_${e}`, `assets/voice/${c}/${e}.mp3?${t}`));
  }
  setupAssets() {   // animations of what was loaded, tile crops
    const m = this.cache.json.get('manifest') || {}, sprites = m.sprites || {}, A = this.anims;
    VFX.forEach(n => { if (this.textures.exists('vfx_' + n) && !A.exists('vfx_' + n)) A.create({ key: 'vfx_' + n, frames: A.generateFrameNumbers('vfx_' + n), frameRate: 18, repeat: -1 }); });
    for (const ch in sprites) {
      if (!this.textures.exists('atl_' + ch)) continue;
      for (const a in sprites[ch]) {
        if (A.exists(`${ch}_${a}`)) continue;
        const [base, dir] = splitDir(a), frames = A.generateFrameNames('atl_' + ch, { prefix: `${a}/`, start: 0, end: sprites[ch][a] - 1 });
        A.create({ key: `${ch}_${a}`, frames, frameRate: dir && CYCLE_SEC[base] ? frames.length / CYCLE_SEC[base] : ANIM_FPS[base] || 10, repeat: LOOPS.has(base) ? -1 : 0 });
        if (a === 'ultb') A.create({ key: `${ch}_ultb_loop`, frames: A.generateFrameNames('atl_' + ch, { prefix: 'ultb/', start: 2, end: sprites[ch][a] - 1 }), frameRate: 9, repeat: -1 });   // Filtraciones: from the 3rd frame on
      }
      if (sprites[ch].walk && !sprites[ch].idle && !A.exists(`${ch}_idle`)) A.create({ key: `${ch}_idle`, frames: [{ key: 'atl_' + ch, frame: 'walk/0' }], frameRate: 1, repeat: -1 });
    }
    ['zap_a', 'zap_b'].forEach(n => { if (this.textures.exists(n) && !A.exists(n)) A.create({ key: n, frames: A.generateFrameNumbers(n), frameRate: 16, repeat: -1 }); });
    for (const fl of (m.flags || [])) if (this.textures.exists('flag_' + fl) && !A.exists('flag_' + fl)) A.create({ key: 'flag_' + fl, frames: A.generateFrameNumbers('flag_' + fl), frameRate: 8, repeat: -1 });
    for (const sheet in CROPS) for (const n in CROPS[sheet]) { const tx = this.textures.get(sheet); if (!tx.has(n)) tx.add(n, 0, ...CROPS[sheet][n]); }
  }

  get pc() { return this.ctrl && this.ctrl.alive ? this.ctrl : this.player; }

  hasAnims(key) { const a = this.sprites[key]; return !!a && !!(a.idle || a.walk); }

  create() {
    this.setupAssets();
    this.time.paused = false; this.tweens.resumeAll(); this.anims.resumeAll(); this.floatN = 0;
    this.fighters = []; this.projs = []; this.obstacles = []; this.cages = []; this.tireShots = []; this.fireZones = []; this.audio = new Audio(this); this.audio.music('music_game'); this.events.once('shutdown', () => { this.audio.stopMusic(); this.audio.clearVoice(); }); this.timers = []; this.zones = []; this.castCtx = null; this.mortars = []; this.chains = []; this.eggs = []; this.spears = []; this.packages = []; this.grenades = []; this.towerRings = new Map(); this.control = null; this.ctrl = null; this.aimObjs = {}; this.rangeObjs = {}; this.gfx = null;
    this.rangeG = this.add.graphics();
    this.buildPlaceholderTextures();
    if (!this.bot) this.buildMap();   // the headless host needs no scenery (it is pure decoration)
    this.buildBushes();

    const my = this.myTeam, dflt = CHAMP_ORDER[(CHAMP_ORDER.indexOf(this.playerKey) + 1) % CHAMP_ORDER.length];
    const enemyKeys = this.enemyKeys && this.enemyKeys.length ? this.enemyKeys : [this.enemyKey || dflt], allyKeys = this.training ? [] : this.allyKeys;
    this.laneY = LANE_MID;
    // spawn slots: staggered across the lane at each base (training zone: both at the map center)
    const pos = (team, i, n) => {
      if (this.training) return { x: WORLD_W / 2 + (team === 0 ? -140 : 140), y: LANE_MID };
      if (this.survival) return { x: WORLD_W / 2, y: WORLD_H / 2 };
      const dirx = team === 0 ? 1 : -1, bx = team === 0 ? BASE_X + 170 : WORLD_W - BASE_X - 170;   // spawn / respawn / recall point: inside the base's healing + shop circle, next to the nexus
      return { x: bx + (i % 2) * 70 * dirx, y: Phaser.Math.Clamp(LANE_MID + (i - (n - 1) / 2) * 76, LANE_MID - 250, LANE_MID + 250) };
    };
    const myN = allyKeys.length + 1, enN = enemyKeys.length, pm = pos(my, 0, myN);
    if (this.cfg.roster) this.buildRoster(pos);
    else {
    this.player = new Fighter(this, this.playerKey, my, pm.x, pm.y);
    this.allies = allyKeys.map((k, i) => { const q = pos(my, i + 1, myN); const f = new Fighter(this, k, my, q.x, q.y, { ai: true }); f.aiLane = (i % 3) - 1; return f; });
    this.enemies = this.survival ? [] : enemyKeys.map((k, i) => { const q = pos(1 - my, i, enN); const f = new Fighter(this, k, 1 - my, q.x, q.y, { ai: true }); f.aiLane = (i % 3) - 1; return f; });
    this.enemy = this.enemies[0] || this.player;   // survival: no rival champions
    this.champs = [this.player, ...this.allies, ...this.enemies];
    }
    this.fighters.push(...this.champs);
    if (!this.training && !this.survival) {
    // nexus of each side + towers (middle lane: 2 each; top and bottom lanes: 1 each)
      this.fighters.push(new Fighter(this, 'nexus_blue', 0, BASE_X, LANE_MID), new Fighter(this, 'nexus_red', 1, WORLD_W - BASE_X, LANE_MID));
      this.fountains = [0, 1].map(t => ({ x: t === 0 ? BASE_X : WORLD_W - BASE_X, y: LANE_MID, team: t })); this.fountG = this.add.graphics().setDepth(-996);
      LANE_YS_N.forEach(li => [0, 1].forEach(t => {   // every lane: two towers per team; the inner (last) one heals allies and is immune while the outer one stands
        const X = x => t === 0 ? x : WORLD_W - x, key = t === 0 ? 'tower_blue' : 'tower_red';
        const outer = new Fighter(this, key, t, X(TOWER_XS[0]), laneYAt(li, TOWER_XS[0]) - 40, { ai: true }), inner = new Fighter(this, key, t, X(TOWER_XS[1]), laneYAt(li, TOWER_XS[1]) - 40, { ai: true });
        outer.laneI = inner.laneI = li; inner.inner = true; inner.wallRef = outer; this.fighters.push(outer, inner);
      }));
      this.fighters.filter(f => f.isTower).forEach((t, i) => this.setNid(t, 200 + i));   // structures: same id on every client
    }
    this.waveT = 4; this.waveN = 0; this.gameT = 0; this.firstBlood = false; this.streaks = new Map();
    if (!this.training && !this.survival) this.after(1.2, () => this.audio.voice('v_welcome', 1, 'ann_goodluck', { title: '¡QUE COMIENCE EL COMBATE!', sub: 'Bienvenidos, campeones', team: 2 }));
    if (this.training) {   // training zone: level 12, 12 skill points to spend, free mana/cooldowns, a passive dummy, no waves
      this.waveT = 1e9; this.debugFree = true; this.player.gold = 99999;
      for (let i = 1; i < 12; i++) this.player.levelUp();
      this.player.hp = this.player.maxHp; this.player.xp = 0;
      this.enemy.ai = false; this.enemy.x = this.enemy.spawn.x = this.player.x + (my === 0 ? 420 : -420); this.enemy.setAim(-this.player.ax, 0);
    }
    if (this.survival) { this.waveT = 1e9; this.survInit(); }
    if (!this.survival) this.bossInit();
    this.aiOn = true; this.mouseSeen = false; this.aimKey = null; this.selected = null; this.prevLeft = this.prevRight = false;
    this.aimG = this.add.graphics().setDepth(99990);

    const cam = this.cameras.main;
    this.camTarget = { x: this.player.x, y: this.player.y };
    cam.setBounds(0, -340, WORLD_W, WORLD_H + 340 + 120);   // the view may go past the top (and a bit past the bottom) of the map, so units at the edges are not hidden behind the HUD
    cam.startFollow(this.camTarget, true, 0.12, 0.12);
    this.zoom = 0; this.zoomK = ZOOM_MIN;   // wheel zoom: ZOOM_MIN (default, cannot zoom out past it) .. ZOOM_MAX, relative to the old view
    this.input.on('wheel', (p, o, dx, dy) => { if (!this.scene.get('hud')?.shopOpen) this.zoomK = Phaser.Math.Clamp(this.zoomK * (dy > 0 ? 0.92 : 1.087), ZOOM_MIN, ZOOM_MAX); });

    this.input.setDefaultCursor('crosshair');
    this.input.on('pointermove', () => (this.mouseSeen = true));
    this.clickQ = 0; this.clickQT = 0; this.input.on('pointerdown', ptr => { if (ptr.button === 0) { this.clickQ = Math.min(3, (this.time.now - this.clickQT < 600 ? this.clickQ : 0) + 1); this.clickQT = this.time.now; } });   // basic attack clicks are queued here (polling isDown loses a fast tap)
    this.input.mouse?.disableContextMenu();
    this.buildKeys();
    this.setupFog();
    this.setupCamps();
    this.setupNet();
    this.debugScenario();
    if (!this.bot && !this.scene.isActive('hud')) this.scene.launch('hud');
    this.game.events.emit('arena-ready');   // the launcher's loading screen waits for this
    if (!this.cfg.roster && !this.bot) bootScreen.hide();   // practice / test links: the loading screen ends here (online matches end it on 'go')
  }

  /* ---------- fog of war ----------
     Enemy units are only shown while one of your units sees them (sight radius per unit type). The whole map is known (dimmed outside your sight).
     A 128x60 canvas (25 world units per texel, smoothly scaled) is the overlay; the same texture dims the minimap. Off in the training zone (and with #nofog). */
  setupFog() {
    this.fogOn = !this.training && !this.survival && !this.bot && !new URLSearchParams(location.hash.slice(1)).has('nofog'); this.fog = null;
    if (!this.fogOn) return;
    const FW = 256, FH = 120;   // 12.5 world units per texel
    if (this.textures.exists('fogmask')) this.textures.remove('fogmask');
    const tex = this.textures.createCanvas('fogmask', FW, FH); tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.fog = { FW, FH, cw: WORLD_W / FW, ch: WORLD_H / FH, explored: new Uint8Array(FW * FH).fill(1), tex, t: 0, img: this.add.image(0, 0, 'fogmask').setOrigin(0, 0).setDisplaySize(WORLD_W, WORLD_H).setDepth(90000) };
    this.updateFog(1, true);
  }
  sees(a, b) {   // line of sight: nobody sees through the non-walkable terrain (forest)
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), n = Math.ceil(d / 48);
    for (let k = 1; k < n; k++) if (!isWalkM(a.x + dx * k / n, a.y + dy * k / n)) return false;
    return true;
  }
  sightOf(f) { return f.sight ? f.sight : f.sentinel ? 720 : f.isNexus ? 900 : f.isTower ? 850 : f.isChamp ? 820 : f.isBot ? 520 : 560; }
  updateFog(dt, force) {
    const F = this.fog; if (!F) return;
    if ((F.t -= dt) > 0 && !force) return; F.t = 0.06;
    const team = this.pc.team, src = this.fighters.filter(f => f.alive && !f.away && f.team === team).concat((this.sentinels || []).filter(q => q.team === team).map(q => ({ x: q.x, y: q.y, team, sentinel: true }))).concat(this.pc.bomber?.phase === 'fly' ? [{ x: this.pc.bomber.pt.x, y: this.pc.bomber.pt.y, team, sight: 520 }] : []), { FW, FH, cw, ch, explored } = F;
    for (const f of this.fighters) if (f.revealT > 0 && f.alive && f.team !== team && f.revealBy === team) src.push({ x: f.x, y: f.y, team, sight: f.revealSight || 230, reveal: true });   // Leandro's leaks: a small circle of sight around each revealed enemy
    // explore the ground around every unit of ours
    for (const s of src) {
      const r = this.sightOf(s) * 0.92, i0 = Math.max(0, Math.floor((s.x - r) / cw)), i1 = Math.min(FW - 1, Math.floor((s.x + r) / cw)), j0 = Math.max(0, Math.floor((s.y - r) / ch)), j1 = Math.min(FH - 1, Math.floor((s.y + r) / ch));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot((i + 0.5) * cw - s.x, (j + 0.5) * ch - s.y) <= r) explored[j * FW + i] = 1;
    }
    // who do we see? enemy units inside any sight circle; enemy structures once their ground has been explored
    for (const f of this.fighters) {
      if (f.team === team) { f.fogHidden = false; continue; }
      if (f.isTower) { f.fogHidden = !explored[Math.min(FH - 1, Math.floor(f.y / ch)) * FW + Math.min(FW - 1, Math.floor(f.x / cw))]; continue; }
      f.fogHidden = !src.some(s => Math.hypot(s.x - f.x, s.y - f.y) <= this.sightOf(s) && this.sees(s, f));
    }
    if (this.selected?.fogHidden) this.selected = null;
    // paint the overlay: dark where unexplored, dimmed where explored, clear inside the sight circles
    const ctx = F.tex.getContext(), id = ctx.createImageData(FW, FH), d = id.data;
    for (let i = 0; i < FW * FH; i++) { d[i * 4] = 3; d[i * 4 + 1] = 6; d[i * 4 + 2] = 14; d[i * 4 + 3] = explored[i] ? 118 : 242; }
    ctx.globalCompositeOperation = 'source-over'; ctx.putImageData(id, 0, 0); ctx.globalCompositeOperation = 'destination-out';
    for (const s of src) { const x = s.x / cw, y = s.y / ch, r = this.sightOf(s) / cw, g = ctx.createRadialGradient(x, y, r * 0.7, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over'; F.tex.refresh();
  }

  // ---- online matches (see netgame.js) ----
  setNid(f, id) { this.byNid.delete(f.nid); f.nid = id; this.byNid.set(id, f); }
  // roster = canonical list of every champion [{key, team, pid|null}] (identical on all clients): ids are the roster index
  buildRoster(pos) {
    const c = this.cfg, R = c.roster, n = Math.max(R.filter(r => r.team === 0).length, R.filter(r => r.team === 1).length), online = R.filter(r => r.pid != null).length > 1, client = online && c.me !== c.hostId, seen = [0, 0];
    this.champs = R.map((r, i) => {
      const q = pos(r.team, seen[r.team]++, n), f = new Fighter(this, r.key, r.team, q.x, q.y, { ai: r.pid == null && !client });
      f.pid = r.pid; f.aiLane = (i % 3) - 1; this.setNid(f, i); return f;
    });
    this.player = this.champs.find(f => f.pid === c.me) || this.champs[0];
    this.allies = this.champs.filter(f => f !== this.player && f.baseTeam === this.player.baseTeam);
    this.enemies = this.champs.filter(f => f.baseTeam !== this.player.baseTeam);
    this.enemy = this.enemies[0];
    this.champs = [this.player, ...this.allies, ...this.enemies];
  }
  setupNet() {
    const c = this.cfg; if (!c.roster || c.roster.filter(r => r.pid != null).length < 2) return;
    this.net = new NetGame(this, c.me === c.hostId ? 'host' : 'client', c.hostId);
    window.__arena = this; this.events.once('shutdown', () => { this.net?.destroy(); this.net = null; });
  }

  // test hook: index.html#lvl=12&rank=3&cast=p1,ult&gap=250&char=xeviche&noai=1  (headless screenshots)
  debugScenario() {
    const h = new URLSearchParams(location.hash.slice(1));
    if (!h.size) return;
    window.__arena = this;   // test hook
    const p = this.player, e = this.enemy;
    for (let i = 1; i < +(h.get('lvl') || 1); i++) p.levelUp();
    const brs = h.get('br') || '';   // #br=1010: second branch for p1 / p2 / p3 / ult
    ABILITY_KEYS.forEach((a, i) => { while (p.canSpend(a) && p.ranks[a] < (+h.get('rank') || 1)) p.spend(a, brs[i] === '1' ? 1 : 0); });
    if (h.get('px') && !h.get('keep')) p.x = p.spawn.x = +h.get('px');
    if (h.get('wave')) this.waveT = +h.get('wave');
    if (!h.get('keep')) { e.x = e.spawn.x = p.x + +(h.get('gap') || 260);
    e.y = e.spawn.y = p.y + +(h.get('dy') || 0); }
    if (h.get('killtower')) this.after(0.8, () => this.fighters.filter(f => f.isTower).forEach(f => this.damage(null, f, 99999, 'true')));
    if (h.get('noai')) this.aiOn = false;
    (h.get('cast') || '').split(',').filter(Boolean).forEach((a, i) =>
      this.after(0.3 + i * 1.2, () => { p.setAim(e.x - p.x, e.y - p.y); a === 'basic' ? p.tryBasic() : p.tryCast(a); }));
  }

  /* ---------- placeholder art (replaced by assets/objects/<name>.png when present) ---------- */
  buildPlaceholderTextures() {
    if (!this.textures.exists('comb_wave0')) {   // Leandro's comb wave: a detailed animated crescent (glowing body with a white core, inner streaks, speed trail and sparks), blue-green and red versions
      const PAL = { n: { core: '#ffffff', mid: '#7fffe6', out: 'rgba(40,200,220,0.25)', glow: '#3ee8d0', streak: 'rgba(255,255,255,0.85)', trail: '90,240,225' }, r: { core: '#fff2e0', mid: '#ff7a55', out: 'rgba(200,30,30,0.3)', glow: '#ff2a2a', streak: 'rgba(255,230,200,0.85)', trail: '255,90,70' } };
      const W = 170, H = 130, A = 1.05, rnd = rng(5);
      for (const k of ['n', 'r']) {
        const pal = PAL[k];
        for (let f = 0; f < 6; f++) {
          const t = this.textures.createCanvas(`comb_wave${k === 'r' ? 'R' : ''}${f}`, W, H), x = t.getContext(), cx0 = 20, cy = H / 2, rx = 112, ry = 52, T = 38 + 8 * Math.sin(f / 6 * Math.PI * 2);
          const out = a => ({ x: cx0 + rx * Math.cos(a), y: cy + ry * Math.sin(a) }), th = a => T * Math.cos(a / A * Math.PI / 2);
          x.clearRect(0, 0, W, H);
          for (let i = 0; i < 7; i++) { const a = (rnd() * 2 - 1) * A * 0.85, o = out(a), len = 22 + rnd() * 40; const g = x.createLinearGradient(o.x - len - th(a), 0, o.x - th(a), 0); g.addColorStop(0, `rgba(${pal.trail},0)`); g.addColorStop(1, `rgba(${pal.trail},0.7)`); x.strokeStyle = g; x.lineWidth = 2; x.beginPath(); x.moveTo(o.x - len - th(a), o.y); x.lineTo(o.x - th(a), o.y); x.stroke(); }   // speed trail
          x.save(); x.shadowColor = pal.glow; x.shadowBlur = 16;
          const g = x.createLinearGradient(cx0 + rx - T, 0, cx0 + rx + 2, 0); g.addColorStop(0, pal.out); g.addColorStop(0.55, pal.mid); g.addColorStop(1, pal.core); x.fillStyle = g;
          x.beginPath(); for (let i = 0; i <= 28; i++) { const a = -A + 2 * A * i / 28, o = out(a); i ? x.lineTo(o.x, o.y) : x.moveTo(o.x, o.y); }
          for (let i = 28; i >= 0; i--) { const a = -A + 2 * A * i / 28, o = out(a); x.lineTo(o.x - th(a), o.y); } x.closePath(); x.fill(); x.restore();
          x.lineCap = 'round'; x.strokeStyle = pal.streak;   // inner streaks following the crescent
          for (let j = 0; j < 3; j++) { const u = 0.35 + 0.22 * j + 0.05 * Math.sin(f + j * 2), a0 = -A * (0.8 - 0.1 * j) + 0.15 * Math.sin(f * 1.3 + j), a1 = A * (0.8 - 0.1 * j) + 0.15 * Math.cos(f * 1.1 + j); x.lineWidth = 2 - j * 0.4; x.beginPath(); for (let i = 0; i <= 16; i++) { const a = a0 + (a1 - a0) * i / 16, o = out(a), tt = th(a); i ? x.lineTo(o.x - tt * u, o.y) : x.moveTo(o.x - tt * u, o.y); } x.stroke(); }
          for (let i = 0; i < 9; i++) { const a = (rnd() * 2 - 1) * A, o = out(a), dx = 4 + rnd() * 18, dy = (rnd() - 0.5) * 22, sz = 2 + (rnd() < 0.3 ? 1 : 0); x.fillStyle = rnd() < 0.5 ? pal.core : pal.mid; x.fillRect(o.x + dx, o.y + dy, sz, sz); }   // sparks
          t.refresh();
        }
        this.anims.create({ key: `comb_wave_fx${k === 'r' ? '_red' : ''}`, frames: Array.from({ length: 6 }, (_, f) => ({ key: `comb_wave${k === 'r' ? 'R' : ''}${f}` })), frameRate: 14, repeat: -1 });
      }
    }
    const mk = (key, w, h, draw) => {
      if (this.textures.exists(key)) return;
      if (this.bot) { this.textures.createCanvas(key, w, h); return; }   // headless host: no renderer to draw with; the key just has to exist
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      draw(g); g.generateTexture(key, w, h); g.destroy();
    };
    mk('roach', 40, 24, g => {   // Maduro's cockroach: brown oval body, head, legs and antennae, facing right
      g.lineStyle(2, 0x2a1608).beginPath().moveTo(12, 10).lineTo(6, 3).moveTo(18, 10).lineTo(18, 2).moveTo(24, 10).lineTo(30, 3).moveTo(12, 15).lineTo(6, 22).moveTo(18, 16).lineTo(18, 23).moveTo(24, 15).lineTo(30, 22).moveTo(33, 11).lineTo(39, 5).moveTo(33, 13).lineTo(39, 17).strokePath();
      g.fillStyle(0x2a1608).fillEllipse(19, 13, 28, 17).fillCircle(31, 13, 7); g.fillStyle(0x7a3f14).fillEllipse(19, 13, 25, 14).fillCircle(31, 13, 5); g.fillStyle(0xb8742a).fillEllipse(17, 11, 14, 5);
    });
    for (const [key, up] of [['bird_a', true], ['bird_b', false]]) mk(key, 34, 28, g => {   // stun bird: chubby yellow chick facing right, wings up / down
      g.fillStyle(0x1a1208).fillTriangle(0, 13, 11, 8, 11, 18).fillEllipse(15, 16, 23, 17).fillCircle(23, 10, 9).fillTriangle(29, 8, 34, 11, 29, 14);   // outlines: tail, body, head, beak
      g.fillStyle(0xffd23f).fillTriangle(2, 13, 11, 10, 11, 17).fillEllipse(15, 16, 19, 13).fillCircle(23, 10, 7);
      g.fillStyle(0xfff0a0).fillEllipse(16, 19, 12, 6);   // belly
      g.fillStyle(0xff7a2a).fillTriangle(29, 9, 33, 11, 29, 13);   // beak
      g.fillStyle(0xffffff).fillCircle(25, 8, 2.4); g.fillStyle(0x111111).fillCircle(25.8, 8, 1.2);   // eye
      g.fillStyle(0xff7a2a).fillRect(12, 24, 2, 3).fillRect(18, 24, 2, 3);   // feet
      if (up) { g.fillStyle(0x1a1208).fillTriangle(5, 14, 11, 0, 18, 14); g.fillStyle(0xffffff).fillTriangle(7, 14, 11, 3, 16, 14); g.fillStyle(0x9fd0ff).fillTriangle(9, 7, 11, 3, 13, 8); }
      else { g.fillStyle(0x1a1208).fillTriangle(6, 14, 12, 27, 19, 17); g.fillStyle(0xffffff).fillTriangle(8, 15, 12, 24, 17, 17); g.fillStyle(0x9fd0ff).fillTriangle(10, 21, 12, 24, 14, 20); }
    });
    mk('icon_wound', 48, 48, g => {   // wound (anti-heal): a BROKEN heart (two halves with a zigzag crack) on a dark tile
      g.fillStyle(0x1a0808).fillRect(0, 0, 48, 48).lineStyle(2, 0xff5a5a).strokeRect(1, 1, 46, 46);
      g.fillStyle(0xd62828).fillCircle(15, 19, 9).fillTriangle(6, 22, 26, 22, 22, 41).fillTriangle(6, 22, 22, 41, 20, 24).fillRect(6, 19, 17, 4);   // left half
      g.fillStyle(0xd62828).fillCircle(33, 21, 9).fillTriangle(42, 24, 24, 26, 28, 43).fillRect(24, 21, 18, 4);                                         // right half, slightly lower and apart
      g.fillStyle(0xff8a8a).fillCircle(12, 16, 3.5).fillCircle(31, 18, 3.5);
      g.lineStyle(3, 0x1a0808).lineBetween(25, 8, 21, 18).lineBetween(21, 18, 27, 24).lineBetween(27, 24, 22, 32).lineBetween(22, 32, 26, 45);
    });
    const eye = (g, cx, cy, k) => {   // a crossed-out eye (blindness): white almond, violet iris, red slash
      g.fillStyle(0xf4f0ff).fillEllipse(cx, cy, 34 * k, 19 * k).fillStyle(0x7a3cff).fillCircle(cx, cy, 7.5 * k).fillStyle(0x120620).fillCircle(cx, cy, 3.6 * k).fillStyle(0xffffff).fillCircle(cx - 2.5 * k, cy - 2.5 * k, 1.6 * k);
      g.lineStyle(7 * k, 0x120620).lineBetween(cx - 15 * k, cy + 14 * k, cx + 15 * k, cy - 14 * k).lineStyle(3.5 * k, 0xff3b5c).lineBetween(cx - 15 * k, cy + 14 * k, cx + 15 * k, cy - 14 * k);
    };
    mk('icon_blind', 48, 48, g => { g.fillStyle(0x14081f).fillRect(0, 0, 48, 48).lineStyle(2, 0xb070ff).strokeRect(1, 1, 46, 46); eye(g, 24, 24, 1.15); });   // status icon: blinded eye
    mk('blind_eye', 44, 36, g => eye(g, 22, 18, 1));   // floats over a blinded champion
    mk('icon_yonaiker_gun', 48, 48, g => {   // Yonaiker's machine gun (Q, aboard): a crosshair with a red-tipped pointer on a dark tile
      g.fillStyle(0x0c1220).fillRect(0, 0, 48, 48).lineStyle(2, 0xff4a3a).strokeRect(1, 1, 46, 46);
      g.lineStyle(3, 0xe8eefc).strokeCircle(24, 26, 13).lineStyle(2, 0xe8eefc).lineBetween(24, 15, 24, 37).lineBetween(13, 26, 35, 26);
      g.fillStyle(0xff2a1a).fillTriangle(24, 3, 17, 15, 31, 15).fillStyle(0xffb0a0).fillTriangle(24, 6, 21, 12, 27, 12);
      g.fillStyle(0xffd23f).fillRect(9, 40, 3, 5).fillRect(22, 41, 3, 5).fillRect(35, 40, 3, 5);
    });
    mk('bullet_td', 4, 9, g => { g.fillStyle(0xffd23f, 0.35).fillRect(1, 4, 2, 5); g.fillStyle(0xfff1a8).fillRect(1, 1, 2, 5); g.fillStyle(0xffffff).fillRect(1, 0, 2, 2); });   // top-down 8x8-style pixel bullet with a yellow trail
    mk('icon_charm', 48, 48, g => {   // charm (Xeviche's heart lure): a pink heart on a dark magenta tile
      g.fillStyle(0x240812).fillRect(0, 0, 48, 48).lineStyle(2, 0xff5a9a).strokeRect(1, 1, 46, 46);
      g.fillStyle(0xb81c52).fillCircle(16, 19, 10).fillCircle(32, 19, 10).fillTriangle(6, 23, 42, 23, 24, 43);
      g.fillStyle(0xff4d8d).fillCircle(16, 19, 8).fillCircle(32, 19, 8).fillTriangle(8, 23, 40, 23, 24, 40);
      g.fillStyle(0xffb3cf).fillCircle(12, 16, 3.5).fillCircle(29, 16, 3);
    });
    mk('icon_slow', 48, 48, g => {   // slow: an ice crystal / snowflake on a dark blue tile
      g.fillStyle(0x08162a).fillRect(0, 0, 48, 48).lineStyle(2, 0x7ee0ff).strokeRect(1, 1, 46, 46);
      g.lineStyle(5, 0x2f8fd8); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.lineBetween(24 - Math.cos(a) * 18, 24 - Math.sin(a) * 18, 24 + Math.cos(a) * 18, 24 + Math.sin(a) * 18); }
      g.lineStyle(2.5, 0xe9fbff); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.lineBetween(24 - Math.cos(a) * 18, 24 - Math.sin(a) * 18, 24 + Math.cos(a) * 18, 24 + Math.sin(a) * 18); }
      g.fillStyle(0xbdf2ff).fillRect(21, 21, 6, 6);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, x = 24 + Math.cos(a) * 18, y = 24 + Math.sin(a) * 18; g.fillStyle(0xe9fbff).fillTriangle(x + Math.cos(a) * 4, y + Math.sin(a) * 4, x - Math.sin(a) * 3, y + Math.cos(a) * 3, x + Math.sin(a) * 3, y - Math.cos(a) * 3); }
    });
    mk('icon_burn', 48, 48, g => {   // burn: a red-orange flame on a dark red tile (different from the green poison droplet)
      g.fillStyle(0x240a08).fillRect(0, 0, 48, 48).lineStyle(2, 0xff5a2a).strokeRect(1, 1, 46, 46);
      g.fillStyle(0xb81c10).fillTriangle(24, 3, 8, 30, 40, 30).fillCircle(24, 31, 15).fillTriangle(10, 20, 15, 8, 20, 22).fillTriangle(28, 22, 33, 8, 38, 20);
      g.fillStyle(0xff5a1c).fillTriangle(24, 8, 13, 30, 35, 30).fillCircle(24, 32, 12);
      g.fillStyle(0xffb347).fillTriangle(24, 17, 17, 33, 31, 33).fillCircle(24, 34, 8);
      g.fillStyle(0xfff1a8).fillTriangle(24, 25, 20, 37, 28, 37).fillCircle(24, 37, 4);
    });
    mk('icon_poison', 48, 48, g => {   // poison: green droplet with a skull on a dark tile
      g.fillStyle(0x0c1a0a).fillRect(0, 0, 48, 48).lineStyle(2, 0x7be05a).strokeRect(1, 1, 46, 46);
      g.fillStyle(0x2f8f2a).fillTriangle(24, 5, 11, 26, 37, 26).fillCircle(24, 28, 13);
      g.fillStyle(0x7be05a).fillTriangle(24, 8, 14, 26, 34, 26).fillCircle(24, 28, 10);
      g.fillStyle(0xe9ffe0).fillRect(19, 22, 10, 9).fillRect(21, 31, 6, 3).fillStyle(0x0c1a0a).fillRect(20, 25, 3, 3).fillRect(26, 25, 3, 3).fillRect(23, 30, 2, 2);
    });
    mk('icon_invul', 48, 48, g => {   // invulnerability: a yellow aura rising from a ground ring around a small figure
      g.fillStyle(0x1a1405).fillRect(0, 0, 48, 48).lineStyle(2, 0xffd23f).strokeRect(1, 1, 46, 46);
      [[10, 14], [17, 22], [24, 28], [31, 22], [38, 14]].forEach(([x, h], i) => { g.fillStyle(i === 2 ? 0xfff0a0 : 0xffd23f, 0.9).fillTriangle(x - 4, 38, x + 4, 38, x, 38 - h - 8); });
      g.fillStyle(0x0a0a0a).fillRect(21, 16, 6, 6).fillRect(20, 22, 8, 12).fillStyle(0xffe27a).fillRect(22, 17, 4, 4).fillRect(21, 23, 6, 10);
      g.lineStyle(3, 0xffd23f).strokeEllipse(24, 38, 34, 10); g.lineStyle(1, 0xfff0a0).strokeEllipse(24, 38, 30, 7);
    });
    mk('bill', 20, 10, g => { g.fillStyle(0x2f8f3f).fillRect(0, 0, 20, 10).fillStyle(0x7fdc8a).fillRect(2, 2, 16, 6).fillStyle(0x2f8f3f).fillRect(8, 3, 4, 4); });
    mk('chain_hook', 20, 10, g => { g.fillStyle(0x222222).fillRect(0, 3, 14, 4).fillRect(10, 0, 6, 10); g.fillStyle(0x888888).fillRect(12, 2, 6, 6); });
    mk('chain_link', 10, 6, g => { g.fillStyle(0x333333).fillRect(0, 1, 10, 4); g.fillStyle(0x777777).fillRect(2, 2, 6, 2); });
    mk('egg', 12, 16, g => { g.fillStyle(0x111111).fillRect(2, 0, 8, 16).fillRect(0, 3, 12, 10); g.fillStyle(0xf5ecd0).fillRect(3, 1, 6, 14).fillRect(1, 4, 10, 8); });
    mk('egg_grenade', 20, 26, g => { g.fillStyle(0x111111).fillRect(4, 0, 12, 26).fillRect(0, 6, 20, 14); g.fillStyle(0xf5ecd0).fillRect(5, 2, 10, 22).fillRect(1, 7, 18, 12); g.fillStyle(0xff9a2e).fillRect(1, 12, 18, 3); });
    mk('egg_trap', 14, 12, g => { g.fillStyle(0x111111).fillRect(1, 0, 12, 12); g.fillStyle(0xf5ecd0).fillRect(2, 1, 10, 10); g.fillStyle(0xff9a2e).fillRect(6, 0, 2, 3); });
    mk('spear', 60, 8, g => { g.fillStyle(0x6b4a2a).fillRect(0, 3, 50, 2); g.fillStyle(0xc9d3df).fillRect(50, 1, 10, 6); g.fillStyle(0xd23b3b).fillRect(6, 0, 8, 3); });
    mk('spear_stuck', 24, 48, g => { g.fillStyle(0x6b4a2a).fillRect(10, 8, 3, 40); g.fillStyle(0xc9d3df).fillRect(8, 0, 7, 10); g.fillStyle(0xd23b3b).fillRect(12, 12, 8, 4); });
    mk('package', 28, 26, g => { g.fillStyle(0x111111).fillRect(0, 4, 28, 22); g.fillStyle(0xb98a5c).fillRect(2, 6, 24, 18); g.fillStyle(0xd23b3b).fillRect(12, 4, 4, 22).fillRect(2, 13, 24, 4); });
    mk('package_open', 28, 26, g => { g.fillStyle(0x111111).fillRect(0, 8, 28, 18); g.fillStyle(0x7a5a38).fillRect(2, 10, 24, 14); g.fillStyle(0xffd23f).fillRect(6, 0, 16, 10); });
    mk('cactus', 16, 28, g => { g.fillStyle(0x2f7d32).fillRect(5, 4, 6, 24).fillRect(0, 10, 5, 4).fillRect(11, 14, 5, 4); });
    mk('tire', 24, 12, g => { g.fillStyle(0x111111).fillRect(2, 0, 20, 12).fillRect(0, 2, 24, 8); });
    mk('bot_melee', 16, 16, g => { g.fillStyle(0x222b33).fillRect(3, 0, 10, 7).fillRect(2, 8, 12, 6); });
    Object.values(UNIT_DEFS).forEach(d => mk(d.tex, 16, 20, g => {
      g.fillStyle(d.tex.includes('blue') ? 0x3b6ea5 : 0xa53b3b).fillRect(3, 0, 10, 8).fillRect(2, 9, 12, 8).fillRect(3, 17, 4, 3).fillRect(9, 17, 4, 3);
    }));
    mk('sentry_robot', 16, 14, g => { g.fillStyle(0x2f6ea8).fillRect(2, 4, 12, 9).fillStyle(0xffffff).fillRect(4, 6, 8, 3).fillStyle(0xff9a2e).fillRect(12, 6, 4, 2); });
    mk('sentry_mound', 16, 8, g => { g.fillStyle(0x6b4a2a).fillRect(1, 3, 14, 5).fillStyle(0x8a6238).fillRect(3, 1, 10, 4); });
    mk('sentinel_robot', 12, 20, g => { g.fillStyle(0xe8eef5).fillRect(3, 6, 6, 12).fillStyle(0x3fa0ff).fillRect(4, 8, 4, 3).fillStyle(0x5dff8a).fillRect(5, 13, 2, 3).fillRect(4, 14, 4, 1).fillStyle(0x888888).fillRect(5, 0, 2, 6); });
    mk('trap_plate', 16, 8, g => { g.fillStyle(0x56688a).fillRect(0, 2, 16, 6).fillStyle(0x9fd8ff).fillRect(3, 4, 10, 2); });
    mk('barricade_seg', 24, 12, g => { g.fillStyle(0x6a7a8a).fillRect(0, 2, 24, 10).fillStyle(0xffd23f).fillRect(2, 4, 4, 6).fillRect(10, 4, 4, 6).fillRect(18, 4, 4, 6); });
    mk('turret_robot', 16, 16, g => { g.fillStyle(0xe8eef5).fillRect(2, 8, 12, 7).fillStyle(0x3fa0ff).fillRect(5, 3, 7, 6).fillStyle(0x222222).fillRect(12, 4, 4, 2).fillRect(12, 7, 4, 2); });
    mk('fence_h', 64, 12, g => { g.fillStyle(0x6a7a8a).fillRect(0, 3, 64, 6).fillStyle(0x2a3040).fillRect(0, 5, 64, 2); for (let i = 0; i < 64; i += 8) g.fillStyle(0x9aa8b8).fillRect(i, 1, 2, 10); g.fillStyle(0xffd23f).fillRect(0, 0, 4, 12).fillRect(60, 0, 4, 12); });
    mk('fence_v', 12, 64, g => { g.fillStyle(0x6a7a8a).fillRect(3, 0, 6, 64).fillStyle(0x2a3040).fillRect(5, 0, 2, 64); for (let i = 0; i < 64; i += 8) g.fillStyle(0x9aa8b8).fillRect(1, i, 10, 2); g.fillStyle(0xffd23f).fillRect(0, 0, 12, 4).fillRect(0, 60, 12, 4); });
    mk('minigun', 16, 16, g => { g.fillStyle(0x444a55).fillRect(2, 8, 10, 7).fillStyle(0x222222).fillRect(8, 5, 8, 2).fillRect(8, 8, 8, 2).fillRect(8, 11, 8, 2).fillStyle(0xff9a2e).fillRect(3, 9, 3, 2); });
    mk('bot_ranged', 16, 16, g => { g.fillStyle(0x223333).fillRect(3, 0, 10, 7).fillRect(2, 8, 12, 6); });
  }

  /* ---------- ground: the forest pack's path + grass tiles ----------
     16px tiles at half resolution (each tile = 32 world units). Grass is the pack's flat olive with speckles and darker grass patches; the path is its
     dirt tile, and every grass tile touching the path gets the matching fringe tile (edge / corner pieces of trail.png). The path follows the walkability map. */
  bakeGround() {
    const K = 2, T = 16, TW = WORLD_W / K, TH = WORLD_H / K, cols = Math.ceil(TW / T), rows = Math.ceil(TH / T);
    const trail = this.textures.get('f_trail').getSourceImage(), gt = this.textures.get('f_gt').getSourceImage(), R2 = rng(4242);
    if (this.textures.exists('ground_baked')) this.textures.remove('ground_baked');
    const tex = this.textures.createCanvas('ground_baked', cols * T, rows * T), ctx = tex.getContext();
    const dm = new Uint8Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) dm[j * cols + i] = this.survival ? 0 : walkField((i + 0.5) * T * K, (j + 0.5) * T * K) >= 0.5 && grassField((i + 0.5) * T * K, (j + 0.5) * T * K) < 0.3 ? 1 : 0;
    const D = (i, j) => (i < 0 || j < 0 || i >= cols || j >= rows ? 0 : dm[j * cols + i]);
    for (let pass = 0; pass < 2; pass++) for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {   // close 1-tile gaps / notches so every fringe tile has a matching piece
      if (D(i, j)) continue; const n = D(i, j - 1), so = D(i, j + 1), w = D(i - 1, j), e = D(i + 1, j);
      if (n + so + w + e >= 3 || (n && so) || (w && e)) dm[j * cols + i] = 1;
    }
    ctx.fillStyle = 'rgb(150,148,32)'; ctx.fillRect(0, 0, cols * T, rows * T);
    const specks = (pal, n, test) => { for (let k = 0; k < n; k++) { const x = R2() * cols * T | 0, y = R2() * rows * T | 0; if (!test(Math.floor(x / T), Math.floor(y / T))) continue; ctx.fillStyle = pal[R2() * pal.length | 0]; ctx.fillRect(x, y, R2() < 0.4 ? 2 : 1, 1); } };
    specks(['rgb(136,138,30)', 'rgb(162,158,38)', 'rgb(124,128,34)', 'rgb(168,166,44)'], 9000, (i, j) => !D(i, j));
    // darker grass patches (grass transition tiles) for tonal variety
    const patches = [[0, 0, 48, 48], [48, 16, 32, 32], [80, 0, 48, 32]];
    ctx.globalAlpha = 0.55;
    for (let k = 0; k < 170; k++) { const pa = patches[R2() * patches.length | 0], x = (R2() * cols * T) | 0, y = (R2() * rows * T) | 0; if (D(Math.floor(x / T), Math.floor(y / T)) || D(Math.floor((x + pa[2]) / T), Math.floor((y + pa[3]) / T))) continue; ctx.drawImage(gt, pa[0], pa[1], pa[2], pa[3], x, y, pa[2], pa[3]); }
    ctx.globalAlpha = 1;
    const put = (tx, ty, i, j) => ctx.drawImage(trail, tx * T, ty * T, T, T, i * T, j * T, T, T);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if (D(i, j)) { put(1, 4, i, j); continue; }
      const n = D(i, j - 1), so = D(i, j + 1), w = D(i - 1, j), e = D(i + 1, j);
      if (n || so || w || e) {
        if (n && w) put(0, 0, i, j); else if (n && e) put(2, 0, i, j); else if (so && w) put(0, 2, i, j); else if (so && e) put(2, 2, i, j);
        else if (n) put(1, 0, i, j); else if (so) put(1, 2, i, j); else if (w) put(0, 1, i, j); else put(2, 1, i, j);
      } else if (D(i - 1, j - 1)) put(2, 5, i, j); else if (D(i + 1, j - 1)) put(0, 5, i, j); else if (D(i - 1, j + 1)) put(2, 3, i, j); else if (D(i + 1, j + 1)) put(0, 3, i, j);
    }
    const inner = (i, j) => D(i, j) && D(i - 1, j) && D(i + 1, j) && D(i, j - 1) && D(i, j + 1);
    for (let k = 0; k < 260; k++) {   // soft darker / lighter patches of packed earth
      const x = R2() * cols * T | 0, y = R2() * rows * T | 0, w = 10 + (R2() * 26 | 0), h = 6 + (R2() * 14 | 0);
      if (!inner(Math.floor(x / T), Math.floor(y / T)) || !inner(Math.floor((x + w) / T), Math.floor((y + h) / T))) continue;
      ctx.fillStyle = R2() < 0.5 ? 'rgba(96,70,28,0.22)' : 'rgba(150,112,46,0.2)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 6.2832); ctx.fill();
    }
    specks(['rgb(112,82,30)', 'rgb(146,108,40)', 'rgb(100,74,28)', 'rgb(120,88,32)', 'rgb(154,116,48)'], 16000, inner);
    tex.refresh();
    this.add.image(0, 0, 'ground_baked').setOrigin(0, 0).setScale(K).setDepth(-1000);
  }

  // survival: one big open meadow (grass, flowers, mushrooms and stones that never block anything)
  buildOpenMap() {
    const R = rng(777), rnd = (a, b) => a + R() * (b - a), pick = a => a[R() * a.length | 0];
    this.mapSprites = []; this.bakeGround();
    const TUFT = ['f_flower1', 'f_flower2', 'f_flower3', 'f_mush1', 'f_mush2', 'f_mush3', 'f_mush4', 'f_mush5', 'f_mush6', 'f_stone1', 'f_stone3'], BIG = ['f_stone2', 'f_stone4', 'f_bush1', 'f_bush2'];
    if (this.bakedDecor) this.bakedDecor.destroy();
    const rt = this.bakedDecor = this.add.renderTexture(0, 0, WORLD_W / 2, WORLD_H / 2).setOrigin(0, 0).setScale(2).setDepth(-5);
    for (let i = 0; i < 1400; i++) { const k = pick(TUFT); if (this.textures.exists(k)) rt.stamp(k, null, rnd(10, WORLD_W - 10) / 2, rnd(10, WORLD_H - 10) / 2, { originX: 0.5, originY: 0.8, scale: 1 }); }
    for (let i = 0; i < 160; i++) { const k = pick(BIG); if (this.textures.exists(k)) rt.stamp(k, null, rnd(10, WORLD_W - 10) / 2, rnd(10, WORLD_H - 10) / 2, { originX: 0.5, originY: 1, scale: 1.2 }); }
  }

  /* ---------- map: top-down, one horizontal lane ---------- */
  buildMap() {
    if (this.survival) return this.buildOpenMap();
    const S = MAP_SCALE, R = rng(12345), rnd = (a, b) => a + R() * (b - a);
    this.mapSprites = [];   // live scenery (trees, bushes, stones...): hidden inside Leandro's virtual arena
    const img = (sheet, frame, x, y, depth = y, sc = S) => { const o = this.add.image(x, y, sheet, frame).setOrigin(0.5, 1).setScale(sc).setDepth(depth); this.mapSprites.push(o); return o; };
    const pick = a => a[R() * a.length | 0];
    const BIGT = ['f_tree1', 'f_tree2', 'f_tree1', 'f_tree2', 'f_tree3'], SMALLT = ['f_tree4', 'f_tree4', 'f_tree1'], BUSH = ['f_bush1', 'f_bush2'], STONE = ['f_stone1', 'f_stone2', 'f_stone3', 'f_stone4'], TUFT = ['f_flower1', 'f_flower2', 'f_flower3', 'f_mush1', 'f_mush2', 'f_mush3', 'f_mush4', 'f_mush5', 'f_mush6', 'f_stone1', 'f_stone3'];
    const W = (i, j) => cellWalk(i, j);
    this.bakeGround(); this.buildRiver();
    // distance (in cells) from every forest cell to the nearest walkable cell
    const near = (i, j) => { for (let d = 1; d <= 4; d++) for (let dj = -d; dj <= d; dj++) for (let di = -d; di <= d; di++) if (Math.max(Math.abs(di), Math.abs(dj)) === d && W(i + di, j + dj)) return d; return 5; };
    // static forest decor far from any path never interacts with units: it is stamped once into a single texture instead of ~1200 live sprites (a big part of the frame cost)
    const baked = [];
    // grass tufts on the forest floor
    for (let i = 0; i < 700; i++) { const x = rnd(10, WORLD_W - 10), y = rnd(10, WORLD_H - 10); if (!cellWalk(Math.floor(x / CELL), Math.floor(y / CELL))) baked.push([pick(TUFT), null, x, y, 0.8, 2]); }
    // neutral camp clearings
    const g = this.add.graphics().setDepth(-997);
    CAMP_SITES.forEach(({ x: cx, y: cy, entryX, entryY }, ci) => {
      // neutral camp: no solid disc, just small ground stones (and pebbles) scattered around the clearing
      for (let k = 0; k < 15; k++) { const a = R() * 6.2832, rr = 18 + R() * 88; img(pick(STONE), null, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.75 + 8, undefined, 2.2 + R() * 1.6); }
      const entryAngle = Math.atan2(entryY - cy, entryX - cx);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + 0.3;
        if (Math.cos(a - entryAngle) > 0.35) continue;   // leave the approach from the path open
        img(pick(STONE), null, cx + Math.cos(a) * 112, cy + Math.sin(a) * 84 + 10, undefined, 3.2);
      }
    });
    // upper boundary of the map: a ridge of the pack's cliff pieces (they mark the edge of the playable terrain together with the trees)
    for (let x = -40, k = 0; x < WORLD_W + 120; x += 176, k++) img(k % 2 ? 'f_wall2' : 'f_wall1', null, x + rnd(-10, 10), 124 + rnd(-6, 6), -3, 1.45);   // ground-level boundary: always below units, flags and camp props
    // dense forest: bush hedge along every path edge, small trees behind it, big trees deep inside
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      if (W(i, j)) continue;
      const d = near(i, j), cx0 = i * CELL + CELL / 2 + rnd(-10, 10), cy = j * CELL + CELL / 2 + rnd(-8, 12), w4 = [W(i - 1, j), W(i + 1, j), W(i, j - 1), W(i, j + 1)].filter(Boolean).length;
      if (w4 >= 3 || (d === 1 && w4 >= 2)) continue;   // slivers of forest sticking into a path: no stray bushes across it
      let cx = cx0, by = cy + 22;
      if (W(i, j + 1)) by = Math.min(by, j * CELL + CELL - 4);   // keep hedge bushes inside their cell (they must not overhang the path)
      if (W(i - 1, j)) cx = Math.max(cx, i * CELL + CELL * 0.62); if (W(i + 1, j)) cx = Math.min(cx, i * CELL + CELL * 0.38);
      const put = (key, x, y, sc, oy = 1) => (d >= 3 ? baked.push([key, null, x, y, oy, sc]) : img(key, null, x, y, y, sc).setOrigin(0.5, oy));
      if (d === 1) { img(pick(BUSH), null, cx, by, by, 2.3); if (R() < 0.45) img(pick(BUSH), null, cx + rnd(-22, 22), by - rnd(10, 26), by - 12, 2.1); }
      else if (d <= 3) { if (R() < 0.95) put(pick(SMALLT), cx, cy + 34, 1.25, 0.9); if (R() < 0.6) put(pick(SMALLT), cx + rnd(-26, 26), cy + rnd(0, 26), 1.1, 0.9); if (R() < 0.3) put(pick(STONE), cx + rnd(-20, 20), cy + 22, 2); if (R() < 0.12) put('f_trunk1', cx + rnd(-16, 16), cy + 26, 2); }
      else { put(pick(BIGT), cx, cy + 44, 1.6, 0.9); if (R() < 0.7) put(pick(SMALLT), cx + rnd(-30, 30), cy + rnd(0, 30), 1.2, 0.9); }
    }
    if (this.bakedDecor) this.bakedDecor.destroy();
    const rt = this.bakedDecor = this.add.renderTexture(0, 0, WORLD_W / 2, WORLD_H / 2).setOrigin(0, 0).setScale(2).setDepth(-5);   // half resolution, drawn x2 (the art is 1x pixel art scaled up anyway)
    baked.forEach(([sheet, frame, x, y, oy = 1, sc = S]) => rt.stamp(sheet, frame, x / 2, y / 2, { originX: 0.5, originY: oy, scale: sc / 2 }));
    rt.render();
    this.bakeBorders(pick, rnd, R);
  }

  // the camera can scroll past the map edges: that margin is dressed with dense forest + a second line of cliffs (no flat green)
  bakeBorders(pick, rnd, R) {
    const S = MAP_SCALE, BIGT = ['f_tree1', 'f_tree2', 'f_tree1', 'f_tree2', 'f_tree3'], SMALLT = ['f_tree4', 'f_tree4', 'f_tree1'], TOPY = -420, TOPH = 450, BOTY = WORLD_H, BOTH = 240;   // the margins only cover what is OUTSIDE the map (they must never overlap camps / flags)
    this.cameras.main.setBackgroundColor('#2a3a12');
    const make = (y0, h, items) => {
      const rt = this.add.renderTexture(0, y0, WORLD_W, h).setOrigin(0, 0).setDepth(-5); rt.fill(0x35431a, 1);
      items.sort((a, b) => (b[4] ? 1 : 0) - (a[4] ? 1 : 0) || a[2] - b[2]).forEach(([key, x, y, sc]) => rt.stamp(key, null, x, y - y0, { originX: 0.5, originY: 0.9, scale: sc }));
      rt.render(); (this.borderRts ||= []).push(rt);
    };
    const top = [], bot = [];
    for (let y = TOPY; y < 26; y += 34) for (let x = -30 - (Math.floor(y / 34) % 2) * 26; x < WORLD_W + 60; x += 52) top.push([R() < 0.62 ? pick(BIGT) : pick(SMALLT), x + rnd(-14, 14), y + rnd(-10, 10), R() < 0.62 ? 1.6 : 1.2]);
    for (let x = -40, k = 0; x < WORLD_W + 120; x += 176, k++) top.push([k % 2 ? 'f_wall2' : 'f_wall1', x + rnd(-12, 12), -250 + rnd(-6, 6), 1.45, 1]);   // second ridge of cliffs further out
    for (let y = BOTY + 40; y < BOTY + BOTH + 60; y += 34) for (let x = -30 - (Math.floor(y / 34) % 2) * 26; x < WORLD_W + 60; x += 52) bot.push([R() < 0.62 ? pick(BIGT) : pick(SMALLT), x + rnd(-14, 14), y + rnd(-10, 10), R() < 0.62 ? 1.6 : 1.2]);
    for (let x = 20, k = 0; x < WORLD_W + 120; x += 176, k++) bot.push([k % 2 ? 'f_wall1' : 'f_wall2', x + rnd(-12, 12), BOTY + 90 + rnd(-6, 6), 1.45, 1]);
    make(TOPY, TOPH, top); make(BOTY, BOTH, bot);
  }

  /* ---------- input ---------- */
  buildKeys() {
    const K = this.input.keyboard;
    this.k = K.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D', up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT', run: 'SHIFT', ctrl: 'CTRL',
      basic: 'J', basic2: 'SPACE', p1: 'Q', p2: 'F', p3: 'E', ult: 'R',
      recall: 'B', i1: 'ONE', i2: 'TWO', i3: 'THREE', i4: 'FOUR', i5: 'FIVE', i6: 'SIX', shop: 'P', tab: 'TAB', lvl: 'L', ai: 'F1', free: 'F2', respawn: 'ENTER', full: 'G', esc: 'ESC',
    });
    K.addCapture('TAB,SPACE,F1,F2,Q,F,E,R,CTRL,ESC');
  }

  handleInput() {
    const k = this.k, p = this.pc, J = Phaser.Input.Keyboard.JustDown, d = (a, b) => (a.isDown || b.isDown ? 1 : 0);
    p.in = { mx: d(k.right, k.right2) - d(k.left, k.left2), my: d(k.down, k.down2) - d(k.up, k.up2), run: k.run.isDown };
    if (this.mouseSeen) {
      const m = this.cursorWorld();
      const ptr0 = this.input.activePointer, onUi = (this.uiRects || []).some(r => ptr0.x >= r.x && ptr0.x <= r.x + r.w && ptr0.y >= r.y && ptr0.y <= r.y + r.h);
      if (p.state !== 'cast' && !onUi) p.setAim(m.x - p.x, m.y - p.cy);   // keep the last aim while the cursor is over the HUD
    } else if ((p.in.mx || p.in.my) && p.state !== 'cast') p.setAim(p.in.mx, p.in.my);
    const ptr = this.input.activePointer, overUi = (this.uiRects || []).some(r => ptr.x >= r.x && ptr.x <= r.x + r.w && ptr.y >= r.y && ptr.y <= r.y + r.h);
    const left = ptr.leftButtonDown(), leftClick = left && !this.prevLeft, right = ptr.rightButtonDown(), rightClick = right && !this.prevRight;
    this.prevLeft = left; this.prevRight = right;
    if (p.bomber) { p.in = { mx: 0, my: 0, run: false }; ['p1', 'p2', 'ult'].forEach(a => J(k[a]) && this.beginAim(a)); return; }   // aboard: clicks / E fire missiles in updateBomber; Q (machine gun), F (crates) and R are cast here
    if (leftClick && !overUi && !this.aimKey) {   // click on a champion selects it (info panel, top-right)
      const m = this.cursorWorld(ptr);
      const hit = this.fighters.find(f => f.isChamp && !f.hiddenFor(this.player) && Math.abs(m.x - f.x) < 48 && m.y > f.y - f.def.height - 10 && m.y < f.y + 15);
      this.selected = hit || null;
    }
    // powers: 1st press/click shows the preview, 2nd click (or same key) casts, right click / ESC cancels
    ABILITY_KEYS.forEach(a => J(k[a]) && (k.ctrl.isDown ? this.askSpend(a) : this.aimKey === a ? this.confirmAim() : this.beginAim(a)));
    if (J(k.esc) || rightClick) this.cancelAim();
    if (this.aimKey) { if (leftClick && !overUi) this.confirmAim(); }
    else {
      if (this.clickQ > 0 && this.time.now - this.clickQT >= 600) this.clickQ = 0;   // clicks not used within 0.6 s are forgotten
      const queued = this.clickQ > 0;   // every click is remembered (even a tap shorter than one frame) and each one throws exactly one hit as soon as the previous hit allows it
      if ((queued && !overUi) || (left && !overUi) || k.basic.isDown || k.basic2.isDown || J(k.basic) || J(k.basic2)) { if (p.tryBasic() && this.clickQ > 0) this.clickQ--; }
    }
    ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'].forEach((n, i) => J(k[n]) && p.useItem(i));
    if (J(k.shop)) this.scene.get('hud')?.toggleShop?.();
    if (J(k.recall) && !this.paused && !this.over && !this.survival) { if (this.net?.role === 'client') this.net.op('recall'); else this.player.startRecall(); }   // B: return to the base
    if (J(k.lvl)) this.player.levelUp();
    if (J(k.ai)) this.aiOn = !this.aiOn;
    if (J(k.free)) this.debugFree = !this.debugFree;
    if (J(k.full)) { this.scale.toggleFullscreen(); navigator.keyboard?.lock?.(['KeyQ', 'KeyF', 'KeyE', 'KeyR']).catch(() => {}); }
    if (J(k.respawn) && this.training && !this.net) this.champs.forEach(f => { f.x = f.spawn.x; f.y = f.spawn.y; f.reset(); f.playAnim('idle'); });
  }

  /* ---------- aiming (preview before casting) ---------- */
  // cursor in world coordinates, read at the controlled champion's chest height like the 2D view does
  cursorWorld(ptr = this.input.activePointer) {
    return ptr.positionToCamera(this.cameras.main);
  }
  mouseGround() {   // cursor is read at chest height, so the ground point sits below it
    const m = this.cursorWorld(), p = this.pc;
    return { x: m.x, y: m.y + p.def.height * 0.6 };
  }
  trainingDie() {   // practice zone: test the champion's death animation / effects, and bring it back
    if (!this.training || this.net) return; const p = this.player;
    if (p.alive) { p.hp = 0; p.die(null); } else { p.x = p.spawn.x; p.y = p.spawn.y; p.reset(); p.playAnim('idle'); }
  }
  askSpend(k) {   // learning a slot with two branches opens the choice window first
    const p = this.player; if (!p.canSpend(k)) return;
    if (p.def.alt?.[k] && !p.ranks[k]) { const hs = this.scene.get('hud'); if (hs) { hs.shopOpen = false; hs.branchSel = k; return; } }
    p.spend(k);
  }
  beginAim(a) {
    const p = this.pc, rank = p.ranks[a], d = p.def.abilities[a];
    if (d.passive) { this.float(p.x, p.y - p.def.height - 30, 'Habilidad pasiva', '#ffe066'); return; }
    if (p.silenceT > 0) { this.float(p.x, p.y - p.def.height - 30, 'SILENCIADO', '#c77dff'); this.audio.play('glitch', { gap: 250 }); return; }
    if (p.key === 'yonaiker' && p.abilityLocked(a)) { this.float(p.x, p.y - p.def.height - 30, a === 'p3' ? 'La nave llega al llenar la barra (dispara y acierta)' : 'Solo disponible a bordo de la nave', '#9fe8ff'); return; }   // Q gun on foot, F both, E / R aboard
    if ((p.key === 'luis' && a !== 'ult') || (p.key === 'hector' && a !== 'p2') || (p.key === 'yonaiker' && (a !== 'p2' || p.bomber)) || (p.key === 'maduro' && (a === 'p2' || a === 'ult')) || (p.key === 'diosa' && (a === 'p2' || a === 'ult' || (a === 'p1' && p.qRe))) || (p.key === 'julio' && ((a === 'ult' && d.v === 'puddle') || (a === 'p2' && !d.v && rank >= 3))) || (p.key === 'leandro' && (d.v === 'comb' || (d.v === 'leak' && !p.leakRe)))) { p.tryCast(a); return; }   // instant casts: no aiming step
    if (p.key === 'junior' && a === 'p2') { const m = this.mouseGround(); if (!this.hoverKey) p.setAim(m.x - p.x, m.y - p.y); p.tryCast(a); return; }   // somersault is instant; the flamethrower is aimed (the triangle preview) and then locks that direction
    if (p.key === 'jorbi' && a === 'p2') {   // instant dash toward the cursor (no aim step)
      const m = this.mouseGround(); if (!this.hoverKey) p.setAim(m.x - p.x, m.y - p.y);
      p.tryCast('p2'); return;
    }
    if (!rank || !p.free || p.cds[a] > 0 || (p.mana < (p.leakRe && a === 'ult' ? 0 : rk(d.mana, rank)) && !this.debugFree)) { if (rank) this.audio.play('ui_error', { gap: 250, vol: 0.7 }); return; }
    this.aimKey = a;
  }
  cancelAim() { this.aimKey = null; this.aimG.clear(); }
  wallCenter(spec) {
    const p = this.pc, hov = !this.aimKey && this.hoverKey, m = hov ? { x: p.x + p.ax * spec.max * 0.7, y: p.y + p.ay * spec.max * 0.7 } : this.mouseGround(), dx = m.x - p.x, dy = m.y - p.y, d = Math.hypot(dx, dy) || 1;
    const r = Phaser.Math.Clamp(d, spec.min || 0, spec.max);
    return { x: p.x + dx / d * r, y: Phaser.Math.Clamp(p.y + dy / d * r, WALK_Y0, WALK_Y1) };
  }
  confirmAim() {
    const p = this.pc, a = this.aimKey, spec = aimSpec(p.key, a, p.ranks[a], p);
    const m = this.mouseGround(); p.setAim(m.x - p.x, m.y - p.y);
    if (spec.type === 'dryer') p.castPoint = { x: this.k.run?.isDown ? 1 : 0, y: 0 };   // Shift while aiming = push (the cast point carries the mode to the host)
    else if (spec.stroke) p.castPoint = { x: Math.hypot(m.x - p.x, m.y - p.y), y: 0 };   // Julio's stroke: how far was aimed (its shape depends on it)
    else p.castPoint = spec.type === 'wall' || spec.type === 'zone' || spec.type === 'rect' || spec.type === 'tirethrow' ? this.wallCenter(spec) : spec.type === 'pick' ? this.mouseGround() : null;
    if (spec.type === 'rect' && p.castPoint) p.castPoint.vert = Math.abs(p.ax) >= Math.abs(p.ay);   // aiming sideways -> vertical fence, aiming up/down -> horizontal fence
    this.cancelAim();
    p.tryCast(a);
  }
  drawAimGfx() {
    const g = this.aimG; g.clear();
    if (!this.aimKey) return;
    const p = this.player;
    if (!p.free) { this.cancelAim(); return; }
    const m = this.mouseGround(); p.setAim(m.x - p.x, m.y - p.y);
    const spec = aimSpec(p.key, this.aimKey, p.ranks[this.aimKey], p), c = spec.color;
    if (spec.type === 'line') {
      const nx = -p.ay * spec.width / 2, ny = p.ax * spec.width / 2, ex = p.x + p.ax * spec.range, ey = p.y + p.ay * spec.range;
      g.fillStyle(c, 0.22).fillPoints([{ x: p.x + nx, y: p.y + ny }, { x: ex + nx, y: ey + ny }, { x: ex - nx, y: ey - ny }, { x: p.x - nx, y: p.y - ny }], true);
      g.lineStyle(3, c, 0.9).lineBetween(p.x + nx, p.y + ny, ex + nx, ey + ny).lineBetween(p.x - nx, p.y - ny, ex - nx, ey - ny);
      g.lineStyle(2, 0xffffff, 0.6).lineBetween(p.x, p.y, ex, ey);
      g.fillStyle(c, 0.5).fillCircle(ex, ey, spec.width / 2);
    } else if (spec.type === 'circle' || spec.type === 'zone') {
      if (spec.type === 'zone') { const z = this.wallCenter(spec); g.lineStyle(2, c, 0.4).strokeCircle(p.x, p.y, spec.max); g.fillStyle(c, 0.2).fillCircle(z.x, z.y, spec.radius).lineStyle(3, c, 0.9).strokeCircle(z.x, z.y, spec.radius); return; }
      g.fillStyle(c, 0.16).fillCircle(p.x, p.y, spec.radius);
      g.lineStyle(3, c, 0.9).strokeCircle(p.x, p.y, spec.radius);
    } else {
      const ctr = this.wallCenter(spec), px = -p.ay, py = p.ax, half = (spec.count - 1) / 2 * spec.spacing;
      g.lineStyle(2, 0xffffff, 0.45).lineBetween(p.x, p.y, ctr.x, ctr.y);
      g.lineStyle(4, c, 0.9).lineBetween(ctr.x - px * half, ctr.y - py * half, ctr.x + px * half, ctr.y + py * half);
      for (let i = 0; i < spec.count; i++) {
        const o = (i - (spec.count - 1) / 2) * spec.spacing;
        g.fillStyle(c, 0.3).fillCircle(ctr.x + px * o, ctr.y + py * o, 26).lineStyle(2, c, 0.9).strokeCircle(ctr.x + px * o, ctr.y + py * o, 26);
      }
    }
  }

  // textured preview (Codex art, tinted per ability): range rings, trajectory bands, placement markers
  aimObj(id, make) { return (this.aimObjs[id] ||= make()); }
  drawAim() {
    if (!this.textures.exists('aim_ring')) return this.drawAimGfx();
    this.aimG.clear();
    this.aimObjs = this.aimObjs || {};
    Object.values(this.aimObjs).forEach(o => o.setVisible(false));
    const hov = !this.aimKey && this.hoverKey && this.pc.alive;   // hovering an ability icon: preview its range from the champion
    if (!this.aimKey && !hov) return;
    const p = this.pc, key = this.aimKey || this.hoverKey;
    if (!hov) { if (!p.free) { this.cancelAim(); return; } const m = this.mouseGround(); p.setAim(m.x - p.x, m.y - p.y); }
    const spec = aimSpec(p.key, key, Math.max(1, p.ranks[key]), p), c = spec.color, spin = (this.time.now * 0.012) % 360;
    const img = (id, tex) => this.aimObj(id, () => this.add.image(0, 0, tex).setDepth(99990)).setVisible(true);
    const tech = p.key === 'luis';   // Luis uses circuit/HUD-style indicators instead of magic runes
    const ring = (id, x, y, r, a = 0.9) => tech ? this.techRing(x, y, r, c, a) : img(id, 'aim_ring').setPosition(x, y).setDisplaySize(r * 2.04, r * 2.04 * YR).setTint(c).setAlpha(a);
    const cap = (id, x, y, size) => img(id, 'aim_cap').setPosition(x, y).setDisplaySize(size, size).setTint(c).setAlpha(0.95);
    if (spec.type === 'line') {
      const ex = p.x + p.ax * spec.range, ey = p.y + p.ay * spec.range;
      this.aimObj('band', () => this.add.tileSprite(0, 0, 10, 10, 'aim_band').setOrigin(0, 0.5).setDepth(99990)).setVisible(true)
        .setPosition(p.x, p.y).setSize(spec.range, spec.width).setTileScale(spec.width / 128).setRotation(Math.atan2(p.ay, p.ax)).setTint(c).setAlpha(0.85);
      if (p.key === 'julio' && key === 'p1' && spec.stroke) {   // show the S-shaped stroke
        const m = this.mouseGround(), pts = inkPath(p, hov ? spec.range : Math.hypot(m.x - p.x, m.y - p.y), spec.range), g = this.aimG;
        g.lineStyle(spec.width, spec.color, 0.25).beginPath().moveTo(pts[0].x, pts[0].y); pts.forEach(q => g.lineTo(q.x, q.y)); g.strokePath();
        g.lineStyle(3, 0xffffff, 0.7).beginPath().moveTo(pts[0].x, pts[0].y); pts.forEach(q => g.lineTo(q.x, q.y)); g.strokePath();
        this.aimObj('band', () => this.add.tileSprite(0, 0, 10, 10, 'aim_band').setOrigin(0, 0.5)).setVisible(false);
        cap('cap', pts[pts.length - 1].x, pts[pts.length - 1].y, spec.width * 1.2);
        return;
      }
      cap('cap', ex, ey, spec.width * 1.6);
    } else if (spec.type === 'rect') {   // straight fence preview: axis-aligned rectangle (vertical or horizontal), never rotated
      const ctr = this.wallCenter(spec), vert = Math.abs(p.ax) >= Math.abs(p.ay), w = vert ? spec.thick : spec.length, h = vert ? spec.length : spec.thick;
      ring('range', p.x, p.y, spec.max, 0.3);
      const g = this.aimG; g.fillStyle(c, 0.25).fillRect(ctr.x - w / 2, ctr.y - h / 2, w, h).lineStyle(3, c, 0.95).strokeRect(ctr.x - w / 2, ctr.y - h / 2, w, h);
      g.fillStyle(c, 0.6).fillRect(vert ? ctr.x - w / 2 : ctr.x - w / 2, vert ? ctr.y - h / 2 : ctr.y - h / 2, vert ? w : 18, vert ? 18 : h).fillRect(vert ? ctr.x - w / 2 : ctr.x + w / 2 - 18, vert ? ctr.y + h / 2 - 18 : ctr.y - h / 2, vert ? w : 18, vert ? 18 : h);   // turret slots at both ends
    } else if (spec.type === 'trapezoid') {
      const px = -p.ay, py = p.ax, n = spec.nearW / 2, f = spec.farW / 2, L = spec.length;
      const g = this.aimG;
      g.fillStyle(c, 0.18).fillPoints([{ x: p.x + px * n, y: p.y + py * n }, { x: p.x + p.ax * L + px * f, y: p.y + p.ay * L + py * f },
        { x: p.x + p.ax * L - px * f, y: p.y + p.ay * L - py * f }, { x: p.x - px * n, y: p.y - py * n }], true);
      g.lineStyle(3, c, 0.9).lineBetween(p.x + px * n, p.y + py * n, p.x + p.ax * L + px * f, p.y + p.ay * L + py * f).lineBetween(p.x - px * n, p.y - py * n, p.x + p.ax * L - px * f, p.y + p.ay * L - py * f)
        .lineBetween(p.x + p.ax * L + px * f, p.y + p.ay * L + py * f, p.x + p.ax * L - px * f, p.y + p.ay * L - py * f);
      this.aimObj('band', () => this.add.tileSprite(0, 0, 10, 10, 'aim_band').setOrigin(0, 0.5).setDepth(99990)).setVisible(true)
        .setPosition(p.x, p.y).setSize(L, 50).setTileScale(50 / 128).setRotation(Math.atan2(p.ay, p.ax)).setTint(c).setAlpha(0.7);
    } else if (spec.type === 'tirethrow') {   // no range circle: only the spots where each tire will land / bounce (always forward)
      const ctr = this.wallCenter(spec), dx = ctr.x - p.x, dy = ctr.y - p.y, D = Math.max(1, Math.hypot(dx, dy)), base = Math.atan2(dy, dx), px = -Math.sin(base), py = Math.cos(base), g = this.aimG;
      for (let i = 0; i < spec.count; i++) {
        const o = (i - (spec.count - 1) / 2) * spec.spacing, ang = base + (i - (spec.count - 1) / 2) * 0.05, x0 = p.x + px * o, y0 = p.y + py * o;
        const Di = D;
        [0.4, 0.7, 1].slice(0, spec.bounces + 1).forEach((u, j) => { const x = x0 + Math.cos(ang) * Di * u, y = y0 + Math.sin(ang) * Di * u * 1; g.fillStyle(c, 0.22 - j * 0.04).fillCircle(x, y, 26).lineStyle(3, c, 0.95 - j * 0.15).strokeCircle(x, y, 26); });
      }
    } else if (spec.type === 'dryer') {   // hair dryer line: cyan arrows towards Leandro (pull) / orange arrows away from him (push, Shift)
      const push = !!this.k.run?.isDown, col = push ? 0xff9a3a : 0x5ad7ff, px = -p.ay, py = p.ax, L = spec.length, hw = spec.width / 2, g = this.aimG, tt = this.time.now / 1000;
      const P = (u, v) => ({ x: p.x + p.ax * u + px * v, y: p.y + p.ay * u + py * v });
      g.fillStyle(col, 0.16).fillPoints([P(0, -hw), P(L, -hw), P(L, hw), P(0, hw)], true);
      g.lineStyle(3, col, 0.9).lineBetween(P(0, -hw).x, P(0, -hw).y, P(L, -hw).x, P(L, -hw).y).lineBetween(P(0, hw).x, P(0, hw).y, P(L, hw).x, P(L, hw).y).lineBetween(P(L, -hw).x, P(L, -hw).y, P(L, hw).x, P(L, hw).y);
      for (let i = 0; i < 6; i++) {
        const u = (((i / 6) + tt * (push ? 0.7 : -0.7)) % 1 + 1) % 1 * L, d = push ? 1 : -1, al = Math.sin(Math.PI * u / L), tip = P(u + d * 16, 0), l1 = P(u - d * 14, -hw * 0.55), l2 = P(u - d * 14, hw * 0.55);
        g.lineStyle(5, col, 0.95 * al).lineBetween(l1.x, l1.y, tip.x, tip.y).lineBetween(l2.x, l2.y, tip.x, tip.y);
      }
      this.aimObj('dryerHint', () => this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(99991))
        .setVisible(true).setText(push ? 'REPELER  (suelta Mayús: JALAR)' : 'JALAR  (mantén Mayús: REPELER)').setColor(push ? '#ffb86a' : '#8ae2ff').setPosition(p.x, p.y - p.def.height - 56);
    } else if (spec.type === 'pick') {
      ring('ring', p.x, p.y, spec.radius, 0.7);
      const t = this.pickTarget(p, spec.radius, this.mouseGround());
      if (t) cap('cap', t.x, t.y - t.def.height * 0.5, 110);
    } else if (spec.type === 'circle') {
      ring('ring', p.x, p.y, spec.radius);
    } else if (spec.type === 'zone') {
      const z = this.wallCenter(spec);
      ring('range', p.x, p.y, spec.max, 0.4);
      ring('zone', z.x, z.y, spec.radius);
      cap('cap', z.x, z.y, 70);
    } else {
      const ctr = this.wallCenter(spec), px = -p.ay, py = p.ax;
      ring('range', p.x, p.y, spec.max, 0.3);
      for (let i = 0; i < spec.count; i++) {
        const o = (i - (spec.count - 1) / 2) * spec.spacing;
        img('mk' + i, 'aim_marker').setPosition(ctr.x + px * o, ctr.y + py * o).setDisplaySize(60, 60).setTint(c).setAlpha(0.95);
      }
    }
  }

  // fixed, low-key arrow on the ground showing the basic-attack range limit of the champion in use
  drawRangeHint() {
    const p = this.pc, g = this.rangeG;
    g.clear();
    if (!p.alive) return;
    const range = p.atkRange, col = 0xbfffd6;
    const ax = p.ax, ay = p.ay, nx = -ay, ny = ax, bx = p.x + ax * (range - 22), by = p.y + ay * (range - 22), tx = p.x + ax * range, ty = p.y + ay * range;
    g.setDepth(p.y - 2.5);
    g.fillStyle(0x000000, 0.25).fillTriangle(tx + ax * 20, ty + ay * 20, tx + nx * 13, ty + ny * 13, tx - nx * 13, ty - ny * 13);
    g.fillStyle(col, 0.5).fillPoints([{ x: bx + nx * 3, y: by + ny * 3 }, { x: tx + nx * 3, y: ty + ny * 3 }, { x: tx - nx * 3, y: ty - ny * 3 }, { x: bx - nx * 3, y: by - ny * 3 }], true);
    g.fillTriangle(tx + ax * 18, ty + ay * 18, tx + nx * 11, ty + ny * 11, tx - nx * 11, ty - ny * 11);
  }

  // "Hay money": a burst of banknotes fills the trapezoid in front of the caster
  moneyBurst(o, L, nearW, farW) {
    const px = -o.ay, py = o.ax, lift = o.def.height * 0.5;
    const g = this.add.graphics().setDepth(o.y + 3);
    const hw = (u) => (nearW + (farW - nearW) * u / L) / 2;
    g.fillStyle(0x7dff8a, 0.25).fillPoints([{ x: o.x + px * hw(0), y: o.y + py * hw(0) }, { x: o.x + o.ax * L + px * hw(L), y: o.y + o.ay * L + py * hw(L) },
      { x: o.x + o.ax * L - px * hw(L), y: o.y + o.ay * L - py * hw(L) }, { x: o.x - px * hw(0), y: o.y - py * hw(0) }], true);
    this.tweens.add({ targets: g, alpha: 0, duration: 450, onComplete: () => g.destroy() });
    const hasTex = this.textures.exists('bill');
    for (let i = 0; i < 30; i++) {
      const u = 30 + Math.random() * (L - 30), v = (Math.random() * 2 - 1) * hw(u) * 0.9;
      const x = o.x + o.ax * u + px * v, y = Phaser.Math.Clamp(o.y + o.ay * u + py * v, WALK_Y0, WALK_Y1);
      const b = this.add.image(o.x + o.ax * 30, o.y + o.ay * 30 - lift, 'bill').setDepth(o.y + 4).setScale(0);
      const sc = (hasTex ? 34 / b.width : 2) * (0.8 + Math.random() * 0.5);
      this.tweens.add({ targets: b, x, y: y - 14, scale: sc, angle: Math.random() * 540 - 270, duration: 260 + Math.random() * 160, delay: i * 8, ease: 'Cubic.Out' });
      this.tweens.add({ targets: b, alpha: 0, delay: 700 + Math.random() * 250, duration: 300, onComplete: () => b.destroy() });
    }
  }

  // technological range indicator: thin outer circle, rotating dashed arcs, tick marks, crosshair with corner brackets
  techRing(x, y, r, c, a = 0.9) {
    const g = this.aimG, t = this.time.now / 1000, ox = x, oy = y; x = 0; y = 0;
    g.save(); g.translateCanvas(ox, oy); g.scaleCanvas(1, YR);   // drawn as a circle, shown as the ground ellipse
    g.lineStyle(2, c, a * 0.9).strokeCircle(x, y, r);
    g.fillStyle(c, 0.07 * a).fillCircle(x, y, r);
    for (let i = 0; i < 6; i++) { const s0 = t * 0.9 + i * Math.PI / 3; g.lineStyle(5, c, a).beginPath().arc(x, y, r - 7, s0, s0 + 0.42, false).strokePath(); }
    for (let i = 0; i < 48; i++) { const ang = i * Math.PI / 24, L = i % 6 === 0 ? 12 : 5, ca = Math.cos(ang), sa = Math.sin(ang); g.lineStyle(i % 6 === 0 ? 3 : 1, c, a * 0.8).lineBetween(x + ca * (r - L), y + sa * (r - L), x + ca * r, y + sa * r); }
    const k = Math.min(30, r * 0.4);
    g.lineStyle(2, c, a * 0.8).lineBetween(x - k, y, x - k * 0.35, y).lineBetween(x + k * 0.35, y, x + k, y).lineBetween(x, y - k, x, y - k * 0.35).lineBetween(x, y + k * 0.35, x, y + k);
    const bk = Math.min(r * 0.5, 46);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => g.lineStyle(3, c, a).beginPath().moveTo(x + sx * bk, y + sy * (bk - 12)).lineTo(x + sx * bk, y + sy * bk).lineTo(x + sx * (bk - 12), y + sy * bk).strokePath());
    g.restore();
  }

  // persistent ground decal for an active area effect (fades out)
  zoneDecal(x, y, r, color, life) {
    if (!this.textures.exists('zone') || !this.inView(x, y, r)) return;
    const d = this.add.image(x, y, 'zone').setDepth(y - 3).setTint(color).setAlpha(0).setDisplaySize(r * 2.1, r * 2.1 * YR);
    this.tweens.add({ targets: d, alpha: 0.9, duration: 150 });
    this.tweens.add({ targets: d, alpha: 0, angle: 40, delay: life * 1000 - 400, duration: 400, onComplete: () => d.destroy() });
  }

  aiPoint(f, max) {   // where an AI-cast zone lands: on the nearest enemy, clamped to the cast range
    const t = this.nearestEnemy(f, 900);
    if (!t) return { x: f.x + f.ax * max * 0.5, y: f.y + f.ay * max * 0.5 };
    const d = dist(t, f) || 1, r = Math.min(d, max);
    return { x: f.x + (t.x - f.x) / d * r, y: f.y + (t.y - f.y) / d * r };
  }
  enemiesNear(team, x, y, r) { return this.fighters.filter(t => t.alive && !t.puddle && t.team !== team && eDist(t.x, t.y, x, y) <= r); }

  // tires are solid: nobody walks through them, anyone caught under a new wall is pushed out
  // Súper Bigote's shield: absorbs the first hit or crowd control and bursts, hurting the enemies around it for a part of what it blocked
  sShieldBlock(f, blocked) {
    const sh = f.sShield; if (!sh) return false; f.sShield = null;
    this.vfx('shockwave', f.x, f.y - 6, { scale: sh.r / 40, below: true, tint: 0x66b0ff }); this.vfx('shield', f.x, f.cy, { scale: 3.4, tint: 0xffffff, alpha: 0.9 }); this.audio.play('ui_confirm', { at: f, vol: 0.7, gap: 100 });
    this.float(f.x, f.y - f.def.height - 30, '¡Bloqueado!', '#9fe8ff');
    const d = sh.base + blocked * sh.mult; this.enemiesNear(f.team, f.x, f.y, sh.r).forEach(t => this.damage(f, t, d, 'magic', true));
    return true;
  }
  solidAt(x, y, team) { return this.obstacles.some(o => !(o.gate && o.team === team) && Math.hypot(x - o.x, y - o.y) < o.r + BODY_R * 0.7) || this.fighters.some(n => n.isNexus && n.alive && Math.hypot(x - n.x, y - n.y) < n.br * 0.8 + BODY_R * 0.6); }
  // virtual cage (Leandro's leaks): whoever was inside when it closed cannot leave, nobody else can come in
  makeCage(owner, target, r, life, origin = null, tOrigin = null) {
    this.cages.push({ x: target.x, y: target.y, r, t: life, T: life, inside: new Set([owner, target]), owner, target, origin, tOrigin });
    this.audio.play('ui_announce', { vol: 0.7, gap: 0 });
  }
  endCage(c) {   // when the arena closes Leandro goes back to where he was before activating it, and so does the enemy (a dead enemy simply appears as a body at its old position)
    if (this.net?.role === 'client') return;
    for (const [f, pos] of [[c.owner, c.origin], [c.target, c.tOrigin]]) {
      if (!f || !pos) continue;
      this.vfx('summon', f.x, f.y - 10, { scale: 3.5, tint: 0x66ffcc }); f.x = pos.x; f.y = pos.y;
      if (f.alive) { f.carriedT = Math.max(f.carriedT || 0, 0.3); this.vfx('summon', f.x, f.y - 10, { scale: 3.5, tint: 0x66ffcc }); }
    }
  }
  cageClamp(f) {
    for (const c of this.cages) {
      const dx = f.x - c.x, dy = f.y - c.y, d = Math.hypot(dx, dy) || 1, ins = c.inside.has(f), lim = ins ? c.r - 16 : c.r + 16;
      if (ins ? d <= lim : d >= lim) continue;
      const nx = c.x + dx / d * lim, ny = c.y + dy / d * lim; if (isWalk(nx, ny)) { f.x = nx; f.y = ny; }
    }
  }
  arenaTex() {   // procedural fallback of the virtual arena floor (Codex's `virtual_arena` replaces it)
    if (this.textures.exists('virtual_floor')) return 'virtual_floor';
    if (!this.textures.exists('virt_arena_gen')) {
      const S = 512, t = this.textures.createCanvas('virt_arena_gen', S, S), x = t.getContext();
      x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, 6.2832); x.clip();
      const g = x.createRadialGradient(S / 2, S / 2, 20, S / 2, S / 2, S / 2); g.addColorStop(0, '#1d5f8c'); g.addColorStop(1, '#0a2744'); x.fillStyle = g; x.fillRect(0, 0, S, S);
      x.strokeStyle = 'rgba(90,240,235,0.5)'; x.lineWidth = 2; for (let i = 0; i <= S; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.moveTo(0, i); x.lineTo(S, i); x.stroke(); }
      x.strokeStyle = 'rgba(120,255,240,0.55)'; x.lineWidth = 3; for (const r of [60, 130, 200, 250]) { x.beginPath(); x.arc(S / 2, S / 2, r, 0, 6.2832); x.stroke(); }
      x.lineWidth = 6; x.strokeStyle = 'rgba(100,255,230,0.9)'; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 6, 0, 6.2832); x.stroke(); t.refresh();
    }
    return 'virt_arena_gen';
  }
  drawLeakRing() {   // Filtraciones: a data ring around Leandro from the 3rd frame of the activation animation until he uses the 2nd activation (or the window closes)
    const g = (this.leakRingG ||= this.add.graphics().setDepth(99979)); g.clear(); if (this.bot) return; const tt = this.time.now / 1000;
    for (const f of this.fighters) {
      if (!f.leakRe || !f.alive) { f.leakRing = false; continue; }
      if (!f.leakRing) { const fr = f.spr?.anims?.currentFrame, key = f.spr?.anims?.currentAnim?.key; if (f.replaying || (key && /ultb$/.test(key) && fr && fr.index >= 3) || f.state !== 'cast') f.leakRing = true; }
      if (!f.leakRing) continue;
      const R = 120, al = Math.min(1, f.leakRe.t * 2);
      g.lineStyle(4, 0x66ffcc, (0.75 + 0.2 * Math.sin(tt * 6)) * al).strokeEllipse(f.x, f.y, R * 2, R * 2 * YR).lineStyle(2, 0xffffff, 0.35 * al).strokeEllipse(f.x, f.y, R * 1.55, R * 1.55 * YR);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + tt * 1.4; g.fillStyle(0x9fffe8, 0.9 * al).fillRect(f.x + Math.cos(a) * R - 3, f.y + Math.sin(a) * R * YR - 3, 6, 6); }
    }
  }
  drawLeakMarks() {   // Filtraciones, while Leandro picks the target: a prison-cell icon floats above every enemy champion (the one under the cursor is highlighted)
    const g = (this.leakMarkG ||= this.add.graphics().setDepth(99978)); g.clear(); if (this.bot) return;
    const L = this.fighters.find(f => f.leakRe && f.alive && f.team === this.pc.team); if (!L) return;
    const pick = this.aimKey === 'ult' && this.pc === L ? this.pickTarget(L, 1e6, this.mouseGround()) : null, k = 1 / Math.max(0.5, this.cameras.main.zoom) * 0.9, tt = this.time.now / 1000;
    for (const e of this.fighters) {
      if (!e.alive || !e.isChamp || e.team === L.team || e.away) continue;
      const hot = e === pick, w = (hot ? 40 : 32) * k, h = (hot ? 44 : 36) * k, x = e.x, y = e.y - e.def.height - 78 * k + Math.sin(tt * 3 + e.nid) * 3 * k, col = hot ? 0xffffff : 0x66ffcc;
      g.fillStyle(0x04121a, 0.9).fillRoundedRect(x - w / 2, y - h / 2, w, h, 5 * k).lineStyle(3 * k, col, 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 5 * k);
      for (let i = 1; i < 5; i++) g.lineStyle(2.5 * k, col, 0.95).lineBetween(x - w / 2 + w * i / 5, y - h / 2 + 3 * k, x - w / 2 + w * i / 5, y + h / 2 - 3 * k);   // cell bars
      g.lineStyle(2.5 * k, col, 0.95).lineBetween(x - w / 2 + 3 * k, y - h * 0.18, x + w / 2 - 3 * k, y - h * 0.18);
      g.fillStyle(col, 0.9).fillTriangle(x - 6 * k, y + h / 2, x + 6 * k, y + h / 2, x, y + h / 2 + 8 * k);   // pointer towards the head
    }
  }
  hideSceneryInCages() {   // inside the virtual arena nothing of the real map may show: scenery sprites, camp and structure labels, flags
    const ins = this.cages.filter(c => c.inside.has(this.pc)), hid = (this.sceneryHidden ||= new Set());
    if (!ins.length && !hid.size) return;
    const inC = (x, y, m) => ins.some(c => Math.hypot(x - c.x, y - c.y) < c.r + m);
    for (const o of this.mapSprites || []) { const h = inC(o.x, o.y, 50); if (h && !hid.has(o)) { o.setVisible(false); hid.add(o); } else if (!h && hid.has(o)) { o.setVisible(true); hid.delete(o); } }
    for (const f of this.fighters) if (f.isTower || f.def?.lane || f.def?.static) { const h = inC(f.x, f.y, f.br || 40); if (h && !hid.has(f)) { f.spr?.setVisible(false); hid.add(f); } else if (!h && hid.has(f)) { f.spr?.setVisible(true); hid.delete(f); } }
    if (this.laneFlagG) this.laneFlagG.setVisible(!ins.length); if (this.campG) this.campG.setVisible(!ins.length); if (this.riverG) this.riverG.setVisible(!ins.length); this.riverImg?.setVisible(!ins.length);
  }
  updateCages(dt) {
    this.cages = this.cages.filter(c => (c.t -= dt) > 0 || (this.endCage(c), c.img?.destroy(), false));
    if (this.bot) return;
    this.hideSceneryInCages();
    const g = (this.cageG ||= this.add.graphics().setDepth(99980)), dk = (this.cageDark ||= this.add.graphics().setDepth(99985)); g.clear(); dk.clear(); const tt = this.time.now / 1000;
    for (const c of this.cages) {
      const fade = Math.min(1, c.t * 2, (c.T - c.t) * 3), pulse = 0.5 + 0.5 * Math.sin(tt * 6), inside = c.inside.has(this.pc);
      // the virtual arena replaces the terrain: under the units for the two inside, an opaque dome over everything for the rest
      c.img ||= this.add.image(c.x, c.y, this.arenaTex()).setDisplaySize(c.r * 2, c.r * 2);
      c.img.setDepth(-4).setAlpha(inside ? fade : 0).setRotation(0);
      if (!inside) g.fillStyle(0x000000, fade).fillCircle(c.x, c.y, c.r);   // outsiders cannot see into the arena: a solid black dome
      if (inside) {   // everything outside the arena is pitch black for those inside
        const R = 4000, N = 72; dk.fillStyle(0x000000, fade);
        for (let i = 0; i < N; i++) {   // ring of quads from the arena rim outwards (a polygon with a hole would be filled solid)
          const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
          dk.fillPoints([{ x: c.x + c0 * c.r, y: c.y + s0 * c.r }, { x: c.x + c1 * c.r, y: c.y + s1 * c.r }, { x: c.x + c1 * R, y: c.y + s1 * R }, { x: c.x + c0 * R, y: c.y + s0 * R }], true);
        }
      }
      g.lineStyle(4, 0x66ffcc, (0.7 + 0.25 * pulse) * fade).strokeCircle(c.x, c.y, c.r);
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2 + tt * 0.3, x = c.x + Math.cos(a) * c.r, y = c.y + Math.sin(a) * c.r; g.lineStyle(3, 0x9fffe8, 0.55 * fade).lineBetween(x, y, x, y - 60); }
    }
  }
  // Leandro's tire throw: every tire hops 3 times, always FORWARD, along a straight line (landing points at 40 / 70 / 100 % of the distance).
  // Rank 1 = plain tires; rank 2 = every landing breaks the ground and stuns briefly whoever is under it; rank 3 = flaming tires that also leave fire.
  throwTires(owner, c, a, dmg) {
    const rank = owner.ranks.p3 || 1, dx0 = c.x - owner.x, dy0 = c.y - owner.y, D = Math.min(a.range, Math.max(300, Math.hypot(dx0, dy0))), base = Math.atan2(dy0, dx0), px = -Math.sin(base), py = Math.cos(base);
    const fr = [0, 0.4, 0.7, 1].slice(0, a.bounces + 2), n = a.count;
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * a.spacing, ang = base + (i - (n - 1) / 2) * 0.05, x0 = owner.x + px * o, y0 = owner.y + py * o, fire = rank >= 3;
      const s = this.add.image(x0, y0, fire && this.textures.exists('tire_fire') ? 'tire_fire' : 'tire').setOrigin(0.5, 0.5); if (fire && !this.textures.exists('tire_fire')) s.setTint(0xff7a2a);
      const sh = this.add.ellipse(x0, y0, 44, 18, 0x000000, 0.35).setDepth(-3);
      this.tireShots.push({ owner, s, sh, x0, y0, dx: Math.cos(ang), dy: Math.sin(ang), D, fr, leg: 0, t: 0, dur: fr.slice(1).map((f, j) => (f - fr[j]) * D / a.speed), rank, fire, dmg, rad: a.radius, stun: a.stun, squash: 0, hit: new Set(), a });
    }
    this.audio.play('explosion', { at: owner, vol: 0.5, gap: 100 });
  }
  tireLand(q, x, y) {
    const rank = q.rank, a = q.a;
    this.vfx('shockwave', x, y - 4, { scale: 2.2, below: true, tint: q.fire ? 0xff8a2a : 0x9ad7ff }); this.vfx('run_dust', x, y - 6, { scale: 3, alpha: 0.9, below: true }); this.audio.play('hit_metal', { at: { x, y }, vol: 0.5, gap: 40 });
    for (const t of this.enemiesOf(q.owner)) {
      if (t.isTower || t.def?.lane || eDist(t.x, t.y, x, y) > q.rad + t.br * 0.5) continue;
      this.damage(q.owner, t, q.dmg, 'magic'); this.vfx('spark', t.x, t.cy, { scale: 3, tint: q.fire ? 0xff8a2a : 0x9ad7ff });
      if (rank >= 2 && !t.def?.static && eDist(t.x, t.y, x, y) <= q.rad * 0.7) t.stun(q.stun);
    }
    if (rank >= 2) { const cr = this.textures.exists('ground_crack') ? this.add.image(x, y, 'ground_crack').setDepth(y - 8).setDisplaySize(q.rad * 1.6, q.rad * 1.6 * YR) : null; if (cr) this.tweens.add({ targets: cr, alpha: 0, delay: 2500, duration: 1200, onComplete: () => cr.destroy() }); this.cameras.main.shake(90, 0.003); }
    if (q.fire) { this.fireZones.push({ owner: q.owner, x, y, r: q.rad * 0.9, t: a.fire, tick: 0, dmg: q.dmg * 0.25 }); this.vfx('burning_ground', x, y, { scale: 3, below: true }); }
  }
  drawTireBars() {   // health bar over every damaged Leandro tire wall piece
    const g = (this.tireBarG ||= this.add.graphics().setDepth(99000)); g.clear(); if (this.bot) return;
    for (const o of this.obstacles) if (o.maxHp != null && o.s?.scene) {   // every tire shows its health (green) and, right under it, a white bar with the time it has left
      const w = 40, f = Math.max(0, o.hp / o.maxHp), tl = Math.max(0, o.left / o.life0), y = o.y - o.h - 18;
      g.fillStyle(0x000000, 0.75).fillRect(o.x - w / 2 - 1, y - 1, w + 2, 12).fillStyle(f > 0.5 ? 0x4cd964 : f > 0.25 ? 0xffc83d : 0xff4a3a, 1).fillRect(o.x - w / 2, y, w * f, 6).fillStyle(0xffffff, 1).fillRect(o.x - w / 2, y + 7, w * tl, 3);
    }
  }
  updateTireShots(dt) {
    this.drawTireBars();
    this.tireShots = this.tireShots.filter(q => {
      const legs = q.dur.length;
      if (q.squash > 0) {   // contact frame
        if ((q.squash -= dt) > 0) return true;
        if (q.leg >= legs) { q.s.destroy(); q.sh.destroy(); return false; }
        q.s.setTexture(q.fire && this.textures.exists('tire_fire') ? 'tire_fire' : 'tire'); return true;
      }
      q.t += dt; let k = Math.min(1, q.t / q.dur[q.leg]);
      const u = q.fr[q.leg] + (q.fr[q.leg + 1] - q.fr[q.leg]) * k; let gx = q.x0 + q.dx * q.D * u, gy = q.y0 + q.dy * q.D * u;
      gy = Phaser.Math.Clamp(gy, WALK_Y0, WALK_Y1); gx = Phaser.Math.Clamp(gx, 60, WORLD_W - 60); q.lx = gx; q.ly = gy;   // tires fly over forest and cliffs and may land on them; only the map limits stop them
      const h = 150 * (1 - 0.28 * q.leg) * Math.sin(Math.PI * k);
      q.s.setPosition(gx, gy - h - 22).setDepth(gy + 1).setRotation(q.s.rotation + dt * 12).setDisplaySize(54, 54); q.sh.setPosition(gx, gy).setScale(1 - h / 260);
      if (k >= 1) {
        this.tireLand(q, gx, gy); q.leg++; q.t = 0; q.squash = 0.14; q.s.setRotation(0).setPosition(gx, gy - 18);
        const sq = q.fire ? 'tire_fire_squash' : 'tire_squash';
        if (this.textures.exists(sq)) q.s.setTexture(sq).setDisplaySize(70, 46); else q.s.setDisplaySize(72, 36);
        if (q.leg >= legs) q.squash = 0.35;
      }
      return true;
    });
  }
  updateFireZones(dt) {
    this.fireZones = this.fireZones.filter(z => {
      z.t -= dt; z.tick -= dt;
      if (z.tick <= 0) { z.tick = 0.5; this.vfx('burning_ground', z.x + Phaser.Math.Between(-30, 30), z.y + Phaser.Math.Between(-20, 20), { scale: 2.4, below: true, alpha: 0.9 }); for (const t of this.enemiesOf(z.owner)) if (!t.isTower && !t.def?.lane && eDist(t.x, t.y, z.x, z.y) <= z.r + t.br * 0.5) this.damage(z.owner, t, z.dmg, 'magic', true); }
      return z.t > 0;
    });
  }
  resolveSolids(f) {
    if (this.cages.length) this.cageClamp(f);
    for (const n of this.fighters) if (n.isNexus && n.alive) {
      const min = n.br * 0.8 + BODY_R * 0.6, dx = f.x - n.x, dy = f.y - n.y, d = Math.hypot(dx, dy) || 1;
      if (d < min) { f.x += dx / d * (min - d); f.y += dy / d * (min - d); }
    }
    for (let pass = 0; pass < 2; pass++) {
      for (const o of this.obstacles) {
        if (o.gate && o.team === f.team) continue;   // lane walls let their own team through
        const min = o.r + BODY_R * 0.7;
        let dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy);
        if (d >= min) continue;
        if (d < 0.5) { const side = Math.sign(dx * o.nx + dy * o.ny) || 1; dx = o.nx * side; dy = o.ny * side; d = 1; }
        f.x += dx / d * (min - d); f.y += dy / d * (min - d);
      }
      f.x = Phaser.Math.Clamp(f.x, 60, WORLD_W - 60); f.y = Phaser.Math.Clamp(f.y, WALK_Y0, WALK_Y1);
    }
  }

  // base: healing fountain + shop zone around each team's nexus
  inBase(f) { const n = this.fountains?.[f.baseTeam]; return !!n && f.alive && ((f.x - n.x) / 520) ** 2 + ((f.y - n.y) / 370) ** 2 < 1; }   // the base's healing circle
  canShop(f) { return !this.survival && !!f.isChamp && (!f.alive || this.training || this.inBase(f)); }   // a dead champion can shop from anywhere while waiting
  drawFountain() {
    if (!this.fountG) return; const g = this.fountG, t = this.time.now / 1000; g.clear();
    this.fountains.forEach(n => {
      const c = n.team === 0 ? 0x4aa3ff : 0xff5a4a, pulse = 0.5 + 0.5 * Math.sin(t * 2);
      g.fillStyle(c, 0.06 + 0.03 * pulse).fillEllipse(n.x, n.y, 1040, 740);
      g.lineStyle(3, c, 0.5).strokeEllipse(n.x, n.y, 1040, 740);
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + t * 0.4; g.fillStyle(c, 0.5).fillCircle(n.x + Math.cos(a) * 520, n.y + Math.sin(a) * 370, 4); }
    });
  }

  /* ---------- items: active effects ---------- */
  useActive(f, a, m) {
    const w = this;
    w.audio.play('ui_select', { at: f, vol: 0.5, gap: 100 });
    if (a.type === 'multi') { a.parts.forEach(pt => w.useActive(f, pt, a.m || 1.5)); return; }   // combined actives of the new level-3 items
    if (a.type === 'blink') {   // rocket thruster: a quick dash along the aim (stops at walls) and a speed boost
      let d = 0; while (d < a.dist) { const nd = Math.min(a.dist, d + 20), nx = f.x + f.ax * nd, ny = f.y + f.ay * nd * 0.75; if (!isWalk(nx, ny) || ny < WALK_Y0 || ny > WALK_Y1 || this.solidAt(nx, ny, f.team)) break; d = nd; }
      f.x += f.ax * d; f.y += f.ay * d * 0.75; f.speedBoost = 0.3; f.speedT = a.time; w.vfx('shockwave', f.x, f.y - 6, { scale: 2.4, below: true, tint: 0xffaa44 }); w.vfx('buff', f.x, f.cy, { scale: 3, tint: 0xffaa44 }); w.float(f.x, f.y - f.def.height - 34, '¡Propulsor!', '#ffaa44'); return;
    }
    if (a.type === 'shield') { w.markSrc(f, 'shield'); f.shieldHp = Math.max(f.shieldHp, 150 * m); f.shieldT = a.time; w.float(f.x, f.y - f.def.height - 34, `Escudo ${Math.round(f.shieldHp)}`, '#7ee0ff'); }
    else if (a.type === 'sprint') { f.speedBoost = 0.35 + 0.05 * m; f.speedT = a.time; w.vfx('buff', f.x, f.cy, { scale: 3 }); w.float(f.x, f.y - f.def.height - 34, '¡Sprint!', '#ffd23f'); }
    else if (a.type === 'smoke') { w.enemiesWithin(f, 260).forEach(t => t.slow(Math.min(0.7, 0.3 + 0.07 * m), a.time + 0.5 * m)); for (let i = 0; i < 6; i++) w.vfx('run_dust', f.x + (Math.random() - 0.5) * 300, f.y + (Math.random() - 0.5) * 120, { scale: 3.5, alpha: 0.8 }); }
    else if (a.type === 'recall') { f.recall = { t: 4, T: 4 }; w.float(f.x, f.y - f.def.height - 34, 'Teletransportando...', '#7ee0ff'); }
    else if (a.type === 'mortar') {
      const t = this.nearestEnemy(f, 800), px = t ? t.x : f.x + f.ax * 260, py = t ? t.y : f.y + f.ay * 260;
      const x = Phaser.Math.Clamp(f.x + (px - f.x) * 0.45, 60, WORLD_W - 60), y = Phaser.Math.Clamp(f.y + (py - f.y) * 0.45, WALK_Y0, WALK_Y1);
      const img = this.add.image(x, y, 'item_mortero_portatil').setOrigin(0.5, 0.9).setDepth(y); img.setScale(70 / Math.max(img.width, img.height));
      this.mortars.push({ owner: f, x, y, img, t: a.life + 2 * m, fireT: 1.0, dmg: 45 * m + f.ap * 0.5 + f.atk * 0.4 });
    }
    else if (a.type === 'soldiers' || a.type === 'drone') {
      const n = a.type === 'soldiers' ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const key = a.type === 'drone' ? 'drone' : (f.baseTeam === 0 ? 'minion_blue_melee' : 'minion_red_melee');
        const slot = { x: -f.facing * (70 + i * 30), y: (i % 2 ? 1 : -1) * 44 };
        const b = new Fighter(this, key, f.team, f.x + slot.x, f.y + slot.y, { ai: true, owner: f, life: a.life + 3 * m, botAp: 30 * m + f.ap * 0.4, slot });
        if (a.type === 'soldiers') { b.def = { ...b.def, stats: { ...b.def.stats, hp: b.def.stats.hp * m * 1.2 } }; b.hp = b.maxHp; b.summoned = true; }
        b.ax = f.ax; b.ay = f.ay; this.fighters.push(b); this.vfx('summon', b.x, b.y - 10, { scale: 2.2, below: true });
      }
    }
  }
  updateMortars(dt) {
    this.mortars = this.mortars.filter(m => {
      m.t -= dt; m.fireT -= dt;
      if (m.t <= 0 || !m.owner.alive) { m.img.destroy(); return false; }
      if (m.fireT <= 0) {
        const t = this.nearestEnemy({ x: m.x, y: m.y, team: m.owner.team, isTower: false }, 700);
        if (t) {
          m.fireT = 2.2; this.net?.onShell(m.x, m.y - 30, t.x, t.y);
          const sx = m.x, sy = m.y - 30, tx = t.x, ty = t.y, shell = this.add.circle(sx, sy, 7, 0x333333).setDepth(100000);
          this.tweens.add({ targets: shell, x: tx, y: { value: ty - 8, ease: 'Sine.In' }, scale: 1.8, duration: 800, onComplete: () => {
            shell.destroy(); this.vfx('shockwave', tx, ty, { scale: 3, below: true }); this.vfx('spark', tx, ty - 20, { scale: 4, tint: 0xffb020 }); this.audio.play('explosion', { at: { x: tx, y: ty }, vol: 0.8, gap: 60 });
            this.enemiesNear(m.owner.team, tx, ty, 95).forEach(e => this.damage(m.owner, e, m.dmg, 'physical'));
          } });
          this.audio.play('cannon', { at: m, vol: 0.5, gap: 100 });
        } else m.fireT = 0.4;
      }
      return true;
    });
  }

  /* ---------- AI (enemy champion + bots) ---------- */
  runAi(f, dt = 0.016) {
    if (f.isChamp && !f.owner && !f.antivirus) { runChampAi(this, f, dt); if (f.alive && !f.free) f.in = { mx: 0, my: 0, run: false }; return; }
    f.in = { mx: 0, my: 0, run: false };
    if (!f.alive || !f.free || f.away || f.drop) return;
    if (f.surv) return this.runMob(f);
    if (f.bossKind) return this.runBoss(f, dt);
    if (f.campGuard) return this.runCamp(f);
    if (f.antivirus) return this.runAntivirus(f);
    if (f.def.bot === 'wall') return;
    if (f.def.guard && f.owner) {   // bodyguards never leave their formation around Maduro: they only strike what is already inside their reach
      this.escort(f); const t = this.nearestEnemy(f, f.def.stats.range + 40);
      if (t && !t.isTower) { const dx = t.x - f.x, dy = t.y - f.y; if (Math.hypot(dx, dy) - (t.br - BODY_R) <= f.def.stats.range) { f.setAim(dx, dy); f.tryBasic(); } }
      return;
    }
    if (f.def.bot === 'crate') return this.crateTick(f, dt);
    if (f.isNexus) return;
    if (f.isTower) return this.runTower(f);
    if (f.isMinion) return this.runMinion(f);
    const range = f.def.stats.range;
    let t = this.nearestEnemy(f, f.blindT > 0 ? 150 : f.enraged ? 1500 : f.isBot ? 600 : f.def.guard ? 260 : 900);
    if (f.def.guard && t && f.owner && dist(t, f.owner) > 340) t = null;   // bodyguards only fight what is close to Maduro
    if (!t) {
      if (f.home) {   // no target: scuttle around the box all the time
        if (!f.home.alive || f.home.dispose) { f.dispose = true; return; }
        if (!f.wp || (f.wpT -= 0.016) <= 0 || Math.hypot(f.wp.x - f.x, f.wp.y - f.y) < 12) { const an = Math.random() * 6.283, rr = 30 + Math.random() * 60; f.wp = { x: f.home.x + Math.cos(an) * rr, y: f.home.y + Math.sin(an) * rr * YR }; f.wpT = 1 + Math.random(); }
        const dx = f.wp.x - f.x, dy = f.wp.y - f.y; f.in.mx = dx; f.in.my = dy; f.setAim(dx, dy); return;
      }
      if (!f.owner && f.isChamp) { f.in.mx = f.team === 0 ? 1 : -1; f.in.my = (LANE_MID - f.y) * 0.03; f.setAim(f.in.mx, 0); return; }   // AI champions push the middle lane
      if (f.enraged) { const e = this.enemiesOf(f).filter(q => q.isChamp).sort((a, b) => dist(a, f) - dist(b, f))[0]; if (e) { f.in.mx = e.x - f.x; f.in.my = e.y - f.y; f.in.run = true; f.setAim(f.in.mx, f.in.my); } return; }   // berserk bots hunt the nearest enemy champion
      if (f.owner && !f.def.static) this.escort(f);   // sentries, turrets and walls never follow their owner (escort would even teleport them when far away)
      return;
    }
    const dx = t.x - f.x, dy = t.y - f.y, ad = Math.hypot(dx, dy) - (t.br - BODY_R);
    f.setAim(dx, dy);
    if (f.def.static) { if (ad <= range) f.tryBasic(); return; }   // static robots only turn and shoot
    const ranged = range > 150;
    if (ad > range * 0.85) { f.in.mx = dx; f.in.my = dy; }
    else if (ranged && ad < range * 0.4) { f.in.mx = -dx; f.in.my = -dy; }
    if (ad <= range) f.tryBasic();
    if (!f.isBot && f.charmT <= 0 && f.silenceT <= 0 && ad < range * 1.6 && Math.random() < 0.02) {
      const learned = ABILITY_KEYS.filter(a => f.ranks[a] && f.cds[a] <= 0);
      if (learned.length) f.tryCast(learned[Math.random() * learned.length | 0]);
    }
  }

  // champion that recently attacked one of our champions (minions and towers on that team retaliate while it is in range)
  huntedBy(f, range) {
    let t = null, best = 1e9;
    for (const e of this.enemiesOf(f)) if (e.hunted && e.hunted.team === f.team && (f.isTower || !e.invis)) { const d = dist(e, f) - (e.br - BODY_R); if (d <= range && d < best) { best = d; t = e; } }
    return t;
  }

  runTower(f) {   // shoots whoever attacked an allied champion, otherwise the nearest enemy in range (minions first)
    let t = this.huntedBy(f, f.def.stats.range), best = 1e9;
    if (!t) for (const e of this.enemiesOf(f)) { if (e.inBush && e.hiddenInBush(f.baseTeam)) continue; const d = dist(e, f); if (d <= f.def.stats.range && d - (e.isMinion ? 120 : 0) < best) { best = d - (e.isMinion ? 120 : 0); t = e; } }
    if (t) { f.setAim(t.x - f.x, t.y - f.y); f.tryBasic(); }
  }

  runMinion(f) {  // walks the lane toward the enemy base, fights whatever comes in range
    if (f.owner) {   // summoned soldiers: fight what is near, otherwise escort the owner
      const t0 = this.nearestEnemy(f, 420);
      if (t0) { const dx = t0.x - f.x, dy = t0.y - f.y, d = Math.hypot(dx, dy); f.setAim(dx, dy); if (d > f.def.stats.range * 0.9) { f.in.mx = dx; f.in.my = dy; } if (d <= f.def.stats.range) f.tryBasic(); }
      else this.escort(f);
      return;
    }
    const range = f.def.stats.range, t = this.huntedBy(f, Math.max(380, range + 60)) || this.nearestEnemy(f, Math.max(380, range + 60));
    if (f.path && !t) {   // reinforcements from a camp follow their own route (top / bottom) to the enemy nexus
      while (f.path.length > 1 && Math.hypot(f.path[0].x - f.x, f.path[0].y - f.y) < 50) f.path.shift();
      if ((f.stuckT = (f.stuckT || 0) + 0.016) > 1) { if (Math.hypot(f.x - (f.stuckX ?? -999), f.y - (f.stuckY ?? -999)) < 14 && f.path.length > 1) f.path.shift(); f.stuckT = 0; f.stuckX = f.x; f.stuckY = f.y; }   // not getting anywhere for 1 s: skip the waypoint
      const w0 = f.path[0]; f.in.mx = w0.x - f.x; f.in.my = w0.y - f.y; f.setAim(f.in.mx, f.in.my); return;
    }
    if (t) {
      const dx = t.x - f.x, dy = t.y - f.y, d = Math.hypot(dx, dy) - (t.br - BODY_R);
      f.setAim(dx, dy);
      const reff = t.isTower ? Math.min(range, towerCircle(t) * 0.8) : range;   // structures can only be hit from inside their circle
      if (d > reff * 0.9) { f.in.mx = dx; f.in.my = dy; }
      if (d <= reff) f.tryBasic();
    } else {
      f.in.mx = f.team === 0 ? 1 : -1; f.in.my = (laneYAt(f.laneI ?? 1, f.x) + (f.slot.y || 0) - f.y) * 0.05;
      f.setAim(f.in.mx, 0);
    }
  }

  // Leandro's contracts: green infected area
  infectZone(o, x, y, r, life, total) {   // `total` = the most damage the zone does to someone who stays inside for its whole life (half of the contract's impact)
    this.zones.push({ kind: 'infect', owner: o, x, y, r, t: life, life0: life, tick: 0.5, total, ctx: this.castCtx });
    this.zoneDecal(x, y, r * 0.8, 0x7dff4a, 0.5); this.vfx('poison_cloud', x, y - 10, { scale: 3, alpha: 0.8 });
  }
  // Axel's Canaima: black hole + explosion
  blackHole(o, x, y, r, life, pull, dmg) {
    this.zones.push({ kind: 'blackhole', owner: o, x, y, r, t: life, T: life, pull, dmg, ctx: this.castCtx });
    this.vfx('summon', x, y - 10, { scale: 4, below: true, tint: 0xa56bff });
  }

  /* ---------- Jorbi's "15 Minutos más": rewind ---------- */
  recordHistory(dt) {   // positions of every minion / champion for the last ~16 s (10 samples per second); only the simulating side keeps it
    this.histT = (this.histT || 0) - dt; if (this.histT > 0 || this.net?.role === 'client') return; this.histT = 0.1;
    const d = new Map(); this.fighters.forEach(f => { if (f.alive && (f.isChamp || f.isMinion)) d.set(f.nid, [Math.round(f.x), Math.round(f.y)]); });
    (this.hist ||= []).push({ t: this.gameT, d }); while (this.hist.length && this.gameT - this.hist[0].t > 16) this.hist.shift();
  }
  startRewind(owner, a, rank) {
    if (this.net?.role === 'client') return;
    const now = this.gameT, back = rk(a.rewind, rank), dur = rk(a.travel, rank), lines = [], units = this.fighters.filter(f => f.alive && !f.away && (f.isChamp || f.isMinion) && !f.owner);
    for (const f of units) {
      const path = []; for (const h of this.hist || []) { if (now - h.t > back + 0.05) continue; const e = h.d.get(f.nid); if (e) path.push(e); }
      if (path.length < 2) continue; path.push([Math.round(f.x), Math.round(f.y)]);
      f.rw = { path, t: 0, dur }; f.pending = null; f.stunT = 0; f.state = 'idle';
      lines.push({ team: f.team, pts: path });
    }
    this.announceRewind(owner, back, dur); this.showRewind(lines, dur); this.net?.onRewind(lines, dur, owner, back);
    this.after(dur + 0.05, () => this.finishRewind(owner, a, rank, units));
  }
  finishRewind(owner, a, rank, units) {
    const t = rk(a.buffTime, rank), sh = rk(a.shield, rank), sp = rk(a.speedBoost, rank), sl = rk(a.slow, rank);
    this.castCtx = { f: owner, k: 'ult' };
    units.forEach(f => {
      if (!f.alive) return;
      if (f.team === owner.team) { this.markSrc(f, 'shield'); this.markSrc(f, 'speed'); f.shieldHp = Math.max(f.shieldHp, sh + f.maxHp * a.shieldHpPct); f.shieldT = t; f.speedBoost = sp; f.speedT = t; this.vfx('buff', f.x, f.cy, { scale: 2.6 }); }
      else { f.slow(sl, t); this.vfx('spark', f.x, f.cy, { scale: 3, tint: 0x66aaff }); }
    });
    this.castCtx = null; this.audio.play('ui_upgrade', { at: owner, vol: 0.8, gap: 0 });
  }
  // announcement on every player's screen
  announceRewind(owner, back, dur = 1.5) {
    this.rwGlow = { t: dur + 3, T: dur + 3, hg: 2.6 };   // golden screen glow while the effect lasts + the hourglass on every screen
    this.showBanner({ title: `${owner.def.name.toUpperCase()} USÓ SU RELOJ`, sub: `La partida retrocede ${back} segundos`, team: owner.baseTeam, face: this.faceOf(owner), kind: 'streak', big: 3 }, 3200);
    this.audio.play('ui_announce', { vol: 0.8, gap: 0 });
  }
  showRewind(lines, dur) { this.rwTrail = { lines, t: 0, dur: dur + 1.4 }; }
  drawRewind(dt) {
    const R = this.rwTrail; if (!R) { this.rwG?.clear(); return; }
    R.t += dt; const g = (this.rwG ||= this.add.graphics().setDepth(99980)); g.clear();
    if (R.t > R.dur) { this.rwTrail = null; return; }
    const alpha = Math.min(1, (R.dur - R.t) / 1.0), me = this.player.baseTeam;
    for (const L of R.lines) {
      const col = L.team === me ? 0x66d0ff : 0xff6a5a; g.lineStyle(3, col, 0.75 * alpha).beginPath();
      L.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.strokePath();
      L.pts.forEach((p, i) => { if (i % 6 === 0) g.fillStyle(0xffffff, 0.8 * alpha).fillCircle(p[0], p[1], 3); });
    }
  }


  /* ---------- capturable camps + reinforcement ships ---------- */
  // where the minions of `team` leave in lane `li`: from the lane just in front of the base
  flagPos(team, li) { const x = 780 * F; return { x: team === 0 ? x : WORLD_W - x, y: laneYAt(li, x) }; }
  drawTowerFlags() {   // every tower carries the same waving flag that marks a captured camp (its team's colour)
    if (this.training || this.survival || this.bot) return;
    for (const t of this.fighters) {
      if (!t.isTower || t.isNexus) continue;
      const fk = 'flag_' + (t.team === 0 ? 'blue' : 'red');
      if (!t.alive || !this.textures.exists(fk)) { t.flagSpr?.destroy(); t.flagSpr = null; continue; }
      if (!t.flagSpr) { t.flagSpr = this.add.sprite(t.x + 46, t.y + 46, fk).setOrigin(0.5, 0.92).setScale(1.2); if (this.anims.exists(fk)) t.flagSpr.play(fk); }
      t.flagSpr.setVisible(!t.hiddenFor?.(this.pc) && !t.fogHidden).setDepth(t.y + 50);
    }
  }
  // bushes: patches of scenery where champions can hide (see Fighter.hiddenInBush)
  buildBushes() {
    if (this.survival) { this.bushes = []; return; }   // hiding places: clumps of the olive bushes of the map's Nature pack (Topdown RPG 32x32) on a patch of light grass, right on the borders of the lanes
    this.bushes = [];
    for (let li = 0; li < 3; li++) [[0.27, li === 0 ? 1 : -1], [0.43, li === 2 ? -1 : 1]].forEach(([fx, side]) => [fx * WORLD_W, (1 - fx) * WORLD_W].forEach(xx => this.bushes.push({ x: xx, y: laneYAt(li, xx) + side * LANE_HALF, rx: 140, ry: 80, side, li })));
    for (let li = 0; li < 3; li++) for (const sg of [-1, 1]) { const xx = WORLD_W / 2 + sg * 340, side = li === 0 ? 1 : -1; this.bushes.push({ x: xx, y: laneYAt(li, xx) + side * LANE_HALF, rx: 140, ry: 80, side, li }); }   // lane borders next to the river
    if (this.bot || !this.textures.exists('bushes')) return;
    if (!this.textures.exists('bush_grass_m0')) {   // ground under a bush: same colours / chunky leaf texture as the bush, with an IRREGULAR outline (3 variants)
      const W = 150, H = 90, TONES = [[116, 130, 34], [146, 158, 40], [146, 158, 40], [170, 182, 54]], bw = Math.ceil(W / 3);
      for (let v = 0; v < 3; v++) {
        const t = this.textures.createCanvas('bush_grass_m' + v, W, H), c = t.getContext(), im = c.createImageData(W, H), d = im.data, R2 = rng(7 + v * 13), ph = [R2() * 6.28, R2() * 6.28, R2() * 6.28, R2() * 6.28];
        const blk = new Uint8Array(bw * Math.ceil(H / 3)).map(() => (R2() * TONES.length) | 0);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2), ang = Math.atan2(dy, dx), rad = 0.86 + 0.13 * Math.sin(3 * ang + ph[0]) + 0.09 * Math.sin(5 * ang + ph[1]) + 0.06 * Math.sin(9 * ang + ph[2]) + 0.04 * Math.sin(13 * ang + ph[3]);   // wavy, lumpy outline
          const e = Math.hypot(dx, dy) / rad, o = (y * W + x) * 4; if (e > 1) continue;
          let [r, g, b] = TONES[blk[((y / 3) | 0) * bw + ((x / 3) | 0)]]; if (e > 0.82) { r = 116; g = 130; b = 34; }
          d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
        }
        c.putImageData(im, 0, 0); t.refresh(); t.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }
    const R = rng(2024), tx = this.textures.get('bushes');
    for (const b of this.bushes) {
      b.spr = []; b.sway = 0;
      [['bushA', 0, 0], ['bushB', -80, 6], ['bushD', 70, 4]].forEach(([fr, dx, dy], i) => {
        if (!tx.has(fr)) return;
        const o = this.add.image(b.x + dx, b.y + dy + b.side * 6 + (i ? 12 : 26), 'bushes', fr).setOrigin(0.5, 1).setScale(2.1 - i * 0.15).setFlipX(R() < 0.5); o.setDepth(o.y);
        const g = this.add.image(o.x, o.y - o.displayHeight * 0.18, 'bush_grass_m' + ((R() * 3) | 0)).setDisplaySize(o.displayWidth * 1.22, o.displayHeight * 0.98).setDepth(-4).setFlipX(R() < 0.5);   // grass only where the bush stands
        this.mapSprites.push(o, g); b.spr.push(o);
      });
    }
  }
  updateRecallFx(dt) {   // return to base: white lines rise from a circle on the ground to the sky (more and more of them, faster); at the base they come back down
    if (this.bot) return; const g = (this.recallG ||= this.add.graphics().setDepth(99960)); g.clear();
    for (const f of this.fighters) {
      const R = f.recall, F = f.recallFx; if (!R && !F) { f.rfRings = null; continue; }
      const st = (f.rfRings ||= { list: [], acc: 0 }); let rate, dir = 1, p = 1;
      if (R) { p = 1 - R.t / (R.T || 10); rate = 3 + 40 * p * p; } else if (F.phase === 'out') rate = 90; else { rate = 70; dir = -1; p = 1 - F.t / 0.4; }
      st.acc += rate * dt; while (st.acc >= 1) { st.acc -= 1; const a = Math.random() * 6.2832; st.list.push({ age: 0, dir, cx: Math.cos(a) * (0.35 + 0.65 * Math.random()), cy: Math.sin(a) * (0.35 + 0.65 * Math.random()), len: 60 + Math.random() * 120 * (0.4 + p) }); }
      const life = R ? 0.9 - 0.45 * p : 0.3, hh = 560, RC = 48;
      st.list = st.list.filter(r => (r.age += dt) < life);
      g.lineStyle(2, 0xffffff, 0.35 + 0.35 * p).strokeEllipse(f.x, f.y, RC * 2, RC * 2 * YR);   // the circle on the ground
      for (const r of st.list) {
        const u = r.age / life, head = (r.dir > 0 ? u : 1 - u) * hh, a = (r.dir > 0 ? 1 - u * u : u) * (0.5 + 0.5 * p), x = f.x + r.cx * RC, y = f.y + r.cy * RC * YR;
        g.lineStyle(2, 0xffffff, a).lineBetween(x, y - Math.max(0, head - r.len), x, y - head);
      }
    }
  }
  // ---- Maduro's box (E): thrown, stays on the map, spawns bugs, poisons the area ----
  throwBox(owner, c, a, rank) {   // the logic runs on a timer (not a tween), so the headless host creates the box too; the arc is only drawn where there is a screen
    const x0 = owner.x, y0 = owner.y - owner.def.height * 0.6;
    if (!this.bot) {
      const img = this.add.image(x0, y0, 'empty_box').setDepth(99000), k = { v: 0 }; img.setScale(64 / Math.max(1, img.height));
      this.tweens.add({ targets: k, v: 1, duration: 650, ease: 'Sine.easeInOut', onUpdate: () => { img.setPosition(x0 + (c.x - x0) * k.v, y0 + (c.y - y0) * k.v - Math.sin(Math.PI * k.v) * 190).setAngle(k.v * 540); },
        onComplete: () => { img.destroy(); this.vfx('shockwave', c.x, c.y, { scale: 3, below: true, tint: 0xffd23f }); this.vfx('run_dust', c.x, c.y - 6, { scale: 3, alpha: 0.9 }); } });
    }
    if (this.net?.role === 'client') return;   // the crate itself comes from the host in the snapshots
    this.after(0.65, () => {
      if (!owner.alive && owner.dispose) return;
      const cr = new Fighter(this, 'crate', owner.team, c.x, c.y, { ai: true, owner, life: a.life }); cr.def = { ...cr.def, stats: { ...cr.def.stats, hp: rk(a.hp, rank) } }; cr.hp = cr.maxHp; cr.spawnT = 1.5; cr.bugs = []; cr.crateRank = rank; this.fighters.push(cr);
    });
  }
  crateTick(f, dt) {
    const a = CHAMPIONS.maduro.abilities.p3, r = f.owner?.ranks?.p3 || f.crateRank || 1; f.bugs = (f.bugs || []).filter(b => b.alive && !b.dispose);
    f.bugCap = rk(a.bugCap, r); f.spawnMax ||= f.spawnT || 1.5;
    f.bugFull = f.bugs.length >= f.bugCap;
    if (f.bugs.length < rk(a.bugCap, r) && (f.spawnT = (f.spawnT ?? 2) - dt) <= 0) {
      f.spawnT = f.spawnMax = rk(a.bugEvery, r); const ang = Math.random() * 6.283, b = new Fighter(this, 'roach', f.team, f.x + Math.cos(ang) * 40, f.y + Math.sin(ang) * 30, { ai: true, owner: f.owner, botAp: rk(a.bugDmg, r) });
      b.def = { ...b.def, stats: { ...b.def.stats, hp: rk(a.bugHp, r), armor: rk(a.bugArmor, r) } }; b.hp = b.maxHp; b.home = f; { const k = b.bugK = rk(a.bugScale, r); b.baseScale *= k; b.spr.setScale(b.baseScale); b.shadow?.setScale(b.shadow.scaleX * k, b.shadow.scaleY * k); } this.fighters.push(b); f.bugs.push(b); this.vfx('run_dust', b.x, b.y - 4, { scale: 1.2, alpha: 0.8 });
    }
    if ((f.poisonT = (f.poisonT || 0) - dt) <= 0) { f.poisonT = 0.5; this.enemiesNear(f.team, f.x, f.y, a.radius).forEach(t => { if (!t.isTower && !t.def?.static) t.poison(rk(a.poison, r), 1.0, f.owner, 'physical', 'crate' + f.nid); }); }
  }
  drawCrates() {   // poison area around every box
    const g = (this.crateG ||= this.add.graphics().setDepth(-869)); g.clear(); if (this.bot) return; const t = this.time.now / 1000, R = CHAMPIONS.maduro.abilities.p3.radius;
    for (const f of this.fighters) if (f.def?.bot === 'crate' && f.alive) { const pulse = 0.5 + 0.5 * Math.sin(t * 2 + f.nid); const rx = R, ry = R * YR * 0.9, tm = this.time.now;   // same toxic look as a poisoned champion, over the whole area
      g.fillStyle(0x4fbf3a, 0.2 + 0.07 * pulse).fillEllipse(f.x, f.y, rx * 2, ry * 2).lineStyle(3, 0x9be37a, 0.75).strokeEllipse(f.x, f.y, rx * 2, ry * 2).lineStyle(2, 0x2f8f2a, 0.6).strokeEllipse(f.x, f.y, rx * 1.3, ry * 1.3);
      for (let i = 0; i < 26; i++) { const ph = ((tm / 1100) + i * 0.137) % 1, an = i * 2.4 + f.nid, rr = 0.15 + 0.85 * ((i * 0.618) % 1); g.fillStyle(0xb8ff9a, 0.7 * (1 - ph)).fillCircle(f.x + Math.cos(an) * rx * rr, f.y + Math.sin(an) * ry * rr - ph * 55, 3 + 3 * (1 - ph)); } }
  }
  // ground stains (Decreto presidencial level 3)
  addStain(x, y, r, life) { const bl = []; for (let i = 0; i < 6; i++) bl.push([(Math.random() - 0.5) * r * 1.4, (Math.random() - 0.5) * r * 0.9, r * (0.35 + Math.random() * 0.4)]); (this.stains ||= []).push({ x, y, bl, t: life, T: life }); }
  drawStains(dt) {
    const g = (this.stainG ||= this.add.graphics().setDepth(-868)); g.clear(); if (!this.stains?.length) return;
    this.stains = this.stains.filter(s => (s.t -= dt) > 0);
    for (const s of this.stains) { const a = Math.min(1, s.t / 1.5) * 0.55; for (const [dx, dy, r] of s.bl) g.fillStyle(0x8a0f0f, a).fillEllipse(s.x + dx, s.y + dy, r * 2, r * 2 * YR); g.fillStyle(0x500606, a * 0.7).fillEllipse(s.x, s.y, s.bl[0][2] * 1.2, s.bl[0][2] * 0.9); }
  }
  updateMeet(dt) {   // the first time a champion sees an enemy champion it says its 'meet' line (once per enemy champion every 40 s)
    if (this.bot || this.over) return; if ((this.meetT = (this.meetT || 0) - dt) > 0) return; this.meetT = 0.5;
    const me = this.pc; if (!me?.alive) return; const seen = (me.metSeen ||= {});
    for (const e of this.fighters) {
      if (!e.isChamp || !e.alive || e.baseTeam === me.baseTeam || e.hiddenFor(me) || eDist(e.x, e.y, me.x, me.y) > 950) continue;
      if (this.gameT - (seen[e.key] ?? -99) < 40) continue;
      if (this.audio.line(me, 'meet', { gap: 5000 })) seen[e.key] = this.gameT; break;
    }
  }
  updateBushes(dt = 0.016) {   // who stands inside a bush (champions only); the bush shakes while somebody moves inside it
    if (!this.bushes) return; const t = this.time.now / 1000;
    for (const b of this.bushes) b.moving = false;
    for (const f of this.fighters) {
      if (!f.isChamp) continue;
      const mv = f._bx !== undefined && Math.hypot(f.x - f._bx, f.y - f._by) > 0.4; f._bx = f.x; f._by = f.y;
      f.inBush = false;
      if (f.alive) for (const b of this.bushes) { const dx = (f.x - b.x) / b.rx, dy = (f.y - b.y) / b.ry; if (dx * dx + dy * dy < 1) { f.inBush = true; if (mv) b.moving = true; } }
    }
    if (this.bot) return;
    for (const b of this.bushes) {
      b.sway = b.moving ? Math.min(1, b.sway + dt * 10) : Math.max(0, b.sway - dt * 3);
      (b.spr || []).forEach((o, i) => { o.setAngle(Math.sin(t * 11 + i * 1.9) * 1.4 * b.sway); o.setScale((o.scaleX >= 0 ? 1 : -1) * Math.abs(o.scaleX), Math.abs(o.scaleY)); });
    }
  }
  setupCamps() {
    this.camps = []; this.ships = []; this.campG = this.add.graphics().setDepth(-870); this.campR = 118;
    if (this.training || this.survival) return;
    const mk = (x, y, ln, owner, tower = null) => { const c = { i: this.camps.length, x, y, ln, lane: y < WORLD_H / 2 ? 'n' : 's', owner, prog: owner === 0 ? [1, 0] : owner === 1 ? [0, 1] : [0, 0], spawnT: 0, contested: false, flag: null, fx: 0, tower }; this.camps.push(c); return c; };
    [RIVER.y0 + 280 * F, RIVER.y1 - 280 * F].forEach((y, k) => mk(WORLD_W / 2 + riverOffset(y), y, k ? 2 : 0, null));   // neutral flags in the middle of the river, at both ends of the map
    for (const t of this.fighters) if (t.isTower && !t.isNexus) mk(t.x + 46, t.y + 46, t.laneI, t.team, t);   // every tower carries a flag; once the tower falls the enemy can capture it
  }
  campOwnerColor(o) { return o === 0 ? 0x4aa3ff : o === 1 ? 0xff4a3a : 0xc9d1dd; }
  updateCamps(dt) {
    if (!this.camps?.length || this.net?.role === 'client' || this.over) return;
    const R = this.campR;
    for (const c of this.camps) {
      if (c.tower?.alive) { c.contested = false; continue; }   // a tower flag cannot be captured while its tower stands
      const n = [0, 0]; for (const f of this.fighters) if (f.isChamp && f.alive && !f.away && !f.drop && eDist(f.x, f.y, c.x, c.y) <= R) n[f.team]++;
      c.contested = n[0] > 0 && n[1] > 0;
      if (!c.contested && (n[0] || n[1])) {
        const T = n[0] ? 0 : 1, O = 1 - T, rate = dt / 8 * (1 + 0.35 * (n[T] - 1));
        if (c.owner === O) { c.prog[O] = Math.max(0, c.prog[O] - rate); if (c.prog[O] <= 0) this.captureCamp(c, T); }   // reconquering: the rival's flag is simply replaced by yours (never a neutral / white flag in between)
        else if (c.prog[O] > 0) c.prog[O] = Math.max(0, c.prog[O] - rate);
        else { c.prog[T] = Math.min(1, c.prog[T] + rate); if (c.prog[T] >= 1 && c.owner !== T) this.captureCamp(c, T); }
      } else if (!c.contested && c.owner != null) c.prog[c.owner] = Math.min(1, c.prog[c.owner] + dt / 20);   // nobody on it: the owner's pie slowly refills
      if (c.owner != null && !(c.tower && c.owner === c.tower.team)) { c.spawnT -= dt; if (c.spawnT <= 0) { c.spawnT = 30; this.dropShip(c, c.owner); } }   // reinforcements only for whoever took a flag from its builder
    }
  }
  captureCamp(c, T) {
    c.owner = T; c.prog[T] = 1; c.prog[1 - T] = 0; c.spawnT = 5;
    this.fighters.forEach(f => { if (f.isChamp && f.team === T && f.alive && eDist(f.x, f.y, c.x, c.y) <= this.campR) f.gold += 80; });
    this.showBanner({ title: '¡CAMPAMENTO RECLAMADO!', sub: `${T === 0 ? 'El equipo azul' : 'El equipo rojo'} controla ${['el carril superior', 'el carril central', 'el carril inferior'][c.ln]}`, team: T }, 3000);
    this.audio.play('ui_announce', { vol: 0.7, gap: 0 }); this.vfx('levelup', c.x, c.y - 30, { scale: 6 }); this.zoneDecal(c.x, c.y, this.campR, this.campOwnerColor(T), 1.5);
    this.net?.onCamp?.();
  }
  lanePath(c, team) {   // from the flag onto its lane, then straight to the enemy base
    const endX = team === 0 ? WORLD_W - 495 * F : 495 * F, raw = [{ x: c.x, y: c.y }, { x: c.x, y: laneYAt(c.ln, c.x) }, { x: endX, y: laneYAt(c.ln, endX) }];
    const pts = [raw[0]]; for (let i = 1; i < raw.length; i++) { const a = raw[i - 1], b = raw[i], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 70); for (let k = 1; k <= n; k++) pts.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n }); }
    return pts;
  }
  // a giant ship descends slowly over the camp and drops 3 minions that then follow the camp's lane to the enemy nexus
  dropShip(c, team) {
    if (this.net?.role === 'client') return;
    this.ships.push({ c, team, t: 0, dur: 9, dropped: false }); this.net?.onShip?.(c.i, team);
  }
  shipVisual(c, team) { this.ships.push({ c, team, t: 0, dur: 9, dropped: true, visual: true }); }
  updateShips(dt) {
    this.ships = this.ships.filter(sh => {
      sh.t += dt; const p = sh.t / sh.dur, c = sh.c, HOV = 250, north = c.lane === 'n';
      const key = sh.team === 0 ? 'ship_human' : 'ship_robot', has = this.textures.exists(key);
      const hy = north ? c.y - HOV : c.y + HOV + 30, edge = north ? -260 : WORLD_H + 330;   // the bottom ships hover at the extreme (below the camp), never over the battlefield   // it always comes in from, and returns to, the nearest map border (never flies across the map)
      const kk = p < 0.45 ? 1 - Math.pow(p / 0.45, 0.6) : p < 0.7 ? 0 : Math.pow((p - 0.7) / 0.3, 2);
      sh.y = hy + (edge - hy) * kk;
      sh.x = c.x + Math.sin(sh.t * 0.9) * 14;
      if (!sh.dropped && p >= 0.55) { sh.dropped = true; this.dropMinions(c, sh.team, sh.y); }
      const a = Math.min(1, Math.max(0, 1 - Math.abs(sh.y - hy) / 900) * 1.6);   // fades in from the border and fades out towards it
      if (!sh.img && has) sh.img = this.add.image(0, 0, key).setDepth(99950);
      // units under the ship: it turns as see-through as possible so nobody is hidden behind it
      const cx = sh.x, cy = sh.y - 90, under = this.fighters.some(f => f.alive && !f.away && !f.drop && Math.abs(f.x - cx) < 210 && Math.abs((f.y - f.def.height * 0.5) - cy) < 150);
      sh.vis = Phaser.Math.Linear(sh.vis ?? 1, under ? 0.12 : 1, Math.min(1, dt * 8));
      if (sh.img) { const k = 380 / sh.img.width; sh.img.setPosition(sh.x, sh.y - 90).setScale(k).setAlpha(a * sh.vis); }
      sh.g ||= Object.assign(this.add.graphics().setDepth(99949)); const g = sh.g; g.clear();
      const a0 = a; 
      if (!has) { const a = a0 * (sh.vis ?? 1), col = sh.team === 0 ? 0x6a7a68 : 0x2a2224, ac = sh.team === 0 ? 0x66e0ff : 0xff4a3a; g.fillStyle(col, a).fillEllipse(sh.x, sh.y - 90, 380, 190).fillStyle(0x111111, a).fillEllipse(sh.x, sh.y - 60, 170, 60).fillStyle(ac, a * (0.6 + 0.4 * Math.sin(sh.t * 8))).fillCircle(sh.x - 140, sh.y - 80, 14).fillCircle(sh.x + 140, sh.y - 80, 14); }
      this.campShadow ||= this.add.graphics().setDepth(-860);
      sh.sh = { x: c.x, y: c.y + 10, a: north ? 0.35 * a : 0 };
      if (sh.t >= sh.dur) { sh.img?.destroy(); g.destroy(); return false; }
      return true;
    });
    const sg = this.campShadow; if (sg) { sg.clear(); this.ships.forEach(sh => { if (sh.sh) sg.fillStyle(0x000000, sh.sh.a).fillEllipse(sh.sh.x, sh.sh.y, 330, 150); }); }
  }
  dropMinions(c, team, fromY) {
    if (this.net?.role === 'client') return;
    const names = team === 0 ? ['minion_blue_melee', 'minion_blue_melee', 'minion_blue_ranged'] : ['minion_red_melee', 'minion_red_melee', 'minion_red_ranged'];
    names.forEach((k, i) => {
      const x = c.x + (i - 1) * 42, y = c.y + 18 + (i % 2) * 14, m = new Fighter(this, k, team, x, y, { ai: true, slot: { x: 0, y: (i - 1) * 24 } });
      m.ax = team === 0 ? 1 : -1; m.path = this.lanePath(c, team); m.laneI = c.ln;
      m.drop = c.lane === 'n' ? { t: -i * 0.18, dur: 1.0, h: Math.max(120, y - fromY + 80) } : { t: -i * 0.18, dur: 1.1, h: 40, slide: { x0: x + (i - 1) * 30, y0: fromY + 10, x1: x, y1: y } };   // bottom ships launch them from the extreme: they fly in towards the camp
      this.fighters.push(m);
    });
    this.audio.play('minion_yell', { at: c, vol: 0.5, gap: 200 });
  }
  // countdown labels (seconds until the next minions): above every owned camp flag and above each nexus
  timerLabel(id, x, y, text, color, show) {
    const m = (this.tmLabels ||= {}); let t = m[id];
    if (!t?.scene) t = m[id] =this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(100001);
    if (!show || !this.inView(x, y, 120)) return t.setVisible(false);
    return t.setVisible(true).setText(text).setColor(color).setPosition(x, y);
  }
  drawTimers() {
    for (const c of this.camps || []) { const own = c.owner != null && !(c.tower && (c.tower.alive || c.owner === c.tower.team)); this.timerLabel('c' + c.i, c.x, c.y + this.campR * 0.75 + 16, `REFUERZOS EN ${Math.max(0, Math.ceil(c.spawnT))}s`, c.owner === 0 ? '#8ab4ff' : '#ff8a8a', own); }
    if (!this.training && !this.survival && this.waveT < 1e8) for (const n of this.fighters) if (n.isNexus) this.timerLabel('n' + n.baseTeam, n.x, n.y + 64, `SÚBDITOS EN ${Math.max(0, Math.ceil(this.waveT))}s`, n.baseTeam === 0 ? '#8ab4ff' : '#ff8a8a', n.alive);
  }
  buildRiver() {   // shallow curved river (pixel-art look): drawn at half resolution and scaled up with nearest-neighbour. The water is see-through so the ground shows through the blue: it is not deep. No flowing animation.
    const P = 2, cx = (RIVER.x0 + RIVER.x1) / 2, y0 = RIVER.y0 - 20, H = Math.ceil((RIVER.y1 + 20 - y0) / P), halfW = Math.round(210 * F), W = halfW * 2 / P, HW = Math.round(84 * F), BANK = 18;
    const wob = riverOffset; this.riverWob = wob; this.riverCx = cx;
    const R = rng(91), pads = []; for (let i = 0; i < 7; i++) pads.push([Math.floor(10 + R() * (W - 20)), Math.floor(R() * H)]);
    const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
    if (this.textures.exists('river_f0')) this.textures.remove('river_f0');
    const t = this.textures.createCanvas('river_f0', W, H), ctx = t.getContext(), im = ctx.createImageData(W, H), d = im.data;
    for (let py = 0; py < H; py++) {
      const wy = y0 + py * P, c = cx + wob(wy), edge = HW + ((py * 7919) % 5 - 2) * 0.9;
      for (let px = 0; px < W; px++) {
        const wx = cx - halfW + px * P, dx = Math.abs(wx - c), o = (py * W + px) * 4, h = hash(px, py) % 90; let r = 0, g = 0, b = 0, a = 0;
        if (dx < edge) {
          const k = dx / edge;   // 0 centre .. 1 bank: the middle is a bit deeper (more tint), the edges are shallow (ground almost clear)
          r = 10 + 50 * k; g = 120 + 50 * k; b = 252 - 10 * k; a = Math.round(122 - 52 * k * k);
          if (h === 0) { r = 150; g = 128; b = 90; a = 130; }          // pebbles on the riverbed
          else if (h === 1) { r = 205; g = 195; b = 150; a = 130; }    // pale sand specks
          else if (h === 2 && k < 0.8) { r = 160; g = 220; b = 210; a = 90; }   // faint glints
          for (const [qx, qy] of pads) if (Math.abs(px - qx) < 4 && Math.abs(py - qy) < 3 && (px - qx) ** 2 / 16 + (py - qy) ** 2 / 9 <= 1) { r = 150; g = 160; b = 44; a = 255; }
        } else if (dx < edge + P) { r = 150; g = 196; b = 184; a = 190; }   // shore light line
        else if (dx < edge + 2 * P) { r = 112; g = 78; b = 58; a = 255; }   // muddy edge
        else if (dx < edge + BANK) { const hh = hash(px, py) % 7; r = hh < 2 ? 140 : 154; g = hh < 2 ? 150 : 162; b = 40; a = dx > edge + BANK - 3 * P && hh < 4 ? 0 : 255; }   // grass bank
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a;
      }
    }
    ctx.putImageData(im, 0, 0); t.refresh(); t.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.riverImg = this.add.image(cx - halfW, y0, 'river_f0').setOrigin(0, 0).setScale(P).setDepth(-995);
  }
  drawRiver() {}   // static: the river no longer animates
  drawCamps(dt) {
    this.updateShips(dt); this.drawTimers(); this.drawRiver(dt);
    if (!this.camps?.length) return; const g = this.campG; g.clear(); const t = this.time.now / 1000;
    for (const c of this.camps) {
      if (!this.inView(c.x, c.y, 220)) { c.flag?.setVisible(false); continue; }
      const a = this.campR, b = a * YR, col = (o) => this.campOwnerColor(o), lock = !!c.tower?.alive;
      if (!lock) g.fillStyle(0x0a0f1a, 0.38).fillEllipse(c.x, c.y, a * 2, b * 2);
      const pie = (frac, color, al) => { if (frac <= 0.001) return; const pts = [{ x: c.x, y: c.y }], n = Math.max(3, Math.ceil(frac * 60)); for (let i = 0; i <= n; i++) { const ang = -Math.PI / 2 + frac * Math.PI * 2 * i / n; pts.push({ x: c.x + Math.cos(ang) * a, y: c.y + Math.sin(ang) * b }); } g.fillStyle(color, al).fillPoints(pts, true); };
      if (!lock) { pie(c.prog[0], col(0), 0.55); pie(c.prog[1], col(1), 0.55);
      g.lineStyle(3, c.contested ? 0xffffff : col(c.owner), c.contested ? 0.5 + 0.5 * Math.sin(t * 10) : 0.9).strokeEllipse(c.x, c.y, a * 2, b * 2);
      g.lineStyle(1, 0xffffff, 0.35).strokeEllipse(c.x, c.y, a * 1.7, b * 1.7); }
      // flag: waving sprite of the owner's colour (grey when neutral); procedural fallback until the art exists
      const fk = 'flag_' + (c.owner === 0 ? 'blue' : c.owner === 1 ? 'red' : 'neutral');
      if (this.textures.exists(fk)) {
        if (!c.flag || c.flagKey !== fk) { c.flag?.destroy(); c.flag = this.add.sprite(c.x, c.y + 14, fk).setOrigin(0.5, 0.92).setScale(1.5); c.flagKey = fk; if (this.anims.exists(fk)) c.flag.play(fk); }
        c.flag.setVisible(true).setDepth(Math.max(c.y + 20, 400));   // above every cliff / tree sprite of the scenery
      } else {
        g.fillStyle(0x222831, 1).fillRect(c.x - 2, c.y - 108, 4, 118); const wv = (u) => Math.sin(t * 5 + u * 5) * 6 * u, W2 = 62, H2 = 40;
        const pts = []; for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push({ x: c.x + 3 + u * W2, y: c.y - 106 + wv(u) }); } for (let i = 8; i >= 0; i--) { const u = i / 8; pts.push({ x: c.x + 3 + u * W2, y: c.y - 106 + H2 + wv(u) }); }
        g.fillStyle(col(c.owner), 1).fillPoints(pts, true).lineStyle(2, 0x000000, 1).strokePoints(pts, true);
      }
    }
  }


  /* ---------- Yonaiker: sentries, traps, sentinel, barricade ---------- */
  spawnSentry(owner, x, y, dmg, life, hp) {
    if (this.net?.role === 'client') return;
    const b = new Fighter(this, 'sentry', owner.team, x, y, { ai: true, owner, life, botAp: dmg });
    b.def = { ...b.def, stats: { ...b.def.stats, hp } }; b.hp = b.maxHp; b.invis = { t: Infinity, trail: 1e9 }; b.ax = owner.ax; b.ay = 0; b.noOwnerDespawn = true;
    this.fighters.push(b); this.vfx('run_dust', x, y - 4, { scale: 2.4, alpha: 0.8, below: true });
    this.sentryMounds ||= []; this.sentryMounds.push({ f: b });
  }
  plantTrap(owner, x, y, r, root, life) {
    if (this.net?.role === 'client') return;
    (this.traps ||= []).push({ x, y, owner, team: owner.team, r, root, t: life, ctx: this.castCtx }); this.vfx('run_dust', x, y - 4, { scale: 2, alpha: 0.7, below: true });
  }
  placeSentinel(owner, x, y, heal, r, life) {   // healing pads: any number; the first allied champion to step on one is healed instantly and it is used up
    if (this.net?.role === 'client') return;
    (this.sentinels ||= []).push({ owner, team: owner.team, x, y, heal, r, t: life }); this.vfx('summon', x, y - 10, { scale: 2.4 });
  }
  buildBarricade(owner, c, rank, a) {   // one long straight fence (vertical or horizontal) + a minigun turret at each end
    if (this.net?.role === 'client') return;
    const vert = !!c.vert, L = a.length, hp = rk(a.wallHp, rank), key = vert ? 'fence_v' : 'fence_h';
    const fence = new Fighter(this, 'fence', owner.team, c.x, c.y, { ai: true, owner });
    fence.def = { ...fence.def, ref: key, tex: key, stats: { ...fence.def.stats, hp }, vert, len: L }; fence.hp = fence.maxHp; fence.ax = 1; fence.ay = 0; this.fighters.push(fence);
    const n = Math.round(L / 40);
    for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 40, x = vert ? c.x : c.x + o, y = vert ? c.y + o : c.y; this.obstacles.push({ x, y, r: 24, team: owner.team, left: Infinity, s: { destroy() {} }, nx: vert ? 1 : 0, ny: vert ? 0 : 1, f: fence }); }
    const turrets = [];
    for (const sg of [-1, 1]) {
      const x = vert ? c.x : c.x + sg * (L / 2 + 26), y = vert ? c.y + sg * (L / 2 + 26) : c.y, t = new Fighter(this, 'minigun', owner.team, x, y, { ai: true, owner, botAp: rk(a.turretDmg, rank) + owner.atk * a.atkScale });
      t.def = { ...t.def, stats: { ...t.def.stats, hp: rk(a.turretHp, rank) } }; t.hp = t.maxHp; t.ax = vert ? 1 : 0; t.ay = vert ? 0 : -1; this.fighters.push(t); turrets.push(t);
    }
    owner.barr = { segs: [fence], turrets, t: 0, maxT: a.maxTime, cd: rk(a.cd, rank) }; this.vfx('shockwave', c.x, c.y - 10, { scale: 4, below: true, tint: 0xffb84a }); this.zoneDecal(c.x, c.y, 120, 0xffb84a, 0.8);
  }
  endBarricade(f) {
    const b = f.barr; if (!b) return; f.barr = null;
    this.obstacles = this.obstacles.filter(o => !b.segs.includes(o.f));
    [...b.segs, ...b.turrets].forEach(u => { if (u.alive) { u.dispose = true; this.vfx('spark', u.x, u.cy, { scale: 3, tint: 0xffb84a }); } });
    f.cds.ult = b.cd;   // the cooldown only starts once the barricade is gone
  }
  updateYonaiker(dt) {
    if (this.net?.role === 'client') return;
    for (const f of this.champs) if (f.barr) { const b = f.barr; b.t += dt; if (!f.alive || b.t > b.maxT || b.segs.every(s => !s.alive)) this.endBarricade(f); }
    this.traps = (this.traps || []).filter(tr => {
      if ((tr.t -= dt) <= 0 || !tr.owner.alive && false) return false;
      const hit = this.fighters.find(e => e.alive && !e.away && !e.drop && !e.isTower && e.team !== tr.team && eDist(e.x, e.y, tr.x, tr.y) <= tr.r * 0.8);
      if (!hit) return true;
      this.castCtx = { f: tr.owner, k: 'p2' };
      this.fighters.forEach(e => { if (e.alive && !e.isTower && e.team !== tr.team && eDist(e.x, e.y, tr.x, tr.y) <= tr.r * 1.5) { e.rootT = Math.max(e.rootT || 0, tr.root); this.markSrc(e, 'root'); this.vfx('block', e.x, e.cy, { scale: 3, tint: 0xffd23f }); } });
      this.castCtx = null; this.vfx('shockwave', tr.x, tr.y - 4, { scale: 3, below: true, tint: 0x66e0ff }); this.audio.play('stun', { at: tr, vol: 0.9, gap: 80 }); this.float(tr.x, tr.y - 60, '¡ATRAPADOS!', '#66e0ff');
      this.breakTrap(tr); return false;
    });
    this.sentinels = (this.sentinels || []).filter(s => {
      if ((s.t -= dt) <= 0) { s.img?.destroy(); s.shd?.destroy(); return false; }
      const who = this.fighters.find(f => f.isChamp && f.alive && !f.away && f.team === s.team && eDist(f.x, f.y, s.x, s.y) <= s.r);
      if (!who) return true;
      const h = Math.min(s.heal * who.healMult, who.maxHp - who.hp);   // instant heal, then the robot is spent
      who.hp += h; this.float(who.x, who.y - who.def.height - 8, `+${Math.round(h)}`, '#5dff8a'); this.vfx('heal', who.x, who.cy, { scale: 4 }); this.vfx('levelup', s.x, s.y - 10, { scale: 2.4, tint: 0x5dff8a }); this.audio.play('heal', { at: who, vol: 0.7, gap: 60 });
      s.img?.destroy(); s.shd?.destroy(); return false;
    });
  }
  // the trap is destroyed when it catches someone: its plate shatters into flying pieces and sparks
  breakTrap(tr) {
    tr.img?.destroy(); tr.img = null;
    if (!this.inView(tr.x, tr.y, 200)) return;
    const key = this.textures.exists('trap_plate') ? 'trap_plate' : null;
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * 6.283, d = 40 + Math.random() * 60, s = key ? this.add.image(tr.x, tr.y, key).setDisplaySize(18, 10).setCrop(0, 0, 40, 40).setDepth(tr.y + 5) : this.add.rectangle(tr.x, tr.y, 8, 5, 0x6a7a8a).setDepth(tr.y + 5);
      if (key) s.setScale(0.12 + Math.random() * 0.08);
      this.tweens.add({ targets: s, x: tr.x + Math.cos(a) * d, y: tr.y + Math.sin(a) * d * 0.7 - 30, angle: Math.random() * 540 - 270, alpha: 0, duration: 650 + Math.random() * 300, ease: 'Cubic.Out', onComplete: () => s.destroy() });
    }
    for (let i = 0; i < 5; i++) { const z = this.add.sprite(tr.x + Phaser.Math.Between(-26, 26), tr.y - 10 + Phaser.Math.Between(-12, 12), i % 2 ? 'zap_b' : 'zap_a').setScale(1.3 + Math.random() * 0.6).setAngle(Math.random() * 360).setDepth(tr.y + 8).setBlendMode(Phaser.BlendModes.ADD); if (this.anims.exists(z.texture.key)) z.play({ key: z.texture.key, repeat: 2 }); this.time.delayedCall(700, () => z.destroy()); }
    this.vfx('spark', tr.x, tr.y - 20, { scale: 5, tint: 0x66e0ff });
  }
  // electric arcs around every snared unit for as long as it is held
  drawZaps() {
    for (const f of this.fighters) {
      const on = f.alive && f.rootT > 0 && this.textures.exists('zap_a') && this.inView(f.x, f.y, 150);
      if (!on) { if (f.zaps) { f.zaps.forEach(z => z.destroy()); f.zaps = null; } continue; }
      if (!f.zaps) { f.zaps = []; for (let i = 0; i < 4; i++) { const z = this.add.sprite(0, 0, i % 2 ? 'zap_b' : 'zap_a').setBlendMode(Phaser.BlendModes.ADD); z.off = [-20, -7, 8, 21][i]; z.tilt = (Math.random() - 0.5) * 14; if (this.anims.exists(z.texture.key)) z.play({ key: z.texture.key, startFrame: i % 4 }); f.zaps.push(z); } }
      // bolts rise from the ground straight up along the body (no orbiting): vertical, anchored at the feet, a hair of jitter
      const hgt = Math.max(70, f.def.height * 0.95);
      f.zaps.forEach((z, i) => { z.setAngle(-90 + z.tilt + Math.sin(this.time.now / 90 + i * 2) * 5).setScale(hgt / 80, 1.15).setOrigin(0.5, 0.17).setPosition(f.x + z.off, f.y - 6 - hgt * 0.5).setDepth(f.y + 9).setAlpha(0.95); });
    }
  }
  drawYonaiker() {
    const g = (this.yonG ||= this.add.graphics().setDepth(-855)); g.clear(); const mine = this.player.baseTeam, t = this.time.now / 1000;
    for (const tr of this.traps || []) {   // only the owner's team sees the trap
      if (tr.team !== mine || !this.inView(tr.x, tr.y, 120)) continue;
      g.lineStyle(2, 0xffd23f, 0.5 + 0.25 * Math.sin(t * 4)).strokeEllipse(tr.x, tr.y, tr.r * 2, tr.r * 2 * YR); g.fillStyle(0xffd23f, 0.1).fillEllipse(tr.x, tr.y, tr.r * 2, tr.r * 2 * YR);
      if (this.textures.exists('trap_plate')) { tr.img ||= this.add.image(tr.x, tr.y, 'trap_plate').setDisplaySize(46, 24).setAlpha(0.6).setDepth(tr.y - 4); }
    }
    this.traps = (this.traps || []).filter(tr => { if (tr.t <= 0 && tr.img) { tr.img.destroy(); tr.img = null; } return true; });
    this.drawZaps();
    for (const s of this.sentinels || []) {   // healing robots stand on the ground (no floating); only the owner's team sees them
      if (s.team !== mine) { s.img?.setVisible(false); s.shd?.setVisible(false); continue; }
      if (!this.inView(s.x, s.y, 120)) continue;
      const pulse = 0.5 + 0.5 * Math.sin(t * 4); g.lineStyle(2, 0x5dff8a, 0.5 + 0.3 * pulse).strokeEllipse(s.x, s.y, s.r * 2, s.r * 2 * YR); g.fillStyle(0x5dff8a, 0.1 + 0.08 * pulse).fillEllipse(s.x, s.y, s.r * 2, s.r * 2 * YR);
      s.shd ||= this.add.ellipse(s.x, s.y + 4, 40, 14, 0x000000, 0.35).setDepth(s.y - 2); s.shd.setPosition(s.x, s.y + 4).setVisible(true);
      if (this.textures.exists('st_sentinel_float')) {   // animated: hovers and pulses its two signal arcs
        if (!s.img || s.img.texture.key !== 'st_sentinel_float') { s.img?.destroy(); s.img = this.add.sprite(s.x, s.y, 'st_sentinel_float').setOrigin(0.5, 0.9); }
        const n = this.textures.get('st_sentinel_float').frameTotal - 1; s.img.setFrame(Math.floor(t * 6 + s.x * 0.01) % n).setScale(96 / 150).setPosition(s.x, s.y - 6 + Math.sin(t * 2.4 + s.x) * 4).setDepth(s.y).setVisible(true);
      } else if (this.textures.exists('sentinel_robot')) { s.img ||= this.add.image(s.x, s.y, 'sentinel_robot').setOrigin(0.5, 0.97); const k = 70 / s.img.height; s.img.setScale(k).setPosition(s.x, s.y - 4 + Math.sin(t * 2.4 + s.x) * 4).setDepth(s.y).setVisible(true).setAlpha(0.95); }
    }
    for (const m of this.sentryMounds || []) {   // buried sentries show a mound to their team until they pop up
      const f = m.f; if (!f.alive || f.dispose) { m.img?.destroy(); m.dead = true; continue; }
      if (!f.invis) { m.img?.setVisible(false); continue; }
      if (f.team !== mine) { m.img?.setVisible(false); continue; }
      if (this.textures.exists('sentry_mound')) { m.img ||= this.add.image(f.x, f.y + 4, 'sentry_mound').setOrigin(0.5, 0.8).setAlpha(0.85); const k = 40 / m.img.width; m.img.setScale(k).setDepth(f.y - 2).setVisible(true); }
    }
    this.sentryMounds = (this.sentryMounds || []).filter(m => !m.dead);
  }


  /* ---------- Junior: fist progress, anchor drag, flamethrower, bombardment ---------- */
  anchorDrag(o, a, rank) {   // Junior lunges along the aim and carries every enemy champion he reaches
    if (this.net?.role === 'client') return;
    const T = a.range / a.speed;
    o.stateT = 0; o.stateDur = T; o.dashV = { x: o.ax * a.speed, y: o.ay * a.speed };
    (this.lunges ||= []).push({ o, a, rank, dx: o.ax, dy: o.ay, grabbed: [], dmg: rk(a.dmg, rank) + o.atk * a.atkScale, wallStun: rk(a.wallStun, rank), wallDmg: rk(a.wallDmg, rank) + o.atk * 0.3 });
    this.vfx('shockwave', o.x, o.y - 10, { scale: 2.5, below: true, tint: 0x66b0ff });
    if (this.textures.exists('anchor_chain')) { const im = this.add.image(o.x, o.cy, 'anchor_chain').setDepth(99000).setScale(0.18).setRotation(Math.atan2(o.ay, o.ax)); this.tweens.add({ targets: im, x: o.x + o.ax * a.range, y: o.cy + o.ay * a.range, alpha: 0, duration: T * 1000, onComplete: () => im.destroy() }); }
  }
  updateJunior(dt) {
    if (this.net?.role === 'client') return;
    this.lunges = (this.lunges || []).filter(L => {
      const o = L.o, end = !o.alive || !o.dashV || o.stunT > 0;
      let crash = false;
      if (!end) {
        for (const t of this.fighters) if (t.isChamp && t.alive && !t.away && !t.drop && t.team !== o.team && !L.grabbed.includes(t) && Math.hypot(t.x - (o.x + L.dx * 30), (t.y - (o.y + L.dy * 30)) / YR) <= L.a.width / 2 + t.br) {
          if (t.key === 'xeviche' && (t.arepaUp || t.arepaGrace > 0)) { t.arepaBlocks(); L.grabbed.push(t); L.blocked ||= new Set(); L.blocked.add(t); continue; }   // Xeviche's arepa swallows the anchor: he is not carried or stunned (the shield breaks and the anchor goes on)
          L.grabbed.push(t); this.damage(o, t, L.dmg, 'physical'); t.pending = null; this.vfx('punch', t.x, t.y - 30, { scale: 3 });   // the anchor only DRAGS: no stun (the stun comes from hitting a wall)
        }
        L.grabbed.forEach((t, i) => {   // carried in front of Junior, side by side
          if (!t.alive || t.dispose || L.blocked?.has(t)) return; const off = (i - (L.grabbed.length - 1) / 2) * 36, nx = o.x + L.dx * 46 - L.dy * off, ny = o.y + L.dy * 46 + L.dx * off;
          if (!isWalk(nx, ny) || this.obstacles.some(ob => ob.team !== o.team && Math.hypot(ob.x - nx, ob.y - ny) < ob.r + 16)) crash = t; else { t.x = nx; t.y = ny; }
          t.carriedT = 0.12; t.pending = null; t.in = { mx: 0, my: 0, run: false };   // carried: cannot act while Junior drags it, but it is not stunned
        });
        if (L.dust = (L.dust || 0) - dt, L.dust <= 0) { L.dust = 0.05; this.vfx('run_dust', o.x, o.y - 4, { scale: 1.8, alpha: 0.7, below: true }); }
      }
      if (crash) { o.dashV = null; o.stateT = o.stateDur; }
      if (crash || end) {
        L.grabbed.forEach(t => { if (!t.alive || L.blocked?.has(t)) return; if (crash) { t.carriedT = 0; t.stun(L.wallStun); this.damage(o, t, L.wallDmg, 'physical'); this.crackFloor(t.x + L.dx * 30, t.y + L.dy * 20); this.float(t.x, t.y - t.def.height - 34, '¡IMPACTO!', '#ffd23f'); } else t.carriedT = 0; });   // dropped without a wall: no stun
        if (crash) this.audio.play('hit_heavy', { at: o, vol: 0.9, gap: 60 });
        return false;
      }
      return true;
    });
    for (const f of this.fighters) if (f.fist && (f.fist.t -= dt) <= 0) f.fist = null;
  }
  /* ---------- Xeviche: Karis Harem ---------- */
  startHarem(o, a, rank, T) {   // online clients run it too, for the helpers / beam / banner: the beam damage is host-only (updateHarem)
    const H = { o, t: T, T, ax: o.ax, ay: o.ay, L: a.length, BW: a.beamW, dps: rk(a.dps, rank) + o.ap * a.apScale, tick: 0, age: 0, helpers: [], g: null };   // each helper fires her own laser (BW wide); every laser deals the full dps
    const px = -H.ay, py = H.ax;
    [-1, 0, 1].forEach((k, i) => {
      const x = o.x + H.ax * (80 + (k === 0 ? 26 : 0)) + px * k * a.spread, y = o.y + H.ay * (80 + (k === 0 ? 26 : 0)) * YR + py * k * a.spread * YR, key = 'helper_' + 'abc'[i];
      const spr = this.textures.exists('st_' + key) ? this.add.sprite(x, y, 'st_' + key).setOrigin(0.5, 0.71).setScale(0.78).setFlipX(H.ax < 0).setAlpha(0) : this.add.rectangle(x, y - 40, 34, 80, [0xffb84a, 0xff8a4a, 0xffd23f][i]).setAlpha(0);
      H.helpers.push({ spr, x, y, delay: i * 0.18, shown: false });
    });
    o.harem = H; (this.harems ||= []).push(H);
    this.showBanner({ title: 'KARIS HAREM', sub: `${o.def.name} invoca a sus empleadas`, team: o.baseTeam, face: this.faceOf(o) }, 2000);
  }
  updateHarem(dt) {
    this.harems = (this.harems || []).filter(H => {
      const o = H.o; H.age += dt;
      const over = !o.alive || o.stunT > 0 || o.state !== 'cast' || (H.t -= dt) <= 0;
      H.helpers.forEach(h => {
        if (!h.shown && H.age >= h.delay) { h.shown = true; this.vfx('summon', h.x, h.y - 20, { scale: 3 }); }
        const spr = h.spr, al = over ? Math.max(0, spr.alpha - dt * 4) : h.shown ? Math.min(1, spr.alpha + dt * 5) : 0;
        spr.setAlpha(al).setDepth(h.y);
        if (spr.setFrame && spr.texture.key.startsWith('st_helper')) { const n = spr.texture.frameTotal - 1, t = H.age - h.delay; spr.setFrame(t < 0.25 ? Math.max(0, Math.min(1, Math.floor(t * 8))) : 2 + (Math.floor(this.time.now / 90) % Math.max(1, n - 2))); }
      });
      const g = over ? null : (H.g ||= this.add.graphics().setDepth(99000).setBlendMode(Phaser.BlendModes.ADD)); g?.clear();
      const live = H.helpers.filter(h => !over && H.age > h.delay + 0.35);   // each laser starts once its helper has landed
      live.forEach((h, i) => {
        const k = Math.min(1, (H.age - h.delay - 0.35) / 0.12), pulse = 0.88 + 0.12 * Math.sin(this.time.now / 45 + i * 2), bw = H.BW * k * pulse;   // straight lasers with a quick flicker
        const ox = h.x + H.ax * 22, oy = h.y - 46, ex = ox + H.ax * H.L, ey = oy + H.ay * YR * H.L;
        if (this.inView((ox + ex) / 2, (oy + ey) / 2, H.L)) {
          [[1.5, 0xff9a1a, 0.2], [1, 0xffd23f, 0.45], [0.55, 0xfff1a8, 0.8], [0.22, 0xffffff, 1]].forEach(([m, c, al]) => g.lineStyle(bw * m, c, al).lineBetween(ox, oy, ex, ey));
          g.fillStyle(0xffd23f, 0.45).fillCircle(ox, oy, bw * 0.95).fillStyle(0xffffff, 0.95).fillCircle(ox, oy, bw * 0.4);   // muzzle flare
          g.fillStyle(0xffd23f, 0.35).fillCircle(ex, ey, bw * 0.7);
          if (Math.random() < 0.3) this.vfx('spark', ox + H.ax * Math.random() * H.L, oy + H.ay * YR * Math.random() * H.L + 20, { scale: 1.6, tint: 0xffe27a });
        }
      });
      if (!over && H.age > 0.35 && this.net?.role !== 'client' && (H.tick -= dt) <= 0) {
        H.tick = 0.25;
        this.enemiesOf(o).forEach(t => live.forEach(h => {   // every laser hits on its own: the line starts at its helper
          const dx = t.x - h.x, dy = t.y - h.y, along = dx * H.ax + dy * H.ay, side = Math.abs(dx * -H.ay + dy * H.ax);
          if (along > 0 && along < H.L && side < H.BW / 2 + t.br) { this.damage(o, t, H.dps * 0.25, 'magic'); t.slow(0.45, 0.4); }
        }));
      }
      if (over) { H.g?.destroy(); H.g = null; if (o.harem === H) o.harem = null; }
      if (over && H.helpers.every(h => h.spr.alpha <= 0.01)) { H.helpers.forEach(h => h.spr.destroy()); return false; }
      return true;
    });
  }
  /* ---------- Yonaiker: bomber ship, smoke, supply crates ---------- */
  startBomber(o, a, rank) {
    if (this.net?.role === 'client') return;
    o.state = 'cast'; o.pending = null; o.windup = 99; o.fired = true; o.playAnim('power1'); o.stateT = 0; o.stateDur = 1e5;   // holds the "calling the ship" pose until the ship takes him
    const has = this.textures.exists('yon_ship_side');
    const ship = has ? this.add.image(o.x + 900, o.y - 320, 'yon_ship_side').setDisplaySize(380, 190).setFlipX(true) : this.add.rectangle(o.x + 900, o.y - 320, 300, 70, 0x8a9bb0).setStrokeStyle(4, 0x000000);
    ship.setDepth(99000);
    const shadow = this.add.ellipse(o.x, o.y, 200, 60, 0x000000, 0.35).setAlpha(0).setDepth(o.y - 5);
    const B = { o, a, rank, phase: 'arrive', t: 0, T: rk(a.time, rank), ammo: Infinity, cd: 0, ox: o.x, oy: o.y, ship, shadow, dmg: rk(a.dmg, rank) + o.atk * a.atkScale, pt: { x: o.x, y: o.y }, idle: 0 };
    o.bomber = B; (this.bombers ||= []).push(B);
    this.float(o.x, o.y - o.def.height - 34, 'Esperando la nave...', '#9fe8ff');
  }
  // reticle of the ship (also used by the online guest's mirror): E = missile area (green), Q on = machine gun area with a red-tipped pointer, R ready = the purple zone the smoke screen will cover
  drawBomberReticle(g, B, o) {
    const p = B.pt, r = 46 + 4 * Math.sin(this.time.now / 90), gunShape = o.gun && o.ranks.p1 && this.time.now - (B.lastMissile || 0) > 700;
    const ua = o.def.abilities.ult;
    if (o.ranks.ult && o.cds.ult <= 0 && ua) {   // R is ready: the zone it would cover (dashed purple ring + faint fill) follows the reticle
      const R = ua.radius, n = 36, pu = 0.5 + 0.5 * Math.sin(this.time.now / 260);
      g.fillStyle(0x9b4dff, 0.06 + 0.03 * pu).fillEllipse(p.x, p.y, R * 2, R * 2 * YR);
      g.lineStyle(3, 0xc58bff, 0.55 + 0.25 * pu);
      for (let i = 0; i < n; i += 2) { const a0 = i / n * 6.283, a1 = (i + 1) / n * 6.283; g.beginPath().arc(p.x, p.y, R, a0, a1).strokePath(); }
    }
    if (gunShape) {
      const R = o.def.abilities.p1.area, rr = R * (1 + 0.03 * Math.sin(this.time.now / 70));
      g.lineStyle(3, 0xff4a3a, 0.9).strokeEllipse(p.x, p.y, rr * 2, rr * 2 * YR).lineStyle(1, 0xffd2c8, 0.5).strokeEllipse(p.x, p.y, rr * 1.2, rr * 1.2 * YR);
      g.lineStyle(2, 0xffffff, 0.85).lineBetween(p.x - R * 0.35, p.y, p.x + R * 0.35, p.y).lineBetween(p.x, p.y - R * 0.35 * YR, p.x, p.y + R * 0.35 * YR);
      g.fillStyle(0xff2a1a, 1).fillTriangle(p.x, p.y - R * 0.6 * YR, p.x - 7, p.y - R * 0.28 * YR, p.x + 7, p.y - R * 0.28 * YR);   // red-tipped pointer
      B.ret?.setVisible(false);
    } else if (this.textures.exists('bomber_reticle')) { B.ret ||= this.add.image(p.x, p.y, 'bomber_reticle').setDepth(99996).setBlendMode('ADD'); B.ret.setPosition(p.x, p.y).setDisplaySize(r * 3.2, r * 3.2 * YR).setVisible(true); }
    else { g.lineStyle(3, 0x66ff88, 0.95).strokeEllipse(p.x, p.y, r * 2, r * 2 * YR).strokeEllipse(p.x, p.y, r * 1.1, r * 1.1 * YR).lineBetween(p.x - r * 1.3, p.y, p.x + r * 1.3, p.y).lineBetween(p.x, p.y - r * 1.3 * YR, p.x, p.y + r * 1.3 * YR); }
  }
  // online guest: the host runs the ship; here we only mirror its phase to drive the camera, move our own reticle (WASD) and read the trigger (sent to the host with the inputs)
  bomberMirrorPhase(B, ph) {
    const o = B.o, mine = o === this.pc, was = B.phase; B.phase = ph;
    if (!mine) return;
    if (ph === 'board') this.cameras.main.fadeOut(800, 0, 0, 0);
    else if (ph === 'fly') { B.pt = { x: o.x, y: o.y }; this.snapZoom = true; this.cameras.main.fadeIn(1100, 0, 0, 0); }
    else if (ph === 'land') this.cameras.main.fadeOut(600, 0, 0, 0);
    else if (was === 'land' || was === 'fly' || ph === null) { B.ret?.destroy(); B.ret = null; this.snapZoom = true; this.cameras.main.resetFX(); this.cameras.main.fadeIn(700, 0, 0, 0); }
  }
  updateBomberMirror(dt) {
    const o = this.pc, B = o?.bomber; if (!B?.mirror) return;
    const g = this.bomberG; if (!g) return;
    if (B.phase !== 'fly') { B.ret?.setVisible(false); return; }
    const K = this.k, dn = (a, b) => (a.isDown || b.isDown ? 1 : 0), mx = dn(K.right, K.right2) - dn(K.left, K.left2), my = dn(K.down, K.down2) - dn(K.up, K.up2), sp = 520 * dt / (Math.hypot(mx, my) || 1);
    B.pt = { x: Phaser.Math.Clamp(B.pt.x + mx * sp, 60, WORLD_W - 60), y: Phaser.Math.Clamp(B.pt.y + my * sp, WALK_Y0, WALK_Y1) };
    const ptr = this.input.activePointer;
    B.fire = (K.p3.isDown || ptr.leftButtonDown()) && !(this.uiRects || []).some(r => ptr.x >= r.x && ptr.x <= r.x + r.w && ptr.y >= r.y && ptr.y <= r.y + r.h);
    if (o.gun && o.ranks.p1) B.gunT = 0;
    this.drawBomberReticle(g, B, o);
  }
  endBomber(B) { if (B.phase === 'fly') { B.phase = 'land'; B.t = 0; if (B.o === this.pc) this.cameras.main.fadeOut(600, 0, 0, 0); } }
  updateBomber(dt) {
    const g = (this.bomberG ||= this.add.graphics().setDepth(99995)); g.clear();
    this.bombers = (this.bombers || []).filter(B => {
      const o = B.o, ship = B.ship; B.t += dt; B.cd -= dt;
      if (B.phase === 'arrive' || B.phase === 'board') o.charge = 100; else if (B.phase !== 'fly') o.charge = 0;
      if (B.phase === 'land' || B.phase === 'leave') o.gun = false;
      if (!o.alive && B.phase !== 'leave') { o.away = false; o.bomber = null; B.phase = 'leave'; B.t = 0; if (o === this.pc) this.cameras.main.resetFX(); }
      if (B.phase === 'arrive') {
        const k = Math.min(1, B.t / 1.5), e = 1 - (1 - k) * (1 - k);
        ship.setPosition(B.ox + 900 * (1 - e), B.oy - 170 - 150 * (1 - e)); B.shadow.setAlpha(0.35 * k).setPosition(B.ox, B.oy);
        if (o.stunT > 0 || !o.alive) { o.bomber = null; o.state = 'idle'; o.playAnim('idle'); B.phase = 'leave'; B.t = 0; }
        else if (k >= 1) { B.phase = 'board'; B.t = 0; }
      } else if (B.phase === 'board') {   // he climbs in, the ship flies off the map and the screen goes black
        if (!B.faded) { B.faded = true; if (o === this.pc) this.cameras.main.fadeOut(800, 0, 0, 0); }
        if (B.t < 0.45) ship.setPosition(B.ox, B.oy - 170 - 8 * Math.sin(this.time.now / 120));
        else {
          if (!o.away) { o.away = true; this.vfx('summon', o.x, o.y - 20, { scale: 4 }); this.audio.play('ui_confirm', { vol: 0.7, gap: 0 }); }
          const k = Math.min(1, (B.t - 0.45) / 0.45); ship.setPosition(B.ox + 1100 * k * k, B.oy - 170 - 160 * k); B.shadow.setAlpha(0.35 * (1 - k));
        }
        if (B.t >= 0.9) { ship.destroy(); B.shadow.destroy(); B.ship = null; B.phase = 'fly'; B.t = 0; o.state = 'idle'; o.stateDur = 0; this.snapZoom = true; if (o === this.pc) this.cameras.main.fadeIn(1100, 0, 0, 0); }   // fade in on the global view
      } else if (B.phase === 'fly') {
        const human = o === this.pc && !o.ai && !this.bot;
        let fire = false;
        const rb = !human && o.pid != null && this.net?.role === 'host' ? this.net.remote.get(o.pid) : null, aim = rb && !rb.off && this.net.clock - rb.at < 1 ? rb.bp : null;   // a remote player aims his own reticle
        if (human) {
          const K = this.k, dn = (a, b) => (a.isDown || b.isDown ? 1 : 0), mx = dn(K.right, K.right2) - dn(K.left, K.left2), my = dn(K.down, K.down2) - dn(K.up, K.up2), sp = 520 * dt / (Math.hypot(mx, my) || 1);   // the reticle is the center of the view; WASD slides the view
          B.pt = { x: Phaser.Math.Clamp(B.pt.x + mx * sp, 60, WORLD_W - 60), y: Phaser.Math.Clamp(B.pt.y + my * sp, WALK_Y0, WALK_Y1) };
          fire = (this.k.p3.isDown || this.input.activePointer.leftButtonDown()) && !(this.uiRects || []).some(r => this.input.activePointer.x >= r.x && this.input.activePointer.x <= r.x + r.w && this.input.activePointer.y >= r.y && this.input.activePointer.y <= r.y + r.h);
          B.fire = fire;   // online client: sent to the host with the inputs
        } else if (aim) { B.pt = { x: Phaser.Math.Clamp(aim[0], 60, WORLD_W - 60), y: Phaser.Math.Clamp(aim[1], WALK_Y0, WALK_Y1) }; fire = !!aim[2]; }
        else {   // bots and remote players: bomb the nearest enemy champion
          const t = this.enemiesOf(o).filter(f => f.isChamp && f.alive && !f.away).sort((p, q) => dist(p, o) - dist(q, o))[0];
          if (t) { B.pt = { x: t.x + (Math.random() - 0.5) * 60, y: t.y + (Math.random() - 0.5) * 40 }; fire = true; if (o.ranks.p1 && !o.gun && o.cds.p1 <= 0) o.tryCast('p1'); if (o.ranks.p2 && o.cds.p2 <= 0) o.tryCast('p2'); if (o.ranks.ult && o.cds.ult <= 0) o.tryCast('ult'); }
        }
        if (fire && B.ammo > 0 && B.cd <= 0) {
          B.cd = rk(B.a.rate, B.rank); o.cds.p3 = B.cd; B.idle = 0;   // seconds between missiles (shown on the E icon)
          (this.yMissiles ||= []).push({ x: B.pt.x + (Math.random() - 0.5) * 26, y: B.pt.y + (Math.random() - 0.5) * 16, t: 0, fall: 0.85, B });
          this.audio.play('ui_confirm', { vol: 0.4, gap: 60 });
        }
        if (o.gun && o.ranks.p1) {   // machine gun: bullets rain on random points of the reticle area
          const ga = o.def.abilities.p1; B.gunT = (B.gunT ?? 0) - dt;
          for (let n = 0; B.gunT <= 0 && n < 4; n++) {
            B.gunT += rk(ga.rate, o.ranks.p1);
            const ang = Math.random() * 6.283, d = Math.sqrt(Math.random()) * ga.area;
            (this.yBullets ||= []).push({ x: B.pt.x + Math.cos(ang) * d, y: B.pt.y + Math.sin(ang) * d * YR, t: 0, fall: 0.16, o, ga, rank: o.ranks.p1 });
          }
          this.audio.play('atk_yonaiker', { vol: 0.18, gap: 90 });
        }
        if (fire && B.cd <= 0) B.lastMissile = this.time.now;   // the area shape follows the projectile used last
        if (human) this.drawBomberReticle(g, B, o);   // bomber reticle: missile area, or the red-tipped crosshair of the machine gun, plus the zone of the smoke screen
        o.charge = 100 * Math.max(0, 1 - B.t / B.T);   // the bar drains while aboard
        if (B.t >= B.T) this.endBomber(B);
      } else if (B.phase === 'land') {   // black screen: he is dropped back on the ground, then the scene fades in
        B.ret?.setVisible(false);
        if (B.t >= 0.7 && o.away) { o.away = false; o.state = 'idle'; o.playAnim('idle'); this.vfx('summon', o.x, o.y - 20, { scale: 4 }); this.snapZoom = true; if (o === this.pc) this.cameras.main.fadeIn(700, 0, 0, 0); o.bomber = null; B.phase = 'leave'; B.t = 0; }
      } else {   // leave (cleanup; also the ship flying off if he was cancelled while it was still arriving)
        B.ret?.destroy(); B.ret = null; if (!B.ship) return false;
        const k = Math.min(1, B.t / 1.0); ship.setPosition(B.ox + 1100 * k * k, B.oy - 170 - 160 * k); B.shadow.setAlpha(0.35 * (1 - k));
        if (k >= 1) { ship.destroy(); B.shadow.destroy(); return false; }
      }
      return true;
    });
    // machine gun bullets: pixel bullets dropping on the area, a small hit where they land
    this.yBullets = (this.yBullets || []).filter(b => {
      b.t += dt; const k = Math.min(1, b.t / b.fall);
      if (!b.img) { b.img = this.textures.exists('bullet_td') ? this.add.image(b.x, b.y - 420, 'bullet_td').setScale(2.2).setDepth(99899) : this.add.rectangle(b.x, b.y - 420, 4, 14, 0xffd23f).setDepth(99899); }
      b.img.setPosition(b.x, b.y - 420 * (1 - k * k) - 14);
      if (b.t < b.fall) return true;
      b.img.destroy(); this.vfx('spark', b.x, b.y - 8, { scale: 1.6, tint: 0xffd23f });
      if (this.net?.role !== 'client') {
        this.castCtx = { f: b.o, k: 'p1' };
        this.enemiesNear(b.o.team, b.x, b.y, b.ga.hit).forEach(t => this.damage(b.o, t, rk(b.ga.dmg, b.rank) + b.o.atk * b.ga.atkScale, 'physical'));
        this.castCtx = null;
      }
      return false;
    });
    // missiles falling on the reticle: burn, flames and torn ground
    this.yMissiles = (this.yMissiles || []).filter(m => {
      m.t += dt; const k = Math.min(1, m.t / m.fall);
      g.lineStyle(2, 0xff3a2a, 0.75 * k).strokeEllipse(m.x, m.y, 26 + 44 * (1 - k), (26 + 44 * (1 - k)) * YR);
      if (!m.img) { m.img = this.textures.exists('missile') ? this.add.image(m.x, m.y - 800, 'missile').setDisplaySize(26, 86) : this.add.rectangle(m.x, m.y - 800, 8, 30, 0xdddddd); m.img.setDepth(99900); }
      m.img.setPosition(m.x, m.y - 800 * (1 - k * k) - 20);
      if (m.t < m.fall) return true;
      m.img.destroy(); const B = m.B, o = B.o, a = B.a, rank = B.rank;
      this.vfx('shockwave', m.x, m.y, { scale: 2.8, below: true, tint: 0xff7a2a }); this.vfx('spark', m.x, m.y - 24, { scale: 5, tint: 0xffa040 });
      if (this.inView(m.x, m.y, 200)) this.audio.play('explosion', { at: m, vol: 0.55, gap: 70 });
      if (this.net?.role !== 'client') {
        this.castCtx = { f: o, k: 'p3' };
        this.enemiesNear(o.team, m.x, m.y, a.hit).forEach(t => { this.damage(o, t, B.dmg, 'physical'); t.burn(rk(a.burn, rank) + o.atk * 0.1, a.burnTime, o); });
        this.firePatch(o, m.x, m.y, rk(a.fireDmg, rank), a.fireLife);
        this.castCtx = null;
      }
      if (this.textures.exists('ground_crack')) { const c = this.add.image(m.x, m.y, 'ground_crack').setDepth(m.y - 8).setDisplaySize(110, 110 * YR); this.tweens.add({ targets: c, alpha: 0, delay: a.fireLife * 1000, duration: 800, onComplete: () => c.destroy() }); }
      return false;
    });
  }
  // purple blindness area: enemy champions inside are blinded (and optionally silenced) only while they stand in it; leaving it gives the sight back almost at once
  blindZone(o, x, y, r, life, silence = false) {
    (this.blindZones ||= []).push({ o, x, y, r, t: life, T: life, silence, ctx: this.castCtx, g: this.add.graphics().setDepth(y - 2), seen: new Set(), immune: new Set() });
  }
  updateBlindZones(dt) {
    this.blindZones = (this.blindZones || []).filter(z => {
      z.t -= dt; const g = z.g.clear();
      if (z.t <= 0) { z.g.destroy(); return false; }
      const k = Math.max(0, Math.min(1, (z.T - z.t) / 0.4, z.t / 0.6)), pu = 0.5 + 0.5 * Math.sin(this.time.now / 260);
      if (this.inView(z.x, z.y, z.r + 60)) {
        g.fillStyle(0x9b4dff, (0.12 + 0.05 * pu) * k).fillEllipse(z.x, z.y, z.r * 2, z.r * 2 * YR);
        g.lineStyle(4, 0xc58bff, (0.6 + 0.3 * pu) * k).strokeEllipse(z.x, z.y, z.r * 2, z.r * 2 * YR);
        g.lineStyle(2, 0xe3c8ff, 0.3 * k).strokeEllipse(z.x, z.y, z.r * 1.7, z.r * 1.7 * YR);
      }
      if (this.net?.role === 'client') return true;
      this.champs.forEach(t => {
        if (!t.alive || t.away || t.team === z.o.team || z.immune.has(t)) return;
        if (eDist(t.x, t.y, z.x, z.y) > z.r) { z.seen.delete(t); return; }
        if (!z.seen.has(t)) { if (t.key === 'xeviche' && t.arepaBlocks()) { z.immune.add(t); return; } z.seen.add(t); this.float(t.x, t.y - t.def.height - 28, z.silence ? 'CEGADO Y SILENCIADO' : 'CEGADO', '#c58bff'); }
        t.blindT = Math.max(t.blindT, 0.35); if (z.silence) t.silenceT = Math.max(t.silenceT, 0.35);
        this.castCtx = z.ctx; this.markSrc(t, 'blind'); this.castCtx = null;
      });
      return true;
    });
  }
  smokePuff(x, y, r, life, o = null, dps = 0) {   // a smoke cloud; with an owner (the grenade) it poisons AND blinds the enemies inside; without one (the ship's screen) it is only the look
    const spr = this.textures.exists('st_smoke_cloud') ? this.add.sprite(x, y - 10, 'st_smoke_cloud').setDisplaySize(r * 2.2, r * 2.2 * YR * 1.1).setAlpha(0) : this.add.ellipse(x, y, r * 2, r * 2 * YR, 0x9ab08a, 0).setStrokeStyle(2, 0x7a8f6a, 0.6);
    spr.setDepth(y + 40);
    const puffs = Array.from({ length: o ? 12 : 9 }, () => ({ a: Math.random() * 6.283, d: Math.sqrt(Math.random()) * 0.62, s: 0.3 + Math.random() * 0.25, sp: (Math.random() - 0.5) * 0.7, ph: Math.random() * 6.283, c: Math.random() * 3 | 0 }));
    (this.smokes ||= []).push({ x, y, r, t: life, T: life, owner: o, dps, tick: 0, spr, puffs, g: this.add.graphics().setDepth(y + 41), toxic: !!o });
  }
  drawSmoke(m, k) {   // billowing layers drifting around the center + a pulsing rim; toxic green for the grenade, cold grey for the ship's screen
    const g = m.g.clear(); if (k <= 0 || !this.inView(m.x, m.y, m.r + 80)) return;
    const t = this.time.now / 1000, pal = m.toxic ? [0x5f9f3c, 0x86c45e, 0x3f7a2c] : [0x565b6b, 0x7d8496, 0x383c48], rim = m.toxic ? 0x9be37a : 0xaab3c8;
    g.fillStyle(pal[2], 0.16 * k).fillEllipse(m.x, m.y, m.r * 2, m.r * 2 * YR);   // dark base so the area reads as one cloud
    m.puffs.forEach(p => {
      const a = p.a + t * p.sp, px = m.x + Math.cos(a) * p.d * m.r, py = m.y + Math.sin(a) * p.d * m.r * YR - 6 - 10 * (0.5 + 0.5 * Math.sin(t * 1.3 + p.ph)), rr = m.r * p.s * (0.92 + 0.08 * Math.sin(t * 2 + p.ph));
      g.fillStyle(pal[p.c], 0.2 * k).fillEllipse(px, py, rr * 2, rr * 1.7).fillStyle(pal[p.c], 0.16 * k).fillEllipse(px - rr * 0.15, py - rr * 0.18, rr * 1.35, rr * 1.1);   // soft body + lighter core
    });
    g.lineStyle(3, rim, (0.35 + 0.15 * Math.sin(t * 3)) * k).strokeEllipse(m.x, m.y, m.r * 2, m.r * 2 * YR);
    if (m.toxic) for (let i = 0; i < 5; i++) { const ph = (t * 0.5 + i / 5) % 1, bx = m.x + Math.cos(i * 2.4 + t * 0.4) * m.r * 0.6 * (0.4 + 0.6 * ph), by = m.y + Math.sin(i * 2.4 + t * 0.4) * m.r * 0.6 * YR - ph * 60; g.fillStyle(0xcfff9a, 0.5 * k * (1 - ph)).fillCircle(bx, by, 3 + 3 * ph); }   // toxic bubbles rising
  }
  smokeGrenade(o, x, y, a, rank) {
    if (this.net?.role === 'client') return;
    const life = rk(a.life, rank), dps = rk(a.dps, rank) + o.atk * a.atkScale, ctx = this.castCtx;
    const gr = this.textures.exists('smoke_grenade') ? this.add.image(o.x, o.cy, 'smoke_grenade').setDisplaySize(30, 30) : this.add.circle(o.x, o.cy, 7, 0x5a7a4a);
    gr.setDepth(99000); this.tweens.add({ targets: gr, x, y: y - 20, duration: 450, ease: 'Sine.Out', onComplete: () => { gr.destroy(); this.castCtx = ctx; this.smokePuff(x, y, a.radius, life, o, dps); this.blindZone(o, x, y, a.radius, life); this.castCtx = null; this.vfx('shockwave', x, y, { scale: 3, below: true, tint: 0x9be37a }); } });
  }
  callCrates(o, a, rank) {   // from the ship: three supply crates fall around the reticle
    if (this.net?.role === 'client') return;
    const c = o.bomber?.pt || { x: o.x, y: o.y };
    [0, 1, 2].forEach(i => {
      const x = Phaser.Math.Clamp(c.x + Math.cos(i * 2.1 + 0.5) * 80, 60, WORLD_W - 60), y = Phaser.Math.Clamp(c.y + Math.sin(i * 2.1 + 0.5) * 50, WALK_Y0, WALK_Y1);
      const img = this.textures.exists('supply_crate') ? this.add.image(x, y - 700, 'supply_crate').setOrigin(0.5, 0.85).setDisplaySize(64, 64) : this.add.rectangle(x, y - 700, 34, 28, 0x4a6a8a).setStrokeStyle(3, 0xffd23f);
      img.setDepth(y);
      (this.crates ||= []).push({ x, y, team: o.team, t: -i * 0.15, fall: 1.2, img, a, rank, life: 40 });
    });
    this.float(c.x, c.y - 60, '¡Cajas de ayuda!', '#9fe8ff');
  }
  smokeScreen(o, a, rank) {   // from the ship: a huge smoke cloud + purple zone over the reticle blinds and silences the enemy champions while they are inside
    if (this.net?.role === 'client') return;
    const c = o.bomber?.pt || { x: o.x, y: o.y }, T = rk(a.time, rank);
    this.blindZone(o, c.x, c.y, a.radius, T, true);   // purple circle: every enemy champion inside is blinded and silenced while it stays in
    for (let i = 0; i < 9; i++) { const ang = Math.random() * 6.283, d = Math.sqrt(Math.random()) * a.radius * 0.8; this.smokePuff(c.x + Math.cos(ang) * d, Phaser.Math.Clamp(c.y + Math.sin(ang) * d * YR, WALK_Y0, WALK_Y1), 200 + Math.random() * 110, 5 + Math.random() * 2); }
    this.showBanner({ title: 'CORTINA DE HUMO', sub: `${o.def.name} cubre la zona: los campeones enemigos dentro quedan ciegos y silenciados`, team: o.baseTeam, face: this.faceOf(o) }, 2200);
  }
  updateSupport(dt) {
    this.smokes = (this.smokes || []).filter(m => {
      m.t -= dt; const k = Math.min(1, (m.T - m.t) / 0.6, m.t / 1.0), spr = m.spr;
      this.drawSmoke(m, Math.max(0, k)); spr.setAlpha(0.45 * Math.max(0, k)); if (spr.setFrame && spr.texture.key === 'st_smoke_cloud') spr.setFrame(Math.floor(this.time.now / 140) % (this.textures.get('st_smoke_cloud').frameTotal - 1)); else spr.setFillStyle(0x9ab08a, 0.2 * Math.max(0, k));
      if (m.t <= 0) { spr.destroy(); m.g.destroy(); return false; }
      if (m.owner && this.net?.role !== 'client' && (m.tick -= dt) <= 0) { m.tick = 0.5; this.enemiesNear(m.owner.team, m.x, m.y, m.r).forEach(t => {
        t.poison(m.dps, 1.2, m.owner, 'physical', 'smoke');
      }); }
      return true;
    });
    this.crates = (this.crates || []).filter(c => {
      c.t += dt; const k = Math.max(0, Math.min(1, c.t / c.fall));
      if (k < 1) { c.img.setPosition(c.x, c.y - 700 * (1 - k * k)); return true; }
      c.img.setPosition(c.x, c.y); c.life -= dt;
      const taker = this.net?.role === 'client' ? null : this.champs.find(f => f.alive && !f.away && f.team === c.team && Math.hypot(f.x - c.x, (f.y - c.y) / YR) < 48);
      if (c.life <= 0 || taker) { if (taker) this.openCrate(taker, c); this.vfx('buff', c.x, c.y - 20, { scale: 3 }); c.img.destroy(); return false; }
      return true;
    });
  }
  openCrate(f, c) {   // a random advantage
    const a = c.a, r = c.rank, T = rk(a.time, r), v = rk(a.buff, r), kinds = ['hp', 'mana', 'atk', 'def', 'aspd', 'speed'], k = kinds[Math.random() * kinds.length | 0];
    const label = { hp: 'Vida', mana: 'Maná', atk: 'Ataque +', def: 'Defensa +', aspd: 'Vel. ataque +', speed: 'Velocidad +' }[k];
    if (k === 'hp') f.heal(f.maxHp * rk(a.heal, r)); else if (k === 'mana') f.mana = Math.min(f.maxMana, f.mana + f.maxMana * 0.45);
    else if (k === 'speed') { f.speedBoost = Math.max(f.speedT > 0 ? f.speedBoost : 0, 0.3); f.speedT = Math.max(f.speedT, T * 0.6); } else f.addPkBuff(k, T, v);
    this.float(f.x, f.y - f.def.height - 34, label, '#9fe8ff'); this.audio.play('ui_upgrade', { at: f, vol: 0.6, gap: 0 });
  }
  crackFloor(x, y) {
    if (!this.inView(x, y, 200)) return;
    this.vfx('shockwave', x, y, { scale: 3, below: true, tint: 0xc8a070 }); this.vfx('run_dust', x, y, { scale: 4, alpha: 0.9, below: true });
    if (this.textures.exists('ground_crack')) { const c = this.add.image(x, y, 'ground_crack').setDepth(y - 8).setDisplaySize(130, 130 * YR); this.tweens.add({ targets: c, alpha: 0, delay: 1800, duration: 900, onComplete: () => c.destroy() }); }
    else { const g = this.add.graphics().setDepth(y - 8).lineStyle(3, 0x2a1a0a, 0.9); for (let i = 0; i < 7; i++) { const a = i * 0.9, l = 24 + Math.random() * 30; g.lineBetween(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l * YR); } this.tweens.add({ targets: g, alpha: 0, delay: 1800, duration: 900, onComplete: () => g.destroy() }); }
  }
  flameTick(o, F, dt) {   // flamethrower: isosceles-triangle zone in front, burn on everyone inside; Junior can move meanwhile
    const a = F.a, L = a.length, nW = a.nearW, fW = a.farW, ux = o.ax, uy = o.ay, px = -uy, py = ux;
    if (this.textures.exists('st_flame_jet')) {   // animated jet sprite along the cone
      F.spr ||= this.add.sprite(o.x, o.y, 'st_flame_jet').setOrigin(0, 0.5).setDepth(99000).setBlendMode(Phaser.BlendModes.ADD);
      const n = this.textures.get('st_flame_jet').frameTotal - 1;
      F.spr.setFrame(Math.floor(this.time.now / 60) % n).setPosition(o.x + ux * 34, o.y + uy * 34 - 52).setRotation(Math.atan2(uy, ux)).setDisplaySize(L + 10, fW * 0.95).setAlpha(Math.min(1, F.t / 0.4 + 0.2));
    }
    if (!this.textures.exists('st_flame_jet') && this.inView(o.x, o.y, 400) && (F.vfxT = (F.vfxT || 0) - dt) <= 0) {
      F.vfxT = 0.05; for (let i = 0; i < 3; i++) { const u = 0.15 + Math.random() * 0.85, v = (Math.random() - 0.5) * (nW + (fW - nW) * u) * 0.8; this.vfx(Math.random() < 0.5 ? 'burning_ground' : 'fire_trail', o.x + ux * 40 + ux * L * u + px * v, o.y + uy * 40 + uy * L * u * YR + py * v * YR - 24, { scale: 1.2 + u * 1.5, alpha: 0.85 }); }
    }
    if ((F.tick -= dt) > 0) return; F.tick = 0.25;
    const dps = rk(a.dps, F.rank) + o.atk * a.atkScale, burn = rk(a.burn, F.rank);
    this.enemiesOf(o).forEach(t => {
      if (t.isTower) return; const dx = t.x - o.x, dy = (t.y - o.y), along = dx * ux + dy * uy, side = Math.abs(dx * px + dy * py);
      if (along < 0 || along > L) return; if (side > (nW + (fW - nW) * (along / L)) / 2 + t.br * 0.5) return;
      this.damage(o, t, dps * 0.25, 'physical', true); t.burn(dps * 0.6, burn, o);
    });
  }
  startBombardment(o, x, y, r, time, dmg, a) {   // online clients run it too, for the zone / missiles / craters / banner: the damage is host-only (drawJunior)
    (this.bombs ||= []).push({ owner: o, x, y, r, t: time, T: time, dmg, a, acc: 0, ctx: this.castCtx }); this.showBanner({ title: '¡BOMBARDEO!', sub: `${o.def.name} ordena fuego sobre la zona`, team: o.baseTeam, face: this.faceOf(o) }, 2200);
  }
  drawJunior(dt) {
    this.bombs = (this.bombs || []).filter(b => {
      b.t -= dt; b.acc += dt;
      while (b.acc >= b.a.rate && b.t > 0) {   // a new missile every few frames at a random point of the zone
        b.acc -= b.a.rate; const ang = Math.random() * 6.283, d = Math.sqrt(Math.random()) * b.r, mx = b.x + Math.cos(ang) * d, my = b.y + Math.sin(ang) * d * YR;
        (this.missiles ||= []).push({ x: mx, y: my, t: 0, fall: 0.75, b });
      }
      if (b.t > -1) return true;
      (b.marks || []).forEach(k => this.tweens.add({ targets: k, alpha: 0, duration: 700, onComplete: () => k.destroy() }));   // craters and flames last until the ultimate ends
      return false;
    });
    const g = (this.bombG ||= this.add.graphics().setDepth(-840)); g.clear();
    for (const b of this.bombs) { if (b.t <= 0 || !this.inView(b.x, b.y, b.r)) continue; const p = 0.5 + 0.5 * Math.sin(this.time.now / 140); g.lineStyle(3, 0xff4a3a, 0.5 + 0.3 * p).strokeEllipse(b.x, b.y, b.r * 2, b.r * 2 * YR); g.fillStyle(0xff4a3a, 0.06 + 0.04 * p).fillEllipse(b.x, b.y, b.r * 2, b.r * 2 * YR); }
    this.missiles = (this.missiles || []).filter(m => {
      m.t += dt; const k = Math.min(1, m.t / m.fall), vis = this.inView(m.x, m.y, 200);
      if (vis) {
        g.lineStyle(2, 0xff3a2a, 0.7 * k).strokeEllipse(m.x, m.y, 24 + 40 * (1 - k), (24 + 40 * (1 - k)) * YR);   // landing marker shrinks as it falls
        if (!m.img) { m.img = this.textures.exists('missile') ? this.add.image(m.x, m.y - 700, 'missile') : this.add.rectangle(m.x, m.y - 700, 8, 30, 0xdddddd); m.img.setDepth(99900); if (m.img.setDisplaySize && this.textures.exists('missile')) m.img.setDisplaySize(26, 86); }
        m.img.setPosition(m.x, m.y - 700 * (1 - k * k) - 20);
      }
      if (m.t < m.fall) return true;
      m.img?.destroy();
      this.vfx('shockwave', m.x, m.y, { scale: 2.6, below: true, tint: 0xff7a2a }); this.vfx('spark', m.x, m.y - 24, { scale: 5, tint: 0xffa040 }); 
      if (vis || true) {   // permanent crater + flames at the impact until the bombardment ends
        const mk = (m.b.marks ||= []);
        if (this.textures.exists('ground_crack')) mk.push(this.add.image(m.x, m.y, 'ground_crack').setDepth(m.y - 8).setDisplaySize(90, 90 * YR).setAlpha(0.9));
        if (this.anims.exists('vfx_burning_ground')) mk.push(this.add.sprite(m.x, m.y - 6, 'vfx_burning_ground').setOrigin(0.5, 0.8).setScale(2.2).setDepth(m.y - 4).setAlpha(0.9).play('vfx_burning_ground'));
        if (mk.length > 120) { const k = mk.shift(); k.destroy(); }
      }
      if (vis) this.audio.play('explosion', { at: m, vol: 0.6, gap: 70 });
      if (this.net?.role !== 'client') { this.castCtx = m.b.ctx || null; this.enemiesNear(m.b.owner.team, m.x, m.y, m.b.a.hit).forEach(t => { this.damage(m.b.owner, t, m.b.dmg, 'physical'); t.burn(m.b.dmg * 0.12, 3, m.b.owner, 'physical', 'bombardeo'); }); this.castCtx = null; }
      return false;
    });
    // Xeviche's heart: heart over the lured champion + dashed pink path with arrows to where it walks (also online: `lure` comes in the snapshot)
    const lg = (this.lureG ||= this.add.graphics().setDepth(60)); lg.clear();
    for (const f of this.fighters) {
      const L = f.lure, on = !!L && L.src && f.alive && !f.hiddenFor(this.player) && (this.inView(f.x, f.y, 100) || this.inView(L.src.x, L.src.y, 100));
      if (!on) { f.lureHeart?.setVisible(false); continue; }
      const hy = f.y - f.def.height - 34 + Math.sin(this.time.now / 180) * 3;
      if (this.textures.exists('heart')) { f.lureHeart ||= this.add.image(0, 0, 'heart').setDepth(100002); f.lureHeart.setVisible(true).setScale(0.12).setPosition(f.x, hy); }
      else { f.lureHeart ||= this.add.text(0, 0, '♥', { fontFamily: 'monospace', fontSize: '26px', color: '#ff3b8a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(100002); f.lureHeart.setVisible(true).setPosition(f.x, hy); }
      const dx = L.src.x - f.x, dy = L.src.y - f.y, d = Math.hypot(dx, dy); if (d < 40) continue;
      const ux = dx / d, uy = dy / d, ph = (this.time.now / 40) % 28;
      lg.lineStyle(4, 0xff5aa8, 0.8);
      for (let s = ph; s < d - 30; s += 28) lg.lineBetween(f.x + ux * s, f.y + uy * s, f.x + ux * Math.min(s + 14, d - 30), f.y + uy * Math.min(s + 14, d - 30));
      lg.fillStyle(0xff8cc4, 0.95).fillTriangle(L.src.x - ux * 24 - uy * 9, L.src.y - uy * 24 + ux * 9, L.src.x - ux * 24 + uy * 9, L.src.y - uy * 24 - ux * 9, L.src.x - ux * 8, L.src.y - uy * 8);   // arrow head at Xeviche
    }
    // blinded champions: a crossed-out eye floats over the head (also online: blindT comes in the snapshot)
    for (const f of this.fighters) {
      const on = f.isChamp && f.blindT > 0 && f.alive && !f.away && !f.hiddenFor(this.player) && this.inView(f.x, f.y, 100) && this.textures.exists('blind_eye');
      if (!on) { f.blindEye?.setVisible(false); continue; }
      f.blindEye ||= this.add.image(0, 0, 'blind_eye').setDepth(100002);
      f.blindEye.setVisible(true).setScale(0.8).setPosition(f.x + (f.lure ? 26 : 0), f.y - f.def.height - 46 + Math.sin(this.time.now / 220) * 3).setAlpha(f.blindT < 0.6 ? 0.55 : 1);
    }
    // fist progress icon over every marked enemy (only Junior's team sees the marks of its own fighter)
    for (const f of this.fighters) {
      const mk = f.fist, on = !!mk && f.alive && !f.hiddenFor(this.player) && this.inView(f.x, f.y, 100); if (!on) { f.fistImg?.setVisible(false); continue; }
      const fr = Math.min(3, mk.n);   // 1..3 hits drawn; the 3rd one stuns
      if (this.textures.exists('fist_progress')) { f.fistImg ||= this.add.image(0, 0, 'fist_progress').setDepth(100002); f.fistImg.setVisible(true).setFrame(Math.min(3, fr)).setDisplaySize(34, 34).setPosition(f.x, f.y - f.def.height - (f.isChamp ? 72 : 36)); }
      else { f.fistImg ||= this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '14px', color: '#ff9a4a', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(100002); f.fistImg.setVisible(true).setText('✊'.repeat(0) + '●'.repeat(fr) + '○'.repeat(3 - fr)).setPosition(f.x, f.y - f.def.height - (f.isChamp ? 70 : 34)); }
    }
  }

  spawnWave(team) {
    if (team === 0) this.net?.onWave(this.waveN);
    if (this.waveN === 0 && team === 0) this.audio.voice('v_minions', 1, 'ann_minions', { title: '¡MINIONS DESPLEGADOS!', sub: 'La primera oleada avanza por el carril', team: 2 });
    if (team === 0) this.audio.play('minion_yell', { at: { x: 260, y: LANE_MID }, vol: 0.5, gap: 200 });
    const comp = ['melee', 'melee', 'ranged']; if (this.waveN % 2 === 1) comp.push('heavy');
    if (this.eliteT?.[team] > 0) comp.push('eliteM', 'eliteR');   // captain reward: the captain's own camp soldiers (a knife one and a rifle one) fight for the team in every lane
    const names = team === 0 ? { melee: 'minion_blue_melee', ranged: 'minion_blue_ranged', heavy: 'minion_blue_tank' }
                             : { melee: 'minion_red_melee', ranged: 'minion_red_ranged', heavy: 'minion_red_auto' };
    names.eliteM = 'camp_soldier_melee'; names.eliteR = 'camp_soldier_rifle';
    LANE_YS_N.forEach(li => {
      const fp = this.flagPos(team, li), dir = team === 0 ? 1 : -1;
      comp.forEach((c, i) => {
        const slot = { x: 0, y: (i - 2) * 24 }, ahead = (comp.length - i) * 40, x = fp.x + dir * ahead;
        const m = new Fighter(this, names[c], team, x, laneYAt(li, x) + slot.y, { ai: true, slot, hpMult: c.startsWith('elite') ? 1.8 : 1 });
        if (c.startsWith('elite')) { m.dmgMult = 1.4; m.elite = true; }
        m.ax = dir; m.laneI = li;
        this.fighters.push(m);
      });
    });
  }

  // gold to the champion that landed the kill, XP to every allied champion nearby
  reward(v, killer) {
    if (v.surv) return this.survKill(v);
    if (v.bossKind) this.bossDead(v, killer);
    if (v.isBot || v.summoned || v.owner) return;
    // kill credit: if a tower/minion lands the final blow on a champion, the kill goes to the last enemy champion that hit it (within 10 s)
    let kk = killer?.owner || killer;
    const lh = v.lastChampHit;
    if (v.isChamp && !kk?.isChamp && lh && this.gameT - lh.t <= 10 && lh.champ.baseTeam !== v.baseTeam) kk = lh.champ;
    const raw = killer; killer = kk;
    if (v.isChamp) v.recap = this.buildRecap(v, kk, raw);
    if (kk?.isRage && this.net?.role !== 'client' && v.team !== kk.team) kk.addRage(kk.def.hen.rageKill[v.isChamp ? 'champ' : v.isTower ? 'tower' : 'minion']);   // a kill feeds Eliud's rage
    if (kk?.key === 'diosa' && v.isChamp && v.team !== kk.team && this.net?.role !== 'client') kk.diosaStealth();   // Diosa's passive
    this.net?.onDie(v, killer);
    {
      const k0 = killer?.owner || killer, kn = k0?.def?.name || 'el mapa', kt = k0 ? k0.baseTeam : 1 - v.baseTeam;
      if (v.isChamp) {
        const me = this.player, mine = k0 === me, ally = k0?.isChamp && k0.baseTeam === me.baseTeam, victimIsMe = v === me, victimAlly = v.baseTeam === me.baseTeam;
        const A = this.faceOf(k0), V = this.faceOf(v), vn = v.def.name, team = k0 ? k0.baseTeam : 1 - v.baseTeam;
        let said = false;
        if (k0?.isChamp && k0 !== v && !this.training) {   // first blood + multi kills (kills by the same champion within 10 s of each other)
          const st = this.streaks.get(k0), n = st && this.gameT - st.t <= 10 ? st.n + 1 : 1;
          this.streaks.set(k0, { n, t: this.gameT });
          const NAME = ['', '', 'ASESINATO DOBLE', 'ASESINATO TRIPLE', 'ASESINATO CUÁDRUPLE', 'ASESINATO QUÍNTUPLE'];
          if (!this.firstBlood) { this.firstBlood = true; this.audio.voice('v_firstblood', 4, 'ann_first', { title: '¡PRIMERA SANGRE!', sub: `${kn} eliminó a ${vn}`, team, face: A, face2: V, kind: 'streak' }); said = true; }
          else if (n >= 2) { const m = Math.min(5, n); this.audio.voice('v_' + m, 4, 'ann_' + m, { title: `¡${NAME[m]}!`, sub: `${kn} eliminó a ${vn}`, team, face: A, face2: V, kind: 'streak', big: m }); said = true; }
        }
        const suicide = k0 === v || (!k0 && !lh);
        if (suicide) { if (!said) this.audio.voice('v_suicide', 3, null, { title: '¡SE ELIMINÓ A SÍ MISMO!', sub: vn, team: 1 - v.baseTeam, face: V }); }
        else if (!said && !this.training) {   // who died / who got the kill
          const kill = (vn2, title, sub) => this.audio.voice(vn2, vn2 === 'v_you_died' || vn2 === 'v_ally_down' || vn2 === 'v_enemy_down' ? 2 : 3, null, { title, sub, team, face: A, face2: V });
          if (victimIsMe) kill('v_you_died', 'HAS SIDO ELIMINADO', `${kn} te derrotó`);
          else if (victimAlly) kill('v_ally_down', 'UN ALIADO HA CAÍDO', `${kn} eliminó a ${vn}`);
          else if (mine) kill('v_kill_you', '¡ENEMIGO ELIMINADO!', `${kn} eliminó a ${vn}`);
          else if (ally) kill('v_kill_ally', '¡ALIADO ELIMINÓ AL ENEMIGO!', `${kn} eliminó a ${vn}`);
          else kill('v_enemy_down', '¡UN ENEMIGO HA CAÍDO!', `${kn} eliminó a ${vn}`);
        }
      }
      else if (v.isTower && !v.isNexus) this.audio.voice(v.baseTeam === this.player.baseTeam ? 'v_tower_ally' : 'v_tower_enemy', 2, null, { title: v.baseTeam === this.player.baseTeam ? 'TORRE ALIADA DESTRUIDA' : '¡TORRE ENEMIGA DESTRUIDA!', sub: k0 ? `${kn} destruyó la torre` : 'La torre ha caído', team: kt, face: this.faceOf(k0), kind: 'tower' });
    }
    if (this.net?.role === 'client') return;   // gold and xp come from the host snapshot
    const hitBy = v.hitBy; if (v.isChamp) v.hitBy = null;   // (kept for the assists below)
    const kc = killer?.owner || killer, team = kc ? kc.team : 1 - v.team, me = this.player;
    const r = v.isChamp ? { gold: 300, xp: 90 + 12 * v.level } : v.def.reward || { gold: 0, xp: 0 };
    if (kc?.isChamp) {
      kc.gold += r.gold; if (v.isChamp) kc.kills++;
      if (v.isChamp && hitBy) {   // assists: allies who hit the victim in the last 10 s; the 100 gold of the assist is split between all of them
        const as = [...hitBy].filter(([c, t]) => c !== kc && c.isChamp && c.baseTeam === kc.baseTeam && this.gameT - t <= 10).map(([c]) => c), share = as.length ? Math.round(100 / as.length) : 0;
        as.forEach(c => { c.assists++; c.gold += share; if (c === me) this.float(v.x, v.y - v.def.height - 46, `+${share}g (asistencia)`, '#ffe27a'); });
      }
      if (kc === me) this.float(v.x, v.y - v.def.height - 26, `+${r.gold}g`, '#ffd23f');
    }
    // minions: the champion that lands the kill gets the gold and most of the XP; allied champions near the minion only get a small share of XP (no gold).
    // Hitting a minion without killing it earns nothing. Every other kill (champions, towers...) keeps sharing the XP between the nearby team.
    const near = this.fighters.filter(c => c.isChamp && c.alive && c.team === team && dist(c, v) <= 700);
    near.forEach(c => {
      const xp = v.isMinion ? (c === kc ? r.xp : Math.round(r.xp * MINION_XP_SHARE)) : r.xp;
      if (xp <= 0) return; c.gainXp(xp);
      if (c === me) this.float(v.x + 24 + (c === kc ? 0 : 10), v.y - v.def.height - 8 + (c === kc ? 0 : 12), `+${xp}xp`, '#7ee0ff');
    });
    if (v.isMinion && kc?.isChamp && !near.includes(kc)) { kc.gainXp(r.xp); if (kc === me) this.float(v.x + 24, v.y - v.def.height - 8, `+${r.xp}xp`, '#7ee0ff'); }   // the killer always gets his XP, even from far away (ranged last hit)
  }

  runAntivirus(f) {   // robots shoot the enemy Luis is attacking, otherwise they escort him
    const o = f.owner, lt = o.lastTarget && o.lastTarget.alive && !o.lastTarget.away && dist(o.lastTarget, f) < 750 ? o.lastTarget : null;
    const t = o.invis ? null : lt || this.nearestEnemy(f, 420);   // hidden Luis: drones only escort; otherwise Luis' target, or whoever is closest
    if (t) {
      const dx = t.x - f.x, dy = t.y - f.y, d = Math.hypot(dx, dy);
      f.setAim(dx, dy);
      if (d > 300) { f.in.mx = dx; f.in.my = dy; } else if (d < 140) { f.in.mx = -dx; f.in.my = -dy; }
      if (d <= 340) f.tryBasic();
    } else this.escort(f);
  }
  // follow the owner at its slot with proportional (analog) steering: no stop-and-go, catch-up run when far
  escort(f) {
    const o = f.owner, wx = o.x + f.slot.x - f.x, wy = o.y + f.slot.y - f.y, d = Math.hypot(wx, wy);
    if (d > 700) { f.x = o.x + f.slot.x; f.y = o.y + f.slot.y; return; }   // lost far behind (teleport, dash): rejoin
    if (d < 5) return;
    const far = d > 130 || !!o.running;
    f.in.mx = wx / 70; f.in.my = wy / 70; f.in.run = far; f.in.analog = true;   // proportional steering: eases in and out smoothly
    if (d > 40) f.setAim(wx, wy);   // keeps its last facing while parked (no flipping)
  }
  laser(f, t, dmg) {
    const g = this.add.graphics().setDepth(100000), x0 = f.x + f.ax * 18, y0 = f.y - f.def.height * 0.55, x1 = t.x, y1 = t.y - t.def.height * 0.5;
    g.lineStyle(7, 0x33ff88, 0.5).lineBetween(x0, y0, x1, y1).lineStyle(2, 0xffffff, 0.95).lineBetween(x0, y0, x1, y1);
    this.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
    this.vfx('spark', x1, y1, { scale: 2, tint: 0x66ffaa });
    const pb = this.basicDmg; this.basicDmg = true; this.damage(f, t, dmg, 'magic'); this.basicDmg = pb;
  }
  pickTarget(f, range, pt) {   // enemy champion closest to a point, within range of the caster
    let best = null, bd = 1e9;
    this.fighters.forEach(c => { if (c.alive && c.isChamp && !c.away && c.team !== f.team && dist(c, f) <= range) { const d = Math.hypot(c.x - pt.x, c.y - pt.y); if (d < bd) { bd = d; best = c; } } });
    return best;
  }
  startControl(luis, t, dur) {
    if (this.net?.role === 'client') return;   // online: only the host runs it; clients receive it in the snapshot
   // Luis vanishes; his target fights for him. 'ctrl' = the local player drives it, 'remote' = another human (online) drives it, 'charm' = the AI does
    const mode = luis === this.player && !this.bot ? 'ctrl' : luis.pid != null && this.net ? 'remote' : 'charm';
    this.control = { luis, target: t, t: dur, origin: { x: luis.x, y: luis.y }, mode };
    luis.away = true; luis.pending = null; luis.state = 'idle'; luis.in = { mx: 0, my: 0, run: false };
    t.team = luis.baseTeam; t.pending = null; t.stunT = 0; if (t.state === 'cast') { t.state = 'idle'; t.playAnim('idle'); }
    if (mode === 'ctrl') this.ctrl = t; else if (mode === 'charm') t.charmT = dur;
    this.castCtx = { f: luis, k: 'ult' }; this.markSrc(t, 'charm'); this.castCtx = null;
    this.cancelAim();
    this.float(t.x, t.y - t.def.height - 34, '¡CONTROLADO!', '#33ff88');
    this.vfx('levelup', t.x, t.y - 10, { scale: 5, below: true, tint: 0x33ff88 });
  }
  endControl() {
    const c = this.control; if (!c) return;
    c.target.team = c.target.baseTeam; c.target.charmT = 0; c.target.in = { mx: 0, my: 0, run: false };
    c.luis.away = false; c.luis.x = c.origin.x; c.luis.y = c.origin.y;
    this.vfx('summon', c.luis.x, c.luis.y - 10, { scale: 3 });
    this.control = null; this.ctrl = null; this.cancelAim();
  }
  ghost(f) {   // silhouette left behind by an invisible Luis
    const s = f.spr, g = this.add.sprite(s.x, s.y, s.texture.key, s.frame.name).setOrigin(s.originX, s.originY).setScale(s.scaleX, s.scaleY).setFlipX(s.flipX).setDepth(f.y - 2).setTint(0x30ff90).setAlpha(0.55);
    this.tweens.add({ targets: g, alpha: 0, duration: 1400, onComplete: () => g.destroy() });
  }
  drawTowerRanges() {   // sparse, stationary arcs at the attack limit of nearby towers
    const me = this.pc, fade = 260;
    this.fighters.forEach(t => {
      if (!t.isTower || t.isNexus) return;
      let r = this.towerRings.get(t);
      if (!t.alive) { r?.destroy(); this.towerRings.delete(t); return; }
      const range = t.def.stats.range, d = dist(t, me), near = range + fade;
      if (d > near) { r?.setVisible(false); return; }
      if (!r) { r = this.add.graphics().setDepth(-500); this.towerRings.set(t, r); }
      const foe = t.baseTeam !== this.player.baseTeam, color = foe ? 0xff4a4a : 0x4a8cff;
      if (r.rangeRadius !== range || r.rangeColor !== color) {   // thick ring + translucent danger disc + bold dashes + cardinal markers
        r.clear();
        r.fillStyle(color, 0.1).fillCircle(0, 0, range);
        r.lineStyle(14, color, 0.25).strokeCircle(0, 0, range - 4);
        r.lineStyle(6, color, 1).strokeCircle(0, 0, range);
        r.lineStyle(2, 0xffffff, 0.55).strokeCircle(0, 0, range - 9);
        for (let i = 0; i < 24; i++) {
          const ang = i * Math.PI / 12, half = Math.PI / 40;
          r.lineStyle(12, color, 0.95).beginPath().arc(0, 0, range + 11, ang - half, ang + half, false).strokePath();
        }
        for (let i = 0; i < 4; i++) {
          const ang = i * Math.PI / 2, c = Math.cos(ang), n = Math.sin(ang);
          r.fillStyle(color, 1).fillTriangle((range - 6) * c, (range - 6) * n, (range - 34) * c - 11 * n, (range - 34) * n + 11 * c, (range - 34) * c + 11 * n, (range - 34) * n - 11 * c);
        }
        r.rangeRadius = range; r.rangeColor = color;
      }
      const a = Math.min(1, (near - d) / fade) * (foe ? 0.9 : 0.5);
      r.setPosition(t.x, t.y).setVisible(true).setAlpha(a);
    });
  }

  /* ---------- Héctor: chains + fire trail ---------- */
  chainShot(o, a, rank) {
    const hook = this.add.image(o.x, o.y, 'chain_hook').setDepth(100000); hook.setScale(60 / Math.max(hook.width, hook.height));
    this.chains.push({ ctx: this.castCtx, owner: o, hook, g: this.add.graphics().setDepth(99999), ax: o.ax, ay: o.ay, x: o.x, y: o.y - o.def.height * 0.55, ox: o.x, oy: o.y, range: a.range, speed: a.speed, phase: 'out', target: null,
      dmg: rk(a.dmg, rank) + o.atk * a.atkScale, stun: rk(a.stun, rank) });
  }
  firePatch(o, x, y, dmg, life) {
    const s = this.add.sprite(x, y, 'vfx_burning_ground').setScale(3.4).setDepth(y - 2).setAlpha(0.95); s.play('vfx_burning_ground');
    this.zones.push({ ctx: this.castCtx, kind: 'fire', owner: o, x, y, t: life, r: 52, dmg, tick: 0, spr: s });
  }
  updateChains(dt) {
    this.chains = this.chains.filter(c => {
      const o = c.owner, g = c.g; g.clear(); this.castCtx = c.ctx || null;
      const sx = o.x, sy = o.y - o.def.height * 0.55;
      if (c.phase === 'out') {
        c.x += c.ax * c.speed * dt; c.y += c.ay * c.speed * dt;
        const hit = this.enemiesOf(o).find(t => !t.isTower && Math.hypot(t.x - c.x, (t.y - t.def.height * 0.5) - c.y) < t.br + 24);
        if (hit) {   // caught: Héctor is pulled to the enemy, who stays stunned while tied
          c.phase = 'tied'; c.target = hit;
          const d = Math.hypot(hit.x - o.x, hit.y - o.y), pullT = Math.max(0.15, d / 1250) + 0.25;
          this.damage(o, hit, c.dmg, 'physical'); hit.stun(pullT + c.stun); this.audio.playAll('ev_hector_chain', { at: hit, vol: 0.9, gap: 0 });
          o.pullTo = { target: hit, t: pullT, dmg: c.dmg }; o.state = 'cast'; o.anim = 'power2'; o.stateT = 0; o.stateDur = 99; o.windup = 99; o.fired = true; o.pending = null;
        } else if (Math.hypot(c.x - sx, c.y - sy) >= c.range || !isWalk(c.x, c.y + 40)) c.phase = 'back';
      } else if (c.phase === 'back') {
        const dx = sx - c.x, dy = sy - c.y, d = Math.hypot(dx, dy);
        if (d < 30) { c.hook.destroy(); g.destroy(); return false; }
        c.x += dx / d * c.speed * 1.4 * dt; c.y += dy / d * c.speed * 1.4 * dt;
      } else {   // tied
        const t = c.target;
        if (!o.pullTo || !t.alive) { c.hook.destroy(); g.destroy(); return false; }
        c.x = t.x; c.y = t.y - t.def.height * 0.5;
      }
      this.castCtx = null;
      c.hook.setPosition(c.x, c.y).setRotation(Math.atan2(c.y - sy, c.x - sx));
      // chain: link by link
      const L = Math.hypot(c.x - sx, c.y - sy), n = Math.max(2, Math.round(L / 16)), tex = this.textures.exists('chain_link');
      for (let i = 0; i < n; i++) { const u = i / n, x = sx + (c.x - sx) * u, y = sy + (c.y - sy) * u; g.fillStyle(i % 2 ? 0x2a2a2a : 0x555555).fillRect(x - 5, y - 3, 10, 6).lineStyle(1, 0x111111).strokeRect(x - 5, y - 3, 10, 6); }
      return true;
    });
  }

  /* ---------- Eliud: eggs, spear, packages ---------- */
  eggGrenade(o, x, y, dmg, r, fuse) {
    const img = this.add.image(o.x, o.y - o.def.height * 0.6, 'egg_grenade').setDepth(100000);
    const sc = 64 / Math.max(img.width, img.height); img.setScale(sc);
    this.tweens.add({ targets: img, x, y: y - 14, duration: 520, ease: 'Sine.Out' });
    this.tweens.add({ targets: img, scale: sc * 1.25, yoyo: true, duration: 260 });
    this.tweens.add({ targets: img, angle: 360, duration: 520 });
    this.grenades.push({ owner: o, img, x, y, r, dmg, t: 0.52 + fuse, land: 0.52, ring: null });
  }
  eggTrap(o, cx, cy, n, r, dmg, life) {
    this.eggs = this.eggs.filter(e => { if (e.owner === o && this.eggs.filter(q => q.owner === o).length > 8) { e.img.destroy(); return false; } return true; });
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + Math.random() * 0.5, d = i === 0 ? 0 : r * (0.45 + Math.random() * 0.4);
      const x = cx + Math.cos(a) * d, y = Phaser.Math.Clamp(cy + Math.sin(a) * d * 0.8, 70, WORLD_H - 70);
      const img = this.add.image(x, y - 90, 'egg_trap').setOrigin(0.5, 0.8).setDepth(y); const sc = 44 / Math.max(img.width, img.height); img.setScale(sc);
      this.tweens.add({ targets: img, y, duration: 260 + i * 60, ease: 'Bounce.Out' });
      this.eggs.push({ owner: o, team: o.team, img, x, y, dmg, t: life, armed: 0.5 + i * 0.06 });
    }
  }
  spearThrow(o, a, rank) {
    const L = a.length, sp = this.add.image(o.x, o.y - o.def.height * 0.55, 'spear').setDepth(100000).setRotation(Math.atan2(o.ay, o.ax));
    sp.setScale(110 / Math.max(sp.width, sp.height));
    this.spears.push({ owner: o, img: sp, x0: o.x, y0: o.y, x: o.x, y: o.y, ax: o.ax, ay: o.ay, L, speed: 900, hit: new Set(), base: rk(a.dmg, rank) + o.atk * a.atkScale, bonus: rk(a.farBonus, rank), w: a.width, stuck: null });
  }
  packageDrop(o, cx, cy, n, life, dur = 10, pow = 0.2) {
    for (let i = 0; i < n; i++) {
      const a = i / Math.max(1, n) * Math.PI * 2, d = n === 1 ? 0 : 70, x = cx + Math.cos(a) * d, y = Phaser.Math.Clamp(cy + Math.sin(a) * d * 0.7, 70, WORLD_H - 70);
      const img = this.add.image(x, y - 520, 'package').setOrigin(0.5, 1).setDepth(y); const sc = 66 / Math.max(img.width, img.height); img.setScale(sc);
      const sh = this.add.ellipse(x, y, 30, 12, 0x000000, 0.0).setDepth(y - 1);
      this.tweens.add({ targets: sh, fillAlpha: 0.35, scaleX: 2.2, scaleY: 2.2, duration: 700 + i * 150 });
      this.tweens.add({ targets: img, y, duration: 700 + i * 150, ease: 'Quad.In', onComplete: () => { this.vfx('run_dust', x, y - 6, { scale: 3, alpha: 0.8, below: true }); this.shake(); this.audio.playAll('ev_eliud_pkg_land', { at: { x, y }, vol: 0.9, gap: 0 }); } });
      this.packages.push({ ctx: this.castCtx, dur, pow, img, sh, x, y, t: life, open: false, land: 0.7 + i * 0.15, scale: sc });
    }
  }
  updateEliud(dt) {
    // grenades: blink during the fuse, then explode
    this.grenades = this.grenades.filter(g => {
      g.t -= dt;
      if (g.t > 0) {
        const left = g.t, blink = left < 0.9 && Math.floor(left * 8) % 2 === 0;
        g.img.setTint(blink ? 0xff5a3a : 0xffffff);
        if (g.t < g.land + 1.2 && g.t <= g.land + 1.0) { g.ring ||= this.add.circle(g.x, g.y, g.r, 0xff6a2a, 0.0).setStrokeStyle(3, 0xff6a2a, 0.5).setDepth(g.y - 3); }
        return true;
      }
      g.img.destroy(); g.ring?.destroy();
      this.vfx('shockwave', g.x, g.y, { scale: g.r / 32 * 1.1, below: true }); this.vfx('spark', g.x, g.y - 30, { scale: 5, tint: 0xffb020 }); this.shake();
      this.audio.playAll('ev_eliud_boom', { at: g, vol: 1, gap: 0 });
      this.enemiesNear(g.owner.team, g.x, g.y, g.r).forEach(t => { this.damage(g.owner, t, g.dmg, 'physical'); g.owner.addRage?.(g.owner.def.hen.rageHit); });
      return false;
    });
    // egg traps: explode when an enemy walks over them
    this.eggs = this.eggs.filter(e => {
      e.t -= dt; e.armed -= dt;
      if (e.t <= 0 || !e.owner.alive && false) { e.img.destroy(); return false; }
      if (e.armed > 0) return true;
      const t = this.fighters.find(f => f.alive && !f.away && !f.isTower && f.team !== e.team && Math.hypot(f.x - e.x, f.y - e.y) < 38);
      if (!t) { e.img.setAlpha(e.t < 3 ? 0.4 + 0.3 * Math.sin(this.time.now / 90) : 1); return true; }
      e.img.destroy();
      this.vfx('shockwave', e.x, e.y, { scale: 2.2, below: true }); this.vfx('spark', e.x, e.y - 20, { scale: 3.5, tint: 0xffb020 }); this.audio.playAll('ev_eliud_trapboom', { at: e, vol: 0.85, gap: 40 });
      this.enemiesNear(e.team, e.x, e.y, 80).forEach(v => { this.damage(e.owner, v, e.dmg, 'physical'); e.owner.addRage?.(e.owner.def.hen.rageHit); });
      return false;
    });
    // spears: fly, pierce, stick; Eliud picks it up to refresh the cooldown
    this.spears = this.spears.filter(s => {
      if (!s.stuck) {
        s.x += s.ax * s.speed * dt; s.y += s.ay * s.speed * dt;
        const d = Math.hypot(s.x - s.x0, s.y - s.y0);
        s.img.setPosition(s.x, s.y - s.owner.def.height * 0.55 * Math.max(0, 1 - d / s.L));
        this.enemiesOf(s.owner).forEach(t => {
          if (!s.hit.has(t) && Math.hypot(t.x - s.x, t.y - s.y) < s.w / 2 + t.br * 0.7) {   // farther = more damage
            s.hit.add(t); const mult = 1 + (s.bonus - 1) * Math.min(1, d / s.L);
            this.damage(s.owner, t, s.base * mult, 'physical'); this.vfx('punch', t.x, t.cy, { scale: 3.5 }); s.owner.addRage?.(s.owner.def.hen.rageHit);
            if (mult > 1.3) this.float(t.x, t.y - t.def.height - 46, `x${mult.toFixed(1)}`, '#ff9a2e');
          }
        });
        if (d >= s.L || !isWalk(s.x, s.y)) {   // stuck in the ground
          s.stuck = true; s.img.destroy();
          s.img = this.add.image(s.x, s.y, 'spear_stuck').setOrigin(0.5, 0.9).setDepth(s.y); s.img.setScale(70 / Math.max(s.img.width, s.img.height));
          this.vfx('run_dust', s.x, s.y - 4, { scale: 2.5, alpha: 0.8, below: true }); this.audio.playAll('ev_eliud_spear_stick', { at: s, vol: 0.85, gap: 0 });
        }
        return true;
      }
      s.img.setAngle(Math.sin(this.time.now / 160) * 2);
      const o = s.owner;
      if (o.cds.p3 <= 0) { this.tweens.add({ targets: s.img, alpha: 0, duration: 250, onComplete: () => s.img.destroy() }); this.vfx('run_dust', s.x, s.y - 6, { scale: 1.6, alpha: 0.7, below: true }); return false; }   // ability ready again: the spear vanishes
      if (o.alive && !o.away && Math.hypot(o.x - s.x, o.y - s.y) < 55) {   // picked up
        s.img.destroy(); o.cds.p3 = 0; this.float(o.x, o.y - o.def.height - 30, 'lanza recuperada', '#ff9a2e'); this.audio.playAll('ev_eliud_pickup', { at: o, vol: 0.8, gap: 0 }); this.vfx('buff', o.x, o.cy, { scale: 3 });
        return false;
      }
      return true;
    });
    // packages: land, open when anyone steps on them
    this.packages = this.packages.filter(p => {
      p.t -= dt; p.land -= dt;
      if (p.open) { p.openT -= dt; p.img.setAlpha(Math.max(0, p.openT / 1.2)); if (p.openT <= 0) { p.img.destroy(); p.sh.destroy(); return false; } return true; }
      if (p.t <= 0) { p.img.destroy(); p.sh.destroy(); return false; }
      if (p.land > 0) return true;
      const f = this.fighters.find(q => q.alive && !q.away && !q.isTower && Math.hypot(q.x - p.x, q.y - p.y) < 44);
      if (f) {
        p.open = true; p.openT = 1.2; p.img.setTexture('package_open'); p.img.setScale(66 / Math.max(p.img.width, p.img.height));
        this.tweens.add({ targets: p.img, scale: p.img.scaleX * 1.3, yoyo: true, duration: 180 });
        this.vfx('levelup', p.x, p.y - 30, { scale: 4 }); this.vfx('spark', p.x, p.y - 40, { scale: 3.5, tint: 0xffd23f }); this.audio.playAll('ev_eliud_pkg_open', { at: p, vol: 0.8, gap: 0 });
        const KIND = [['hp', 'VIDA EXTRA', '#5dff8a', 0x5dff8a], ['atk', 'DAÑO +', '#ff7a5a', 0xff7a5a], ['aspd', 'VEL. ATAQUE +', '#ffd23f', 0xffd23f], ['def', 'DEFENSA +', '#7ee0ff', 0x7ee0ff]];
        const [kt, label, col, tint] = KIND[Math.random() * 4 | 0];
        this.castCtx = p.ctx || null; f.addPkBuff(kt, p.dur, p.pow); this.markSrc(f, 'pk_' + kt); this.castCtx = null;
        this.float(f.x, f.y - f.def.height - 40, `${label} ${Math.round(p.pow * 100)}% · ${p.dur}s`, col);
        this.float(p.x, p.y - 80, '¡Paquete!', '#ffd23f'); this.vfx('buff', f.x, f.cy, { scale: 4, tint });
      }
      return true;
    });
  }

  /* ---------- world API used by fighters ---------- */
  enemiesOf(f) { return this.fighters.filter(t => t.alive && !t.puddle && !t.away && !t.drop && t.team !== f.team && (!f.isBoss || this.bossCanAttack(f, t)) && (!f.camp || campCanAttack(f, t)) && !laneUnitIgnoresBoss(f, t)); }
  enemiesWithin(f, r) { return this.enemiesOf(f).filter(t => eDist(t.x, t.y, f.x, f.y) <= r); }
  meleeHits(f, reach) {
    return this.enemiesOf(f).filter(t => {
      const d = dist(t, f);
      return d <= reach + t.br && (d < 45 || ((t.x - f.x) * f.ax + (t.y - f.y) * f.ay) / d > 0.25);
    });
  }
  nearestEnemy(f, r) {
    let best = null, bd = r;
    for (const t of this.enemiesOf(f)) { if ((t.invis || (t.antivirus && t.owner?.invis)) && !f.isTower) continue; if (t.inBush && t.hiddenInBush(f.baseTeam)) continue; const d = dist(t, f) - (t.br - BODY_R); if (d <= bd) { best = t; bd = d; } }
    return best;
  }

  after(sec, fn) { this.timers.push({ t: sec, fn, ctx: this.castCtx }); }

  // remembers which ability caused a status on `f` (shown in the status bar at the top of the HUD)
  markSrc(f, type) {
    const c = this.castCtx, ab = c?.f?.def?.abilities?.[c.k];
    f.srcs = f.srcs || {};
    if (ab) f.srcs[type] = { champ: c.f.def.name, name: ab.name, icon: 'icon_' + ab.icon, desc: ab.desc };
    else if (!c) { /* no context: keep the previous source */ } else f.srcs[type] = null;
  }

  damage(src, target, raw, type, dot = false) {
    if (this.net?.role === 'client') return 0;   // online clients only show what the host reports
    if (!target.alive) return 0;
    if (src?.isBoss && !this.bossCanAttack(src, target)) return 0;
    if (src?.bossDmg) raw *= src.bossDmg;   // boss level: more damage in every attack
    if (laneUnitIgnoresBoss(src, target)) return 0;
    if (target.invulT > 0 || target.puddle) return 0;   // Show principal: invulnerable / Julio as an ink puddle: untargetable
    recordBossAttacker(target, src);
    if (!dot && src && src.team !== target.team && target.key === 'xeviche' && target.arepaBlocks()) return 0;   // Arepa reina pepiada: the shield swallows this hit
    if (target.isTower && target.wallRef?.alive) return 0;   // the outer tower protects the inner one
    if (target.isTower && src) { const at = src.owner || src, R = towerCircle(target), dx = at.x - target.x, dy = (at.y - target.y) / YR; if (dx * dx + dy * dy > R * R) return 0; }   // nobody can hit a structure from outside its circle
    if (target.isTower && !this.basicDmg) return 0;   // towers and nexus only take basic attacks
    if (!dot) this.audio.play(target.isNexus ? 'hit_heavy' : target.isTower ? 'hit_metal' : type === 'physical' ? 'hit_flesh' : 'debuff', { at: target, vol: target.isTower ? 0.5 : 0.55, gap: 90 });
    const resist = type === 'physical' ? target.armor : type === 'magic' ? target.mr : 0;
    if (src?.key === 'luis' && target !== src) src.lastTarget = target;
    if (target.isRage && !dot && target.alive) target.addRage(Math.min(10, raw * 100 / (100 + resist) / target.maxHp * 100 * target.def.hen.rageTaken));
    { const atk = src?.owner || src; if (target.isChamp && atk?.isChamp && atk.team !== target.team) { atk.hunted = { team: target.team, t: 3 }; target.lastChampHit = { champ: atk, t: this.gameT }; (target.hitBy ||= new Map()).set(atk, this.gameT); } }   // allied minions/towers retaliate
    if (target.key === 'luis' && src?.isChamp) { const hz = this.zones.find(z => z.kind === 'hack' && z.owner === target); if (hz && !hz.free.has(src)) { hz.free.add(src); src.silenceT = 0; this.float(src.x, src.y - src.def.height - 30, 'LIBRE', '#ffffff'); } }
    if (src?.key === 'julio' && target.ink && !dot && !this.inInk) this.explodeInk(src, target);
    let dmg = Math.max(1, raw * 100 / (100 + resist));
    if (target.sShield && !dot && src && src.team !== target.team && this.sShieldBlock(target, dmg)) return 0;   // Escudo antimperialista: the first hit is absorbed
    if (target.drT > 0) dmg *= 1 - target.drPct;   // Colectivo protector
    if (target.isChamp && target.pas?.size) {
      if (type === 'physical' && target.pas.has('chaleco_antibalas')) { dmg *= 1 - 0.15 * target.pas.get('chaleco_antibalas'); if (!dot && this.time.now - (target.blkT || 0) > 600) { target.blkT = this.time.now; this.vfx('block', target.x, target.cy, { scale: 1.8, alpha: 0.8 }); } }
      if (type === 'magic' && target.mshield > 0) { const ab = Math.min(target.mshield, dmg); target.mshield -= ab; dmg -= ab; this.vfx('shield', target.x, target.cy, { scale: 2, tint: 0x66e0ff, alpha: 0.7 }); if (target.mshield <= 0.5) { target.mshield = 0; target.mshieldCd = 10; } if (dmg <= 0) return 0; }
    }
    { const so = src?.owner || src; if (target.isChamp || so?.isChamp) { if (target.isChamp) target.combatT = 5; if (so?.isChamp && so !== target) so.combatT = 5; } }
    if (target.hen && target.henHp > 0) {   // the hen only loses durability: Eliud still takes the full damage
      target.henHp -= dmg;
      if (target.henHp <= 0) { target.endBuff(); target.setSkin(target.key); this.vfx('levelup', target.x, target.y - 10, { scale: 4, below: true }); this.float(target.x, target.y - target.def.height - 40, '¡Gallina agotada!', '#ff8a6a'); }
    }
    if (target.shieldHp > 0) {   // temporary shield: a white bar in front of the health; it is consumed first, then the rest hits health
      const ab = Math.min(target.shieldHp, dmg); target.shieldHp -= ab; dmg -= ab;
      if (ab >= 1 && !dot) this.float(target.x + Phaser.Math.Between(-15, 15), target.y - target.def.height - 18, `${Math.round(ab)}`, '#ffffff');
      if (target.shieldHp <= 0.5) { target.shieldHp = 0; target.shieldT = 0; if (target.inkSh) this.inkShBurst(target); }
      if (dmg <= 0) return 0;
    }
    target.hp -= dmg;
    if (target.isChamp && dmg > 0) this.logDamage(src, target, dmg, type, dot);
    if (target.recall && dmg > 0) { target.recall = null; this.float(target.x, target.y - target.def.height - 30, 'Teletransporte cancelado', '#ff9a7a'); }
    { const o = src?.owner || src; if (o?.isChamp && o.it?.lifesteal && type === 'physical' && !dot && o !== target) o.hp = Math.min(o.maxHp, o.hp + o.healMult * dmg * o.it.lifesteal * (o.pas.has('garras_vampiricas') && o.hp < o.maxHp * 0.4 ? 1 + o.pas.get('garras_vampiricas') : 1)); }
    this.onHitPassives(src, target, dmg, type, dot);
    if (target.protein && dmg > 0) { target.protein = null; this.float(target.x, target.y - target.def.height - 30, '¡Proteína rota!', '#ff9a7a'); }
    if (!dot) target.flash();
    if (dmg < 1e6) this.float(target.x + Phaser.Math.Between(-15, 15), target.y - target.def.height - 5, `${Math.round(dmg)}`,
      type === 'magic' ? '#c77dff' : type === 'physical' ? '#ffffff' : '#9be37a');
    { const y = src?.owner || src;   // Yonaiker: the ship bar only fills by landing basic attacks on foot
      if (y?.key === 'yonaiker' && y.def.charge && dmg > 0 && !dot && !y.bomber && !y.away && y.ranks.p3 && target.team !== y.team) {
        const a = y.def.abilities.p3, gain = this.basicDmg ? rk(a.gainBasic, y.ranks.p3) : 0;
        y.charge = Math.min(100, y.charge + gain);
      } }
    this.net?.onDmg(src, target, dmg, type, dot);
    if (target.hp <= 0) { target.hp = 0; target.die(src); }
    return dmg;
  }

  /* ---------- death recap: who hit you, with what, for how much (last 10 s) ---------- */
  logDamage(src, target, dmg, type, dot) {
    const ctx = this.castCtx, atk = ctx?.f || src?.owner || src; if (!atk) return;
    const ab = dot === 'burn' || dot === 'poison' ? null : ctx?.f && ctx.k ? ctx.f.def.abilities?.[ctx.k] : null;   // DoT ticks ('burn' / 'poison') are listed on their own
    const label = ab ? ab.name : dot === 'burn' ? 'Quemadura' : dot === 'poison' ? 'Veneno' : this.inPassive ? 'Objetos y pasivas' : this.basicDmg ? 'Ataque básico' : dot ? 'Fuego / efectos continuos' : 'Otros efectos';
    const ev = (target.dmgEvents ||= []); ev.push({ t: this.gameT, atk, label, icon: ab ? 'icon_' + ab.icon : dot === 'burn' ? 'icon_burn' : dot === 'poison' ? 'icon_poison' : null, dmg, type });
    while (ev.length && this.gameT - ev[0].t > 12) ev.shift();
  }
  buildRecap(v, kk, raw) {   // entries: the killer first, then the champions that assisted (by damage); each with its abilities and damage
    if (this.net?.role === 'client') return v.recap;   // the host sends it
    const now = this.gameT, by = new Map(), mk = (id, name, face) => ({ id, name, face, total: 0, ab: new Map() });
    for (const e of (v.dmgEvents || []).filter(e => now - e.t <= 10)) {
      const a = e.atk?.isChamp ? e.atk : null, id = a ? a.nid : 'minions'; let en = by.get(id); if (!en) by.set(id, en = mk(id, a ? a.def.name : 'Súbditos y torres', a ? a.key : null));
      en.total += e.dmg; const x = en.ab.get(e.label) || { label: e.label, icon: e.icon, dmg: 0, type: e.type }; x.dmg += e.dmg; en.ab.set(e.label, x);
    }
    const kid = kk?.isChamp ? kk.nid : 'minions';
    if (!by.has(kid)) by.set(kid, mk(kid, kk?.isChamp ? kk.def.name : (raw?.def?.name || 'Súbditos y torres'), kk?.isChamp ? kk.key : null));
    v.dmgEvents = [];
    const entries = [...by.values()].map(en => ({ id: en.id, name: en.name, face: en.face, killer: en.id === kid, total: Math.round(en.total), abilities: [...en.ab.values()].map(x => ({ ...x, dmg: Math.round(x.dmg) })).sort((p, q) => q.dmg - p.dmg) })).sort((p, q) => (q.killer - p.killer) || q.total - p.total);
    const rc = { entries, victim: v.def.name };
    this.net?.onRecap?.(v, rc);
    return rc;
  }

  // 1 = fully visible, 0 = hidden by the player's blindness (units only; structures stay visible)
  blindVis(f) {
    const me = this.player;
    if (!me.alive || me.blindT <= 0 || f === this.pc || f === me || f.isTower) return 1;
    const d = dist(f, me);
    return Phaser.Math.Clamp((235 - d) / 115, 0, 1);
  }

  // on-hit effects of the level-3 item passives (all automatic)
  onHitPassives(src, target, dmg, type, dot) {
    if (dot || this.inPassive) return;
    const o = src?.owner || src;
    if (o?.isChamp && o.pas?.has('tarjeta_grafica') && target.team !== o.team && !target.isTower && target.alive && target !== o) {   // Tarjeta gráfica: every attack and ability sets the target on fire for a few seconds (AI damage over time)
      target.burn((6 + o.ap * 0.18) * o.pas.get('tarjeta_grafica'), 4, o, 'magic', 'tarjeta');
    }
    if (o?.isChamp && o.pas?.size && target.team !== o.team && !target.isTower && target.alive && target !== o) {   // anti-heal items: the wound is applied by abilities (AI), by basic attacks (physical)
      if (o.pas.has('cuarentena_digital')) target.wound(0.4, 3);   // mage: every attack and every ability that deals damage
      if (o.pas.has('ransomware') && type === 'physical') target.wound(0.4, 3);   // melee / physical: every physical hit
    }
    if (target.isChamp && target.pas?.has('espinas_firewall') && type === 'physical' && o && o.alive && !o.isTower && o !== target && o.team !== target.team) {   // Espinas de firewall: whoever hits you with a basic attack is wounded and takes a little damage back
      o.wound(0.4, 3); if (this.basicDmg) { this.inPassive = true; this.damage(target, o, 12 + target.armor * 0.12, 'magic', true); this.inPassive = false; } this.vfx('spark', o.x, o.cy, { scale: 1.8, tint: 0xff5a5a });
    }
    if (o?.isChamp && o.pas?.has('moto_electrica') && this.basicDmg && o.moveT > 2 && target.team !== o.team && !target.isTower && target.alive) {   // Moto eléctrica: static charge after running
      o.moveT = 0; this.inPassive = true; this.damage(o, target, 40 * o.pas.get('moto_electrica'), 'magic', true); this.inPassive = false; this.vfx('spark', target.x, target.cy, { scale: 3, tint: 0x66e0ff });
    }
    if (o?.isChamp && o.pas?.size && this.basicDmg && target.team !== o.team && !target.isTower) {
      if (o.pas.has('bate_servidor')) { target.slow(0.2 * o.pas.get('bate_servidor'), 1.5); this.vfx('spark', target.x, target.cy, { scale: 2, tint: 0x66aaff }); }
      if (o.pas.has('punio_acero') && (o.punchN = (o.punchN || 0) + 1) % (o.pas.get('punio_acero') < 1 ? 5 : 3) === 0) {
        this.inPassive = true; this.damage(o, target, dmg * 0.5 * o.pas.get('punio_acero'), 'physical', true); this.inPassive = false;
        this.vfx('shockwave', target.x, target.y - 6, { scale: 2.2, below: true, tint: 0xff9a4a }); this.vfx('punch', target.x, target.cy, { scale: 4 }); this.float(target.x, target.y - target.def.height - 30, '¡DEMOLEDOR!', '#ff9a4a');
      }
    }
    if (o?.key === 'junior' && this.basicDmg && !target.isTower && target.team !== o.team && !dot && target.alive) {   // fist progress: the 3rd hit fills the drawing and stuns
      const F = o.def.fist, m = (target.fist && target.fist.owner === o) ? target.fist : (target.fist = { owner: o, n: 0, t: F.reset }); m.t = F.reset; m.n++;
      if (m.n >= F.hits) {
        target.fist = null; this.inPassive = true; this.damage(o, target, o.atk * F.dmg, 'physical', true); this.inPassive = false;
        target.stun(F.stun); this.vfx('shockwave', target.x, target.y - 6, { scale: 2.6, below: true, tint: 0xff7a3a }); this.vfx('punch', target.x, target.cy, { scale: 5 }); this.float(target.x, target.y - target.def.height - 40, '¡PUÑETAZO!', '#ff9a4a');
      }
    }
    if (target.isChamp && target.pas?.size && target.alive) {
      if (type === 'physical' && this.basicDmg && o && o.alive && !o.isTower && o !== target && target.pas.has('armadura_rack')) { this.inPassive = true; this.damage(target, o, dmg * 0.2 * target.pas.get('armadura_rack'), 'physical', true); this.inPassive = false; this.vfx('spark', o.x, o.cy, { scale: 1.8, tint: 0xffb040 }); }
      if (target.pas.has('servidor_redundante') && target.backupCd <= 0 && target.hp < target.maxHp * 0.3) { target.backupCd = 60; target.hp = Math.min(target.maxHp, target.hp + target.maxHp * 0.25 * target.pas.get('servidor_redundante')); this.vfx('heal', target.x, target.cy, { scale: 4, tint: 0x66ff99 }); this.float(target.x, target.y - target.def.height - 34, '¡COPIA DE SEGURIDAD!', '#7dff9a'); }
    }
  }

  // ground rings of the passives that have an area (burn / spam block / low-life aura / magic barrier): one shared graphics, drawn every frame
  drawPassiveFx() {
    const g = (this.pfx ||= this.add.graphics().setDepth(-880)); g.clear(); const t = this.time.now / 1000;
    for (const f of this.fighters) {   // ground marks of status effects: embers under burning units, ice under slowed ones (they can overlap)
      if (!f.alive || f.isTower || f.away || f.hiddenFor?.(this.player) || !(f.burning || f.slowed) || !this.inView(f.x, f.y, 200)) continue;
      const r = Math.max(34, f.def.height * 0.4);
      if (f.slowed) {
        g.fillStyle(0x7ee0ff, 0.2).fillEllipse(f.x, f.y, r * 2.5, r * 2.5 * YR).fillStyle(0xe9fbff, 0.16).fillEllipse(f.x, f.y, r * 1.5, r * 1.5 * YR).lineStyle(2, 0xbdf2ff, 0.85).strokeEllipse(f.x, f.y, r * 2.5, r * 2.5 * YR);
        for (let i = 0; i < 7; i++) { const a = i * 0.9 + f.nid, d = r * (0.5 + 0.55 * ((i * 37) % 10) / 10), cx = f.x + Math.cos(a) * d, cy = f.y + Math.sin(a) * d * YR, h = 7 + (i % 3) * 3; g.fillStyle(0xbdf2ff, 0.9).fillTriangle(cx - 3, cy, cx + 3, cy, cx, cy - h).fillStyle(0xffffff, 0.8).fillTriangle(cx - 1, cy, cx + 1, cy, cx, cy - h * 0.7); }
      }
      if (f.burning) {
        const pz = 0.65 + 0.35 * Math.sin(t * 9 + f.nid);
        g.fillStyle(0x3a0d05, 0.4).fillEllipse(f.x, f.y, r * 2.3, r * 2.3 * YR).fillStyle(0xff5a1c, 0.22 * pz + 0.1).fillEllipse(f.x, f.y, r * 1.9, r * 1.9 * YR).lineStyle(2, 0xff8a3a, 0.8).strokeEllipse(f.x, f.y, r * 2.3, r * 2.3 * YR);
        for (let i = 0; i < 6; i++) { const a = i * 1.05 + f.nid + t * 0.5, d = r * (0.35 + 0.5 * ((i * 53) % 10) / 10), cx = f.x + Math.cos(a) * d, cy = f.y + Math.sin(a) * d * YR, h = 6 + ((i + Math.floor(t * 8)) % 3) * 3; g.fillStyle(0xff6a1c, 0.9).fillTriangle(cx - 3, cy, cx + 3, cy, cx, cy - h).fillStyle(0xffd060, 0.9).fillTriangle(cx - 1.5, cy, cx + 1.5, cy, cx, cy - h * 0.65); }
      }
    }
    for (const f of this.champs) {
      if (!f.alive || !f.pas?.size || f.hiddenFor?.(this.player) || !this.inView(f.x, f.y, 260)) continue;
      const ring = (r, col, a, dash) => { g.lineStyle(dash ? 3 : 2, col, a).strokeEllipse(f.x, f.y, r * 2, r * 2 * YR); };
      if (f.pas.has('filtro_spam')) { ring(260, 0x9aa8b8, 0.5, true); for (let i = 0; i < 12; i++) { const a = -t * 0.9 + i * 0.5236; g.fillStyle(0xc9d3e0, 0.7).fillRect(f.x + Math.cos(a) * 260 - 2, f.y + Math.sin(a) * 260 * YR - 2, 4, 4); } }
      if (f.pas.has('garras_vampiricas') && f.hp < f.maxHp * 0.4) { const p = 0.5 + 0.5 * Math.sin(t * 7); g.fillStyle(0xff2a2a, 0.14 + 0.12 * p).fillEllipse(f.x, f.y, 150, 150 * YR); ring(80, 0xff4a4a, 0.5 + 0.4 * p); }
      if (f.mshield > 0) { g.fillStyle(0x66e0ff, 0.1).fillEllipse(f.x, f.cy - 6, 90, 130); g.lineStyle(2, 0x9af0ff, 0.75).strokeEllipse(f.x, f.cy - 6, 90, 130); }
      if (f.pas.has('botas_hipersonicas') && f.moveT > 2) { g.lineStyle(3, 0x66e0ff, 0.5).strokeEllipse(f.x, f.y, 70, 70 * YR); }
    }
  }

  // ---------- Julio's ink ----------
  applyInk(src, t) { if (t.alive && !t.isTower) { t.ink = { t: src.def.ink.time, src }; this.markSrc(t, 'ink'); } }
  explodeInk(src, t) {
    const k = src.def.ink, dmg = k.base + src.ap * k.apScale;
    t.ink = null; this.inInk = true; this.audio.playAll('ev_julio_inkpop', { at: t, vol: 0.9, gap: 100 });
    this.damage(src, t, dmg, 'magic'); this.inInk = false;
    this.vfx('poison_hit', t.x, t.cy, { scale: 4, tint: 0x7a4cff });
    this.vfx('spark', t.x, t.cy, { scale: 3, tint: 0xb59cff });
    this.float(t.x, t.y - t.def.height - 44, '¡TINTA!', '#a58cff');
  }
  inkSky(x, y, r, onLand) {   // a big ink blot falls from the sky (with a ground telegraph), then onLand() creates the puddle
    if (this.bot) return onLand();
    const mark = this.add.ellipse(x, y, r * 2, r * 2 * YR, 0x6a3cff, 0.18).setStrokeStyle(2, 0xb59cff, 0.8).setDepth(-898);
    const tex = this.textures.exists('ink_drop') ? 'ink_drop' : 'ink_blot', drop = this.add.image(x, y - 520, tex).setDepth(100000).setDisplaySize(r * 0.9, r * 1.2).setTint(0x6a3cff);
    this.tweens.add({ targets: drop, y: y - 30, duration: 520, ease: 'Quad.In', onComplete: () => {
      drop.destroy(); mark.destroy(); this.shake(); this.audio.playAll('ev_julio_dropland', { at: { x, y }, vol: 0.9, gap: 120 });
      this.vfx('poison_hit', x, y - 10, { scale: r / 24, tint: 0x6a3cff, below: true }); this.vfx('shockwave', x, y - 8, { scale: r / 40, below: true, tint: 0x8a5cff });
      onLand();
    } });
    this.after(0.8, () => { if (mark.active) mark.destroy(); });
  }
  inkShBurst(t) {   // golden ink shield broken before it timed out: light AI damage + ink mark around it
    const k = t.inkSh; t.inkSh = null; if (!k) return;
    this.vfx('shockwave', t.x, t.y - 10, { scale: k.r / 34, below: true, tint: 0xffd23f }); this.vfx('spark', t.x, t.cy, { scale: 5, tint: 0xffd23f }); this.float(t.x, t.y - t.def.height - 40, '¡Explota la tinta!', '#ffd23f');
    this.enemiesNear(k.owner.team, t.x, t.y, k.r).forEach(e => { this.damage(k.owner, e, k.dmg, 'magic'); this.applyInk(k.owner, e); });
  }
  inkBounce(src, from, left, dmg, jb, hits) {   // Julio's passive: the golden ink hops to the nearest enemy
    if (left <= 0) return;
    const next = this.enemiesOf(src).filter(e => !hits.has(e) && Math.hypot(e.x - from.x, e.y - from.y) <= jb.range).sort((p, q) => Math.hypot(p.x - from.x, p.y - from.y) - Math.hypot(q.x - from.x, q.y - from.y))[0];
    if (!next) return; const skip = new Set(hits); hits.add(next); this.vfx('spark', from.x, from.cy ?? from.y - 40, { scale: 2.6, tint: 0xffd23f });
    const dx = next.x - from.x, dy = next.y - from.y, d = Math.hypot(dx, dy) || 1;
    this.projectile(src, { from: { x: from.x, y: from.y }, dir: { x: dx / d, y: dy / d }, lift: (from.def?.height || 60) * 0.55, skip, range: d + 160, speed: 700, dmg, type: 'magic', obj: 'ink_gold_drop', vfx: 'energy_bolt', tint: 0xffd23f, face: true, scale: 0.05, r: 12, basic: true,
      onHit: t => { hits.add(t); this.inkBounce(src, t, left - 1, dmg * jb.keep, jb, hits); } });
  }
  inkDrop(src, x, y, r, dmg) {   // telegraph then a falling ink drop
    const mark = this.add.image(x, y, this.textures.exists('ink_blot') ? 'ink_blot' : 'zone').setDepth(y - 3).setAlpha(0.5).setTint(0x6a3cff).setDisplaySize(r * 1.6, r * 1.6 * 0.8);
    const dropTex = this.textures.exists('ink_drop') ? 'ink_drop' : null;
    const drop = dropTex ? this.add.image(x, y - 420, dropTex).setDepth(100000).setDisplaySize(40, 56) : this.add.circle(x, y - 420, 14, 0x6a3cff).setDepth(100000);
    this.tweens.add({ targets: drop, y: y - 20, duration: 450, ease: 'Quad.In', onComplete: () => {
      drop.destroy(); mark.destroy(); this.audio.playAll('ev_julio_dropland', { at: { x, y }, vol: 0.8, gap: 120 });
      this.vfx('poison_hit', x, y - 10, { scale: 4.5, tint: 0x6a3cff, below: true }); this.shake();
      this.enemiesNear(src.team, x, y, r).forEach(t => { this.damage(src, t, dmg, 'magic'); this.applyInk(src, t); });
    } });
  }
  sPath(o, L, amp, n) {   // S-shaped polyline in front of the caster
    const px = -o.ay, py = o.ax, pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n, off = Math.sin(u * Math.PI * 2) * amp; pts.push({ x: o.x + o.ax * L * u + px * off, y: o.y + o.ay * L * u + py * off }); }
    return pts;
  }
  nearPath(pts, x, y, r) { for (let i = 1; i < pts.length; i++) if (segDist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, x, y) <= r) return true; return false; }
  inkTrail(pts, width, life, bright = 0) {   // pixel-art ink stroke on the ground (canvas rendered at 2px per pixel), revealed along the path, then fades
    if (this.bot) return;   // pure decoration (and the headless host has no renderer to upload the canvas to)
    const K = 2, m = width * 0.9 + 12, r = width / 2;
    const PAL = [{ b: '#1d0f4a', m: '#35208a', c: '#5a34d8', h: '#9a74ff' }, { b: '#2a1a70', m: '#4a2ec0', c: '#7a5cff', h: '#cdbcff' }, { b: '#3b2a9a', m: '#7a5cff', c: '#b8a4ff', h: '#ffffff' }][Math.max(0, Math.min(2, bright))];   // brighter ink with every rank
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(q => { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); });
    x0 = Math.floor(x0 - m); y0 = Math.floor(y0 - m);
    const W = Math.ceil((x1 + m - x0) / K), H = Math.ceil((y1 + m - y0) / K);
    const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };
    const px = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const wx = x0 + i * K + K / 2, wy = y0 + j * K + K / 2;
      let d = 1e9, u = 0;
      for (let n = 1; n < pts.length; n++) {
        const ax = pts[n - 1].x, ay = pts[n - 1].y, bx = pts[n].x, by = pts[n].y, dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((wx - ax) * dx + (wy - ay) * dy) / l2)), dd = Math.hypot(wx - (ax + t * dx), wy - (ay + t * dy));
        if (dd < d) { d = dd; u = (n - 1 + t) / (pts.length - 1); }
      }
      const rr = r * (0.78 + 0.3 * hash(Math.floor(u * 90), 7)) , rough = hash(i, j);
      const edge = rr - d;
      let c = null;
      if (edge > 0) c = edge < K * 1.6 ? '#0b0524' : edge < K * 3 && rough < 0.5 ? PAL.b : d < rr * 0.32 ? (rough < 0.12 ? PAL.h : PAL.c) : (d < rr * 0.6 && rough < 0.35 ? PAL.m : PAL.b);
      else if (edge > -r * 0.5 && rough < 0.045) c = rough < 0.02 ? '#35208a' : '#0b0524';   // splatter dots
      if (c) px.push({ i, j, c, u });
    }
    px.sort((a, b) => a.u - b.u);
    const key = 'inktrail' + (this.inkId = (this.inkId || 0) + 1), tex = this.textures.createCanvas(key, W, H), ctx = tex.getContext();
    const im = this.add.image(x0, y0, key).setOrigin(0, 0).setScale(K).setDepth(-900);
    let n = 0;
    const step = Math.ceil(px.length / 14);
    const ev = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      for (let e = Math.min(px.length, n + step); n < e; n++) { ctx.fillStyle = px[n].c; ctx.fillRect(px[n].i, px[n].j, 1, 1); }
      tex.refresh();
      if (n >= px.length) ev.remove();
    } });
    this.tweens.add({ targets: im, alpha: 0, delay: life * 1000, duration: 500, onComplete: () => { im.destroy(); this.textures.remove(key); } });
  }

  inView(x, y, m = 160) { if (this.bot) return false; const v = this.cameras.main.worldView; return x > v.x - m && x < v.right + m && y > v.y - m && y < v.bottom + m; }
  float(x, y, text, color = '#fff') {
    if (!this.inView(x, y) || (this.floatN || 0) >= 36) return;   // nobody sees floating text far from the camera; also cap how many exist at once (each is a canvas texture)
    this.floatN = (this.floatN || 0) + 1;
    const t = this.add.text(x, y, text, { fontFamily: 'monospace', fontSize: 16, fontStyle: 'bold', color, stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5).setDepth(100000);
    this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 900, onComplete: () => { t.destroy(); this.floatN--; } });
  }

  vfx(name, x, y, { scale = 3, alpha = 1, tint = null, below = false } = {}) {
    if (!this.inView(x, y, 260)) return null;   // effects outside the camera are never seen: do not even create them
    const s = this.add.sprite(x, y, 'vfx_' + name).setScale(scale, name === 'shockwave' ? scale * YR : scale).setDepth(below ? y - 2 : y + 2).setAlpha(alpha);
    if (tint) s.setTint(tint);
    s.play({ key: 'vfx_' + name, repeat: 0 });
    s.once('animationcomplete', () => s.destroy());
    return s;
  }

  shake() {  }

  projectile(owner, o) {
    let { ax, ay } = owner;
    if (o.dir) { ax = o.dir.x; ay = o.dir.y; } else if (o.ang) { const c = Math.cos(o.ang), sn = Math.sin(o.ang); [ax, ay] = [ax * c - ay * sn, ax * sn + ay * c]; }   // fan shots / custom direction
    const x = o.from ? o.from.x : owner.x + ax * 45, y = o.from ? o.from.y : owner.y + ay * 45, lift = o.lift ?? owner.def.height * 0.55;
    let s;
    if (o.animFx && this.anims.exists(o.animFx)) {   // animated sprite from generated frames (comb wave)
      s = this.add.sprite(x, y - lift, 'comb_wave0').setScale(o.scale || 1).setRotation(Math.atan2(ay, ax)); s.play(o.animFx);
    } else if (o.obj && this.textures.exists(o.obj)) {   // sprite object (e.g. a laptop) instead of a vfx sheet
      s = this.add.image(x, y - lift, o.obj).setScale(o.scale || 0.2); if (o.face) s.setRotation(Math.atan2(ay, ax));
      if (o.tint) s.setTint(o.tint);
    } else {
      s = this.add.sprite(x, y - lift, 'vfx_' + (o.vfx || 'energy_bolt')).setScale(o.scale || 2).setRotation(Math.atan2(ay, ax)).setFlipY(ax < 0);
      if (o.tint) s.setTint(o.tint);
      s.play('vfx_' + (o.vfx || 'energy_bolt'));
    }
    this.projs.push({ s, x, y, px: x, py: y, lift, ax, ay, owner, team: owner.team, left: o.range || 900, ctx: this.castCtx, basic: !!this.basicDmg, ...(owner.isTower ? { showPath: true, trail: [] } : {}), ...o });
  }

  // cacti ring the zone and fill it (outer ring first, then the inside), then fade
  cacti(cx, cy, radius) {
    const pts = [], ringN = Math.round(radius * 0.108), fillN = Math.round(radius * 0.085);
    for (let i = 0; i < ringN; i++) { const a = (i / ringN) * Math.PI * 2 + Math.random() * 0.2; pts.push({ x: cx + Math.cos(a) * radius * 0.96, y: cy + Math.sin(a) * radius * 0.96 * YR, ring: true }); }
    for (let i = 0, tries = 0; i < fillN && tries < 300; tries++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius * 0.78, q = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * YR };
      if (pts.every(o => Math.hypot(o.x - q.x, o.y - q.y) > 40)) { pts.push(q); i++; }
    }
    pts.forEach((q, i) => {
      const y = Phaser.Math.Clamp(q.y, WALK_Y0, WALK_Y1);
      const c = this.add.image(q.x, y, 'cactus').setOrigin(0.5, 1).setDepth(y).setScale(0);
      const sc = (62 + Math.random() * 24) / c.height, delay = (q.ring ? 0 : 260) + i * 18;
      this.tweens.add({ targets: c, scale: sc, duration: 170, delay, ease: 'Back.Out' });
      this.tweens.add({ targets: c, alpha: 0, delay: 1500, duration: 350, onComplete: () => c.destroy() });
      if (i % 3 === 0) this.after(delay / 1000, () => this.vfx('poison_hit', q.x, y - 10, { scale: 2, alpha: 0.7, tint: 0x66ff66, below: true }));
    });
  }

  // wall of 4 tires, perpendicular to the aim, blocks enemy projectiles
  tires(owner, cx, cy, life, size = 1, hp = null) {   // size / hp scale with the ability level: small and fragile at first, full size and sturdy at max
    const px = -owner.ay, py = owner.ax;
    for (let i = 0; i < 4; i++) {
      const x = cx + px * (i - 1.5) * 84 * size, y = Phaser.Math.Clamp(cy + py * (i - 1.5) * 84 * size, WALK_Y0, WALK_Y1);
      const s = this.add.image(x, y, 'tire').setOrigin(0.5, 0.85).setDepth(y);
      const sc = 62 * size / s.height; s.setScale(0);
      this.tweens.add({ targets: s, scale: sc, duration: 140 + i * 40, ease: 'Back.Out' });
      this.obstacles.push({ x, y, r: 26 * size, team: owner.team, left: life, s, nx: owner.ax, ny: owner.ay, hp, maxHp: hp, life0: life, h: 62 * size });
    }
  }

  summonBots(owner, n, life, ap, hpMult = 1) {
    if (this.net?.role === 'client') return;
    const mk = (key, count, back) => {
      for (let i = 0; i < count; i++) {
        const slot = { x: owner.facing * (back ? -90 - i * 30 : 80 + i * 30), y: (i % 2 ? 1 : -1) * (30 + (i >> 1) * 26) };
        const b = new Fighter(this, key, owner.team, owner.x + slot.x, owner.y + slot.y, { ai: true, owner, life, botAp: ap, slot, hpMult });
        b.hp = b.maxHp; b.ax = owner.ax; b.ay = owner.ay;
        this.fighters.push(b);
        this.vfx('summon', b.x, b.y - 10, { scale: 2.2, below: true });
      }
    };
    mk('bot_melee', n.melee, false); mk('bot_ranged', n.ranged, true);
  }

  /* ---------- frame loop ---------- */
  togglePause() {
    this.paused = !this.paused;
    this.audio.play(this.paused ? 'ui_pause' : 'ui_unpause', { gap: 0 });
    if (this.net) return;   // online: the match keeps running behind the menu
    if (this.paused) this.audio.cur?.pause(); else this.audio.cur?.resume();
    if (this.paused) { this.anims.pauseAll(); this.tweens.pauseAll(); this.time.paused = true; }
    else { this.anims.resumeAll(); this.tweens.resumeAll(); this.time.paused = false; }
  }
  surrender() {   // our nexus collapses (destruction sprite) and the game is lost
    if (this.paused) this.togglePause();
    if (this.over || this.net) return;
    const n = this.fighters.find(f => f.isNexus && f.team === this.player.baseTeam);
    this.audio.voice('v_surrender', 8, null, { title: 'RENDICIÓN', sub: 'Tu equipo se ha rendido', team: 2 });
    if (n) { this.basicDmg = true; this.damage(null, n, 1e9, 'true'); this.basicDmg = false; }
  }
  endGame(winner) {
    if (this.over) return;
    this.over = { winner, t: 0 };
    this.audio.vq = [];   // the end of the game goes first
    this.audio.voice(winner === this.player.baseTeam ? 'v_nexus_win' : 'v_nexus_lose', 9, null, { title: winner === this.player.baseTeam ? '¡VICTORIA!' : 'DERROTA', sub: winner === this.player.baseTeam ? 'El nexo enemigo ha caído' : 'Tu nexo ha sido destruido', team: 2, kind: 'streak', big: 5 });
    this.audio.play(winner === this.player.baseTeam ? 'ui_victory' : 'ui_defeat', { gap: 0, vol: 1 });
    this.player.in = { mx: 0, my: 0, run: false };
    this.cancelAim();
    this.announce(winner === this.player.baseTeam ? '¡Has destruido el nexo enemigo!' : 'Tu nexo ha sido destruido', winner);
  }
  // ---- epic announcement banners (shown while the matching voice line plays) ----
  showBanner(b, ms) { this.banner = { ...b, t: ms / 1000, T: ms / 1000 }; }
  faceOf(f) { return f ? (f.isChamp ? { tex: f.def.ref, kind: 'face' } : f.def?.tex ? { tex: f.def.tex, kind: 'unit' } : null) : null; }
  // text feed is replaced by banners; kept as a no-op so older callers stay harmless
  announce(text, team, snd) { if (snd && snd !== 'none') this.audio.playAll(snd, { vol: 1, gap: 0 }); }
  announce_old(text, team, snd) { if (snd) this.audio.playAll(snd, { vol: 1, gap: 0 }); else this.audio.play('ui_announce', { vol: 0.7, gap: 300 }); this.feed.push({ text, team, t: 6 }); if (this.feed.length > 4) this.feed.shift(); }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    if (Phaser.Input.Keyboard.JustDown(this.k.esc)) { const hs = this.scene.get('hud'); if (this.paused && hs?.menuBack?.()) { /* back one menu level */ } else if (hs?.branchSel) { hs.branchSel = null; } else if (hs?.shopOpen) { hs.shopOpen = false; } else if (this.aimKey) this.cancelAim(); else if (!this.over) this.togglePause(); }
    if ((this.paused || this.curPick()) && !this.net) return;
    if (this.net && !this.net.live) return;   // online: wait for every player to finish loading
    this.feed = this.feed.filter(e => (e.t -= dt) > 0);
    this.audio.tick();
    if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
    if (this.over) this.over.t += dt;
    const bm = this.pc.bomber, aboard = bm && (bm.phase === 'fly' || bm.phase === 'land');
    const zn = Phaser.Math.Clamp(this.scale.height / VIEW_H, 0.6, 4), ab = this.aimKey && this.pc.def.abilities[this.aimKey], far = ab?.wide && (ab.v !== 'leak' || this.pc.leakRe), z = aboard ? zn / 1.5 : far ? zn * 0.5 : zn * this.zoomK;   // aboard the ship: 50 % farther than the normal view
    if (!this.zoom || this.snapZoom || Math.abs(z - this.zoom) < 0.002) this.zoom = z; else this.zoom += (z - this.zoom) * Math.min(1, dt * 4);
    this.cameras.main.setZoom(this.zoom);
    if (aboard) { this.camTarget.x = bm.pt.x; this.camTarget.y = bm.pt.y; this.cameras.main.centerOn(bm.pt.x, bm.pt.y); } else { this.camTarget.x = this.pc.x; this.camTarget.y = this.pc.y - 30; }
    if (this.pc.leakRe) { if (!this._leakAim && this.pc.free && !this.aimKey && !this.over) { this._leakAim = true; this.aimKey = 'ult'; } } else this._leakAim = false;   // Filtraciones: after the leak the enemy-selection view (zoom out + pick) opens by itself, no second press needed
    if (this.snapZoom) { this.snapZoom = false; this.cameras.main.centerOn(this.camTarget.x, this.camTarget.y); }

    if (!this.bot) {   // the headless host has no player of its own: every champion is a remote player or the AI
    if (this.ctrl || this.over) this.player.in = { mx: 0, my: 0, run: false };
    if (this.over) this.player.in = { mx: 0, my: 0, run: false }; else if (this.player.charmT > 0 && this.net?.role !== 'client') this.runAi(this.player, dt); else if (this.net && (this.paused || this.player.charmT > 0 || (this.control?.mode === 'remote' && this.control.target === this.player))) this.player.in = { mx: 0, my: 0, run: false }; else this.handleInput();
    }
    this.net?.pre(dt);
    const due = []; this.timers = this.timers.filter(t => ((t.t -= dt) > 0) || (due.push(t), false)); due.forEach(t => { this.castCtx = t.ctx || null; t.fn(); this.castCtx = null; });
    if (this.training && this.enemy.alive && this.enemy.hp < this.enemy.maxHp) this.enemy.hp = Math.min(this.enemy.maxHp, this.enemy.hp + this.enemy.maxHp * 0.12 * dt);   // dummy regenerates
    this.gameT += dt;
    if (this.survival) this.survTick(dt); else if (this.bosses) this.bossTick(dt);
    if (!this.over) this.waveT -= dt; if (this.waveT <= 0 && !this.over && this.net?.role !== 'client') { this.waveT = 28; this.spawnWave(0); this.spawnWave(1); this.waveN++; }
    if (!this.over && this.net?.role !== 'client') this.fighters.forEach(f => { if (this.control?.mode === 'remote' && f === this.control.target) return; if ((f.ai && this.aiOn && f !== this.ctrl) || f.isBot || f.isMinion || f.isTower || f.charmT > 0) this.runAi(f, dt); });
    this.recordHistory(dt);
    this.updateCamps(dt);
    this.updateYonaiker(dt);
    this.updateJunior(dt);
    this.fighters.forEach(f => f.update(dt));
    this.fighters.forEach(f => f.alive && !f.isTower && !f.def.static && f.def.bot !== 'wall' && this.resolveSolids(f));
    this.net?.smooth(dt);   // online client: remote units interpolated, our own position reconciled
    // AI champions spend their skill points (ultimate first when available)
    this.champs.forEach(e => { if ((e === this.player && !this.bot) || e.pid != null || this.net?.role === 'client') return; while (e.points > 0) { const open = ABILITY_KEYS.filter(a => e.canSpend(a)); if (!open.length) break; e.spend(open.includes('ult') ? 'ult' : open[Math.random() * open.length | 0], Math.random() < 0.5 ? 1 : 0); } });
    if (this.control && this.net?.role !== 'client') { this.control.t -= dt; if (this.control.t <= 0 || !this.control.target.alive || !this.control.luis.alive) this.endControl(); }
    this.updateEliud(dt);
    this.updateMortars(dt);
    this.updateChains(dt);
    this.updateZones(dt);
    this.updateProjectiles(dt); this.updateBushes(dt); this.updateMeet(dt); this.updateRecallFx(dt); this.drawCrates(); this.drawStains(dt); this.updateTireShots(dt); this.updateFireZones(dt); this.updateCages(dt); this.drawLeakRing(); this.drawLeakMarks();
    this.obstacles = this.obstacles.filter(o => { if (o.f && (!o.f.alive || o.f.dispose || !this.fighters.includes(o.f))) return false; /* the panel is gone (destroyed, expired or removed): its collision goes with it */ o.left -= dt; if (o.left <= 0) { o.s.destroy(); return false; } return true; });
    this.fighters = this.fighters.filter(f => { if (f.dispose) { f.destroy(); return false; } return true; });
    if (!this.bot) {   // drawing only (the headless host skips it; the gameplay below stays)
      this.fighters.forEach(f => f.render(time));
      this.drawBars();
      this.drawFountain();
      this.drawTowerRanges();
      this.drawAim();
      this.drawRangeHint();
      this.drawRewind(dt);
    }
    this.drawCamps(dt);
    this.drawYonaiker();
    this.drawJunior(dt); this.updateHarem(dt); this.updateBomber(dt); this.updateBomberMirror(dt); this.updateSupport(dt); this.updateBlindZones(dt);
    if (!this.bot) this.drawPassiveFx();
    if (this.rwGlow) { this.rwGlow.t -= dt; this.rwGlow.hg -= dt; if (this.rwGlow.t <= 0) this.rwGlow = null; }
    this.updateFog(dt);
    this.net?.post(dt);
  }

  updateZones(dt) {
    this.zones = this.zones.filter(z => {
      const o = z.owner; z.t -= dt; this.castCtx = z.ctx || null;
      if (z.kind === 'fire') {   // burning trail left by Héctor's bike
        z.spr.setAlpha(Math.min(0.95, z.t * 0.9));
        if (z.t <= 0) { z.spr.destroy(); return false; }
        z.tick += dt;
        if (z.tick >= 0.5) { z.tick -= 0.5; this.enemiesNear(o.team, z.x, z.y, z.r).forEach(t => { this.damage(o, t, z.dmg, 'physical', true); t.burn(z.dmg, 2, o, 'physical', 'trail'); }); }
        return true;
      }
      if (z.kind === 'infect') {   // Leandro's contracts: a green infected area that poisons everyone inside
        if (z.t <= 0) { z.decal?.destroy(); return false; }
        if (this.textures.exists('zone')) z.decal ||= this.add.image(z.x, z.y, 'zone').setTint(0x7dff4a).setAlpha(0.7).setDepth(z.y - 3).setDisplaySize(z.r * 2.1, z.r * 2.1 * YR);
        z.decal?.setAlpha(Math.min(0.7, z.t * 0.7));
        z.tick += dt;
        if (z.tick >= 0.5) {
          z.tick -= 0.5; this.vfx('poison_cloud', z.x + Phaser.Math.Between(-z.r * 0.6, z.r * 0.6), z.y + Phaser.Math.Between(-z.r * 0.4, z.r * 0.4) - 10, { scale: 2.2, alpha: 0.7, below: true });
          this.enemiesNear(o.team, z.x, z.y, z.r).forEach(t => { if (t.isTower) return; const q = t.poisons.find(p => p.tag === z); if (q) q.t = Math.max(q.t, 0.75); else { t.poison(z.total / (z.life0 + 0.75), 0.75, o); t.poisons[t.poisons.length - 1].tag = z; } });   // one poison per zone, kept alive while the target stays inside
        }
        return true;
      }
      if (z.kind === 'blackhole') {   // Axel's Canaima: drags enemies to the centre, then explodes
        const dead = z.t <= 0 || !o.alive;
        z.fx ||= this.add.graphics();
        if (this.textures.exists('laptop_white')) z.icon ||= this.add.image(z.x, z.y - 6, 'laptop_white').setDisplaySize(78, 62);
        const g = z.fx, T = this.time.now / 1000, life = Math.max(0, z.t / z.T);
        g.clear().setDepth(z.y - 2);
        for (let k = 0; k < 4; k++) { const rr = z.r * (1 - k * 0.2); g.fillStyle(0x12041f, 0.16 + 0.1 * k).fillEllipse(z.x, z.y, rr * 2, rr * 1.5); }
        for (let arm = 0; arm < 3; arm++) { g.lineStyle(3, 0xa56bff, 0.55); g.beginPath(); for (let u = 0; u <= 1; u += 0.05) { const ang = T * 3 + arm * 2.094 + u * 5.5, rr = z.r * (1 - u) * 0.95; const px = z.x + Math.cos(ang) * rr, py = z.y + Math.sin(ang) * rr * 0.75; if (u === 0) g.moveTo(px, py); else g.lineTo(px, py); } g.strokePath(); }
        g.lineStyle(3, 0xc9a0ff, 0.5 + 0.4 * (1 - life)).strokeEllipse(z.x, z.y, z.r * 2, z.r * 1.5);
        z.icon?.setPosition(z.x, z.y - 6 + Math.sin(T * 5) * 3).setDepth(z.y + 30).setAngle(Math.sin(T * 7) * 6);
        if (this.net?.role !== 'client') this.enemiesNear(o.team, z.x, z.y, z.r).forEach(t => {
          if (t.isTower || t.away || t.rw) return;
          const dx = z.x - t.x, dy = z.y - t.y, d = Math.hypot(dx, dy); if (d < 14) return;
          const m = Math.min(z.pull * dt, d - 10); t.tryMove(t.x + dx / d * m, t.y + dy / d * m);
        });
        if (dead) {   // boom
          this.vfx('shockwave', z.x, z.y - 10, { scale: z.r / 32 * 1.4, below: true, tint: 0xa56bff }); this.vfx('spark', z.x, z.y - 20, { scale: 6, tint: 0xc9a0ff });
          this.zoneDecal(z.x, z.y, z.r, 0xa56bff, 0.9); this.audio.play('explosion', { at: { x: z.x, y: z.y }, vol: 0.9, gap: 60 });
          this.castCtx = z.ctx || null; this.enemiesNear(o.team, z.x, z.y, z.r).forEach(t => this.damage(o, t, z.dmg, 'magic')); this.castCtx = null;
          g.destroy(); z.icon?.destroy(); return false;
        }
        return true;
      }
      if (z.kind === 'malware') {   // infected zone: stays for a while, anyone enemy that walks in is affected
        if (z.t <= 0) { z.decal?.destroy(); z.icon?.destroy(); return false; }
        if (this.textures.exists('zone')) z.decal ||= this.add.image(z.x, z.y, 'zone').setTint(z.col).setAlpha(0.75).setDepth(z.y - 3).setDisplaySize(z.r * 2.1, z.r * 2.1 * YR);
        z.decal?.setAlpha(Math.min(0.75, z.t * 0.5));
        const itex = 'laptop_' + z.type;
        if (this.textures.exists(itex)) { z.icon ||= this.add.image(z.x, z.y - 40, itex).setDepth(z.y + 50); z.icon.setPosition(z.x, z.y - 55 + Math.sin(this.time.now / 300) * 6).setDisplaySize(86, 70).setAlpha(Math.min(1, z.t)); }
        this.fighters.forEach(f => {
          if (!f.alive || f.away || f.isTower || f.team === o.team) return;
          const cd = (z.cd.get(f) || 0) - dt;
          if (eDist(f.x, f.y, z.x, z.y) <= z.r) { if (cd <= 0) { z.apply(f, !z.first.has(f)); z.first.add(f); z.cd.set(f, 1.0); } else z.cd.set(f, cd); }
          else z.cd.set(f, Math.max(0, cd));
        });
        return true;
      }
      if (z.kind === 'hack') {   // silence aura around Luis
        if (z.t <= 0 || !o.alive) { z.decal?.destroy(); z.fx?.destroy(); return false; }
        z.fx ||= this.add.graphics();
        z.fxT = (z.fxT || 0) - dt;
        if (z.fxT <= 0) {   // TV-static noise around Luis, redrawn ~12 times per second
          z.fxT = 0.08; const g = z.fx; g.clear();
          if (!o.away && !o.hiddenFor(this.player)) {
            g.setDepth(o.y + 40);
            const N = Math.round(z.r * 0.55), cols = [0xffffff, 0x33ff88, 0x0a1a10, 0x9affc8, 0x000000];
            for (let n = 0; n < N; n++) { const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * z.r, sz = Phaser.Math.Between(3, 8); g.fillStyle(cols[Math.random() * cols.length | 0], 0.35 + Math.random() * 0.4).fillRect(o.x + Math.cos(a) * d, o.y + Math.sin(a) * d * YR, sz, Math.random() < 0.3 ? 2 : sz); }
            for (let n = 0; n < 4; n++) { const a = Math.random() * 6.283; g.fillStyle(0x33ff88, 0.4).fillRect(o.x + Math.cos(a) * z.r * 0.5 - 30, o.y + Math.sin(a) * z.r * 0.45, Phaser.Math.Between(30, 90), 3); }
          }
        }
        this.fighters.forEach(f => { if (f.alive && f.isChamp && f.team !== o.team && !z.free.has(f) && eDist(f.x, f.y, o.x, o.y) <= z.r) { f.silenceT = Math.max(f.silenceT, 0.3); this.markSrc(f, 'silence'); } });
        return true;
      }
      if (z.kind === 'puddle') {   // falls from the sky; stuns after a while (faster at rank 2+), rank 3 chains + pulls the stunned to the centre; the puddle vanishes when the stun ends
        if (z.t <= 0) { z.decal?.destroy(); z.fx?.destroy(); return false; }
        z.decal ||= this.add.image(z.x, z.y, this.textures.exists('ink_blot') ? 'ink_blot' : 'zone').setTint(0x4a2cc0).setAlpha(0.85).setDepth(-899).setDisplaySize(z.r * 2.1, z.r * 2.1 * YR);
        const inZ = f => Math.hypot(f.x - z.x, (f.y - z.y) / 0.8) <= z.r;
        this.fighters.filter(f => f.alive && f.team !== o.team && !f.isTower && !f.puddle).forEach(f => {
          if (!inZ(f)) { if (!z.pulls.has(f)) z.inside.delete(f); return; }
          f.slow(z.slow + (z.rank >= 3 && f.isChamp ? 0.15 : 0), 0.15);
          const t = (z.inside.get(f) || 0) + dt; z.inside.set(f, t);
          if (t >= z.stunAfter) { f.stun(z.stun); this.applyInk(o, f); z.inside.set(f, -99); z.done = z.done || z.stun; z.t = Math.min(z.t, z.stun + 0.1); if (z.rank >= 3 && f.isChamp) z.pulls.set(f, z.stun); }
        });
        z.pulls.forEach((tl, f) => {   // rank 3: pull the stunned champion to the middle
          if (!f.alive || tl <= 0) return z.pulls.delete(f);
          z.pulls.set(f, tl - dt); const dx = z.x - f.x, dy = z.y - f.y, d = Math.hypot(dx, dy); if (d > 12) { const m = Math.min(520 * dt, d); f.tryMove(f.x + dx / d * m, f.y + dy / d * m); }
        });
        if (!this.bot) {
          const g = (z.fx ||= this.add.graphics().setDepth(z.y + 2)), T = this.time.now / 1000; g.clear();
          if (z.rank >= 2) for (let i = 0; i < 9; i++) { const ph = (T * 0.9 + i * 0.37) % 1, a = i * 2.4 + Math.floor(T * 0.9 + i * 0.37) * 1.7, rr = Math.sqrt((i * 0.618) % 1) * z.r * 0.85; g.fillStyle(0xb59cff, 0.75 * (1 - ph)).fillCircle(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr * 0.6 - ph * 34, 3 + 4 * Math.sin(ph * 3.1)).lineStyle(1.5, 0xffffff, 0.5 * (1 - ph)).strokeCircle(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr * 0.6 - ph * 34, 3 + 4 * Math.sin(ph * 3.1)); }   // bubbles
          if (z.rank >= 3) this.fighters.forEach(f => { if (!f.alive || f.team === o.team || !f.isChamp || f.puddle || !(inZ(f) || z.pulls.has(f))) return; const n = Math.max(3, Math.round(Math.hypot(f.x - z.x, f.y - z.y) / 16)); for (let i = 0; i <= n; i++) { const u = i / n, cx = z.x + (f.x - z.x) * u, cy = z.y + (f.y - z.y) * u + Math.sin(u * 9 + T * 6) * 3 - u * 26; g.fillStyle(i % 2 ? 0x2b2154 : 0x8a7cc8, 1).fillEllipse(cx, cy, i % 2 ? 11 : 7, i % 2 ? 6 : 10).lineStyle(1, 0x0b0524, 1).strokeEllipse(cx, cy, i % 2 ? 11 : 7, i % 2 ? 6 : 10); } });   // chains to every trapped champion
        }
        return true;
      }
      if (z.t <= 0 || !o.alive) { z.decal?.destroy(); return false; }
      if (this.textures.exists('zone')) {
        z.decal ||= this.add.image(o.x, o.y, 'zone').setTint(0x5dff8a).setAlpha(0.8);
        z.decal.setPosition(o.x, o.y).setDepth(o.y - 3).setDisplaySize(z.r * 2.1, z.r * 2.1 * YR);
      }
      z.tick += dt;
      if (z.tick >= 0.5) {
        z.tick -= 0.5;
        this.fighters.filter(f => f.alive && f.isChamp && f.team === o.team && eDist(f.x, f.y, o.x, o.y) <= z.r).forEach(f => {
          const h = Math.min(z.hps * 0.5, f.maxHp - f.hp); if (h > 0.4) { f.hp += h; this.float(f.x + Phaser.Math.Between(-12, 12), f.y - f.def.height - 6, `+${Math.round(h)}`, '#5dff8a'); }
        });
        this.vfx('heal', o.x + Phaser.Math.Between(-z.r * 0.7, z.r * 0.7), o.y + Phaser.Math.Between(-z.r * 0.3, z.r * 0.3) - 20, { scale: 2, alpha: 0.8, below: true });
      }
      return true;
    });
    this.castCtx = null;
  }

  // tall units (bosses) are hit over their whole standing body, not only at the feet: def.hitR (half width) and def.hitUp (how far up the sprite reaches)
  projHits(p, t) {
    const r = (t.def.hitR || t.br) + (p.r || 14), u = t.def.hitUp || 0;
    if (segDist(p.px, p.py, p.x, p.y, t.x, t.y) < r) return true;
    return u > 0 && [1 / 3, 2 / 3, 1].some(k => segDist(p.px, p.py, p.x, p.y, t.x, t.y - u * k) < r);
  }

  updateProjectiles(dt) {
    const tg = (this.trailG ||= this.add.graphics().setDepth(99500)); tg.clear();   // tower missiles: the path ahead and a fading trail stay visible
    const cur = this.projs; this.projs = [];   // projectiles spawned by an impact (bounces) land in the new list instead of being dropped by the filter
    const kept = cur.filter(p => {
      p.px = p.x; p.py = p.y;
      p.x += p.ax * p.speed * dt; p.y += p.ay * p.speed * dt; p.left -= p.speed * dt;
      p.s.setPosition(p.x, p.y - p.lift).setDepth(p.y + 1);
      if (p.showPath && !this.bot) {
        const col = p.tint ?? (p.owner.baseTeam === 1 ? 0xff4a3a : 0xffb347), len = Math.min(p.left, 520), y0 = p.y - p.lift;
        tg.lineStyle(3, col, 0.4).lineBetween(p.x, y0, p.x + p.ax * len, y0 + p.ay * len);   // trajectory ahead
        tg.fillStyle(col, 0.5).fillCircle(p.x + p.ax * len, y0 + p.ay * len, 5);
        p.trail.push([p.x, y0]); if (p.trail.length > 9) p.trail.shift();
        for (let i = 1; i < p.trail.length; i++) tg.lineStyle(2 + i * 0.7, 0xffffff, i / p.trail.length * 0.7).lineBetween(p.trail[i - 1][0], p.trail[i - 1][1], p.trail[i][0], p.trail[i][1]);
      }
      if (p.spin) p.s.rotation += dt * (p.spinSpeed ?? 12) * (p.ax >= 0 ? 1 : -1);
      let dead = p.left <= 0 || p.x < 0 || p.x > WORLD_W || p.y < 0 || p.y > WORLD_H;
      if (!dead) {
        const wall = this.obstacles.find(o => o.team !== p.team && segDist(p.px, p.py, p.x, p.y, o.x, o.y) < o.r + (p.r || 14) * 0.5);
        if (wall) { this.vfx('block', wall.x, wall.y - 40, { scale: 3 }); if (wall.f && !p.noDamage) this.damage(p.owner, wall.f, p.dmg * 0.7, p.type, true); else if (wall.hp != null && !p.noDamage) { wall.hp -= p.dmg * 0.7; if (wall.hp <= 0) { wall.left = 0; this.vfx('spark', wall.x, wall.y - 20, { scale: 3, tint: 0x555555 }); this.vfx('run_dust', wall.x, wall.y - 6, { scale: 2.6, alpha: 0.9 }); } } dead = true; }
      }
      if (!dead) {
        const t = this.enemiesOf(p.owner).find(t => !(p.pierce && p.hits?.has(t)) && !p.skip?.has(t) && this.projHits(p, t));
        if (t) {
          if (!p.noDamage) { const pb = this.basicDmg; this.basicDmg = p.basic; this.damage(p.owner, t, p.dmg, p.type); this.basicDmg = pb; }
          this.castCtx = p.ctx || null;
          p.onImpact?.(p.x, p.y);
          this.vfx('spark', p.x, p.y - p.lift, { scale: p.big ? 4 : 2.5 });
          p.onHit?.(t); this.castCtx = null;
          if (p.pierce) (p.hits ||= new Set()).add(t); else dead = true;   // piercing waves (Leandro's comb) cross every enemy once
        }
      }
      if (dead) p.s.destroy();
      return !dead;
    });
    this.projs = kept.concat(this.projs);
  }

  /* ---------- bars above heads: HP + mana (champions), HP only (bots) ---------- */
  drawBars() {
    if (!this.gfx) this.gfx = Object.assign(this.add.graphics().setDepth(99999));
    const g = this.gfx; g.clear();
    const me = this.player;
    for (const f of this.fighters) {
      const champ = f.isChamp;
      if (f.hiddenFor(me) || this.blindVis(f) <= 0) { f.bt && Object.values(f.bt).forEach(t => t.setVisible(false)); f.invIc?.setVisible(false); f.poisIc?.setVisible(false); f.burnIc?.setVisible(false); f.slowIc?.setVisible(false); f.woundIc?.setVisible(false); f.lureIc?.setVisible(false); f.blindIc?.setVisible(false); f.blindEye?.setVisible(false); continue; }
      if (champ && !f.bt) {
        const mk = () => { const t = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3, resolution: 3 }).setOrigin(0.5).setDepth(100000); t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR); return t; };
        f.bt = { hp: mk(), mp: mk(), name: mk(), lvl: mk() };
      }
      if (!f.alive) { f.bt && Object.values(f.bt).forEach(t => t.setVisible(false)); f.invIc?.setVisible(false); f.poisIc?.setVisible(false); f.burnIc?.setVisible(false); f.lureIc?.setVisible(false); f.blindIc?.setVisible(false); f.blindEye?.setVisible(false); continue; }
      const hx = f.x, hy = f.y - f.def.height;
      const w = champ ? 96 : f.isNexus ? 160 : f.isTower ? 90 : 36, h = champ ? 12 : f.isNexus ? 14 : f.isTower ? 9 : 6, x = hx - w / 2, mh = 8, xh = 4;
      const y = hy - (champ ? 38 : 14);
      g.fillStyle(0x000000, 0.75).fillRect(x - 2, y - 2, w + 4, h + 4 + (champ ? mh + 2 : 0));
      const sh = f.shieldHp > 0 ? f.shieldHp : 0, tot = Math.max(f.maxHp, f.hp + sh);
      const hs = Math.min(f._hs ?? f.hp, tot), gh = Math.min(f._gh ?? hs, tot);
      g.fillStyle(0x3a1414).fillRect(x, y, w, h).fillStyle(f.team === me.baseTeam ? 0x3ddc84 : 0xff5252).fillRect(x, y, w * hs / tot, h);
      if (gh > hs + 0.5) g.fillStyle(0xff3b3b, 0.5).fillRect(x + w * hs / tot, y, w * (gh - hs) / tot, h);   // damage taken: reddish, almost transparent strip that fades away
      if (f.hp > hs + 0.5) g.fillStyle(0x0b6b2e, 0.7).fillRect(x + w * hs / tot, y, w * (f.hp - hs) / tot, h);   // healing: translucent dark green up to where the health will reach
      if (f.isMinion && f.baseTeam !== me.baseTeam && me.alive && me.isChamp && f.hp + sh <= me.nextBasicDmg(f)) {   // Wild Rift style: one basic attack kills it -> the bar flashes bright
        const pz = 0.6 + 0.4 * Math.sin(this.time.now / 110);
        g.fillStyle(0xffe14d, 1).fillRect(x, y, w * f.hp / tot, h).lineStyle(2, 0xffffff, pz).strokeRect(x - 2, y - 2, w + 4, h + 4).lineStyle(4, 0xffd23f, 0.35 * pz).strokeRect(x - 4, y - 4, w + 8, h + 8);
      }
      if (f.def.bot === 'crate') { const bar = (o, c, v) => g.fillStyle(0x000000, 0.75).fillRect(x - 2, y + h + o, w + 4, 5).fillStyle(c, 1).fillRect(x, y + h + o + 1, w * Math.max(0, Math.min(1, v)), 3); bar(2, 0xffffff, f.life / f.life0); bar(8, 0xffd23f, f.bugFull || f.bugs?.length >= (f.bugCap || 99) ? 1 : 1 - (f.spawnT ?? 0) / (f.spawnMax || 1)); }   // crate: white = time left, yellow = time until the next bug
      else if (f.isBot && f.key.startsWith('bot_')) { const lf = f.lfShow || [f.life, f.life0]; if (lf[1] > 0 && lf[1] < 1e8) g.fillStyle(0x000000, 0.75).fillRect(x - 2, y + h + 2, w + 4, 5).fillStyle(0xffffff, 1).fillRect(x, y + h + 3, w * Math.max(0, Math.min(1, lf[0] / lf[1])), 3); }   // white bar under the health: time left before the bot disappears
      if (sh > 0) g.fillStyle(0xffffff).fillRect(x + w * f.hp / tot, y, w * sh / tot, h).fillStyle(0xbfc8d8).fillRect(x + w * f.hp / tot, y + h * 0.65, w * sh / tot, h * 0.35);
      if (champ) {   // health ticks: a thin line every 100 HP and a thick one every 1000 HP; when the thin ones would be too close together only the thick ones are drawn
        const gap = w * 100 / tot, thin = gap >= 4.5;
        for (let hp = 100; hp < tot - 1; hp += 100) {
          const big = hp % 1000 === 0; if (!big && !thin) continue;
          const tx = x + w * hp / tot;
          if (big) g.fillStyle(0x000000, 1).fillRect(tx - 1.5, y - 1, 3, h + 2);   // thick black line every 1000: it covers the thin 100-HP line of that spot
          else g.fillStyle(0x000000, 0.75).fillRect(tx - 0.5, y, 1, h);   // thin line every 100: full height, from the top edge to the bottom edge of the bar
        }
      }
      if (champ) {
        // second bar: mana (blue) or, for champions without mana, their own resource (Eliud: rage in orange, hen durability in gold)
        const cb = !!f.def.charge, rb = f.isRage, fr = cb ? f.charge / 100 : rb ? (f.hen ? f.henHp / f.henMax : f.rage / 100) : f.maxMana ? f.mana / f.maxMana : 0;
        g.fillStyle(cb ? 0x0a2a24 : rb ? 0x3a1a0a : f.def.farandula ? 0x3a0f26 : 0x12264a).fillRect(x, y + h + 2, w, mh).fillStyle(cb ? 0x4fe0c0 : rb ? (f.hen ? 0xffd23f : 0xff7a2a) : f.def.farandula ? 0xff4fa3 : 0x3b8cff).fillRect(x, y + h + 2, w * Phaser.Math.Clamp(fr, 0, 1), mh);
        if (f.ride) g.fillStyle(0x000000, 0.75).fillRect(x - 2, y + h + mh + 3, w + 4, 6).fillStyle(0xffffff).fillRect(x, y + h + mh + 4, w * Phaser.Math.Clamp(f.ride.t / f.ride.T, 0, 1), 3);   // bike lifetime
        if (f.flame) g.fillStyle(0x000000, 0.75).fillRect(x - 2, y + h + mh + 3, w + 4, 6).fillStyle(0xffffff).fillRect(x, y + h + mh + 4, w * Phaser.Math.Clamp(f.flame.t / f.flame.T, 0, 1), 3);   // flamethrower time left
        if (f.recall) g.fillStyle(0x000000, 0.75).fillRect(x - 2, y + h + mh + 3, w + 4, 6).fillStyle(0x7ee0ff).fillRect(x, y + h + mh + 4, w * Phaser.Math.Clamp(1 - f.recall.t / (f.recall.T || 10), 0, 1), 3);   // recall progress
        if (f.burst) g.fillStyle(0x000000, 0.75).fillRect(x - 2, y + h + mh + 3, w + 4, 6).fillStyle(0xffffff).fillRect(x, y + h + mh + 4, w * Phaser.Math.Clamp(f.burst.t / f.burst.T, 0, 1), 3);   // Julio's golden burst: time left
        { // basic attack combo: a framed counter box next to the bars (hit 1 / 2 / 3); it disappears when the click window runs out
          const live = f === me && f.cstepN > 0 && this.gameT - (f.comboEnd || 0) <= (f.comboStep > 0 ? COMBO_WINDOW : 0.25), ct = (f.bt.cmb ||= this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3, resolution: 3 }).setOrigin(0.5).setDepth(100001));
          if (live) {
            const n = f.cstepN, bx = x + w + 5 + (f.arepaUp ? 26 : 0), by = y + h / 2 - 7, col = n === 3 ? 0xff9a2e : n === 2 ? 0xffb02e : 0xffd23f;
            g.fillStyle(0x000000, 0.85).fillRect(bx - 1, by - 1, 26, 26).fillStyle(0x1b1408, 1).fillRect(bx, by, 24, 24).lineStyle(2, col, 1).strokeRect(bx, by, 24, 24);
            for (let i = 0; i < 3; i++) g.fillStyle(i < n ? col : 0x3a3a46, 1).fillRect(bx + 3 + i * 7, by + 19, 5, 3);
            ct.setVisible(true).setText(`${n}`).setColor(n === 3 ? '#ffb85a' : '#ffe27a').setPosition(bx + 12, by + 9);
          } else ct.setVisible(false);
        }
        const gx = x - 17, gy = y + (h + mh + 2) / 2;
        levelGauge(g, gx, gy, 12, f.level >= 12 ? 1 : f.xp / f.xpNeed, 4);
        f.bt.lvl.setVisible(true).setText(`${f.level}`).setPosition(gx, gy).setFontSize(11);
        f.bt.hp.setVisible(false); f.bt.mp.setVisible(false);   // no numbers on the bars above the champions (your HUD panel still shows them)
        f.bt.name.setVisible(true).setText(`${f.def.name}`).setPosition(hx, y - 11).setColor(f === me ? '#7dff9a' : f.team === me.baseTeam ? '#8ab4ff' : '#ff8a8a');
      }
      if (f.pkBuffs) { let n = 0; const C = { hp: 0x5dff8a, atk: 0xff7a5a, aspd: 0xffd23f, def: 0x7ee0ff }; for (const k in f.pkBuffs) { g.fillStyle(0x000000, 0.8).fillRect(x + n * 14 - 1, y + h + (champ ? 20 : 4) , 12, 6).fillStyle(C[k]).fillRect(x + n * 14, y + h + (champ ? 21 : 5), 10 * Math.max(0, f.pkBuffs[k].t / f.pkBuffs[k].T), 4); n++; } }
      const nb = (f.ride ? 1 : 0) + (f.flame ? 1 : 0), sb = champ && f.shieldHp > 0 && f.shieldMaxT > 0;   // white duration bars stack under the mana bar
      if (sb) { const by = y + h + mh + 3 + nb * 7; g.fillStyle(0x000000, 0.75).fillRect(x - 2, by, w + 4, 6).fillStyle(0xffffff).fillRect(x, by + 1, w * Phaser.Math.Clamp(f.shieldT / f.shieldMaxT, 0, 1), 3); }
      const sy = y + h + mh + 9 + (nb + (sb ? 1 : 0)) * 7;   // status icons under the mana bar: poison (green drop) and burn (red flame), side by side when both apply
      let sx = 8 + (f.poisoned ? 17 : 0);
      if (champ && f.burning) { const bi = (f.burnIc ||= this.add.image(0, 0, 'icon_burn').setDepth(100001).setDisplaySize(14, 14)); bi.setVisible(true).setPosition(x + sx, sy); sx += 17; } else f.burnIc?.setVisible(false);
      if (champ && f.slowed) { const si = (f.slowIc ||= this.add.image(0, 0, 'icon_slow').setDepth(100001).setDisplaySize(14, 14)); si.setVisible(true).setPosition(x + sx, sy); sx += 17; } else f.slowIc?.setVisible(false);
      if (champ && f.woundT > 0) { const wi = (f.woundIc ||= this.add.image(0, 0, 'icon_wound').setDepth(100001).setDisplaySize(14, 14)); wi.setVisible(true).setPosition(x + sx, sy); sx += 17; } else f.woundIc?.setVisible(false);
      if (champ && f.blindT > 0) { const bl = (f.blindIc ||= this.add.image(0, 0, 'icon_blind').setDepth(100001).setDisplaySize(14, 14)); bl.setVisible(true).setPosition(x + sx, sy); sx += 17; } else f.blindIc?.setVisible(false);
      if (champ && f.lure) { const li = (f.lureIc ||= this.add.image(0, 0, 'icon_charm').setDepth(100001).setDisplaySize(14, 14)); li.setVisible(true).setPosition(x + sx, sy); } else f.lureIc?.setVisible(false);   // hechizado (Xeviche's heart)
      if (champ && f.poisoned) { const pi = (f.poisIc ||= this.add.image(0, 0, 'icon_poison').setDepth(100001).setDisplaySize(14, 14)); pi.setVisible(true).setPosition(x + 8, sy); } else f.poisIc?.setVisible(false);   // poisoned: icon under the mana bar
      if (champ && f.arepaUp) { const ic = (f.invIc ||= this.add.image(0, 0, 'icon_invul').setDepth(100001).setDisplaySize(22, 22)); ic.setVisible(true).setPosition(x + w + 16, y + h / 2 + 4); } else f.invIc?.setVisible(false);   // invulnerable: yellow aura icon by the bars
      if (f.stunT > 0) g.fillStyle(0xffd23f).fillRect(x, y - 6, w * Math.min(1, f.stunT / 2), 3);
      if (f.ink) { g.fillStyle(0x1d0f4a).fillCircle(hx, y - 14, 7).fillStyle(0x8a5cff).fillCircle(hx - 2, y - 16, 2.5); }
      const ly = y + h + (champ ? mh + 4 : 2);
      if (f.slows.length) g.fillStyle(0x6ec6ff).fillRect(x, ly, w * 0.3, 2);
      if (f.poisons.length) g.fillStyle(0x9be37a).fillRect(x + w * 0.35, ly, w * 0.3, 2);
    }
  }
}

Object.assign(Arena.prototype, SurvivalMixin, BossMixin);
