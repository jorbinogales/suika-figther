import Phaser from 'phaser';
import { ABILITY_KEYS, MAX_RANK, aimSpec, rk } from './data.js';
import { Fighter, UNIT_DEFS, BODY_R, WORLD_W, WORLD_H, LANE_Y0, LANE_Y1, WALK_Y0, WALK_Y1, dist } from './fighter.js';
import { walk, GW, GH, CELL, cellWalk, walkField, MID, CAMP_SITES, LANE_NORTH, LANE_SOUTH } from './mapdata.js';
import { Audio } from './audio.js';
import { runChampAi } from './ai.js';
import { bootScreen } from './bootscreen.js';
import { NetGame } from './netgame.js';
import { isWalk } from './mapdata.js';

const VIEW_H = 640;   // world units visible vertically at zoom 1 (zoom scales this to the window height)
const LANE_MID = (LANE_Y0 + LANE_Y1) / 2;

// vfx sheets in public/assets/vfx (32px frames)
const VFX = ['energy_bolt', 'magic_missile', 'rock_throw', 'poison_dart', 'poison_cloud', 'heal', 'summon', 'shield', 'buff',
  'shockwave', 'punch', 'spark', 'block', 'poison_hit', 'levelup', 'run_dust', 'bullet_tracer', 'cannonball', 'plasma_shot', 'burning_ground', 'fire_trail'];
const ANIM_FPS = { idle: 6, walk: 10, run: 14, attack: 12, power1: 12, power2: 12, power3: 12, ult: 12, death: 8, destroy: 7, transform: 12, attack3: 12, dash: 14 };
const LOOPS = new Set(['idle', 'walk', 'run']);

// Top-down tileset crops (x, y, w, h) inside the 384px-wide sheets of resources/map/Nature v1.5
const CROPS = {
  trees:   { tree1: [0, 0, 100, 125], tree2: [100, 0, 100, 125], tree3: [205, 20, 65, 100], treeS1: [288, 0, 34, 64], treeS2: [322, 0, 34, 64] },
  bushes:  { bushA: [0, 4, 64, 48], bushB: [66, 4, 62, 48], bushC: [256, 4, 32, 28], bushD: [290, 4, 32, 28], bushE: [324, 4, 28, 24] },
  rocks:   { rockA: [0, 4, 62, 36], rockB: [64, 4, 62, 36], rockC: [128, 4, 62, 28], rockD: [258, 2, 32, 38], rockE: [292, 2, 30, 38], rockF: [324, 8, 26, 24] },
};
const TREES_BIG = ['tree1', 'tree2', 'tree3'], BUSHES = ['bushA', 'bushB', 'bushC', 'bushD', 'bushE'];
const ROCKS = ['rockA', 'rockB', 'rockC', 'rockD', 'rockE', 'rockF'];
const MAP_SCALE = 2;
const YR = 0.75;   // the map is seen at an angle: ground areas are ellipses squashed to this ratio, not perfect circles
const eDist = (ax, ay, bx, by) => Math.hypot(ax - bx, (ay - by) / YR);   // distance measured in that ellipse metric
const FOREST = ['wall1', 'wall2', 'wall3', 'tree1', 'tree2', 'tree3', 'tree4', 'bush1', 'bush2', 'trunk1', 'stone1', 'stone2', 'stone3', 'stone4', 'flower1', 'flower2', 'flower3', 'mush1', 'mush2', 'mush3', 'mush4', 'mush5', 'mush6'];
const CHAMP_ORDER = ['leandro', 'xeviche', 'jorbi', 'axel', 'julio', 'luis', 'eliud', 'hector'];   // TAB cycles through these

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

  preload() {
    bootScreen.show(); this.load.on('progress', v => bootScreen.progress(v * 25, 'CARGANDO INTERFAZ...'));
    this.load.json('manifest', 'assets/sprites/manifest.json?' + Date.now());
    this.load.image('ref_leandro', 'assets/ref_leandro.png');
    this.load.image('ref_xeviche', 'assets/ref_xeviche.png');
    this.load.image('ref_jorbi', 'assets/ref_jorbi.png');
    this.load.image('ref_axel', 'assets/ref_axel.png');
    this.load.image('ref_julio', 'assets/ref_julio.png');
    this.load.image('ref_luis', 'assets/ref_luis.png');
    this.load.image('ref_eliud', 'assets/ref_eliud.png');
    this.load.image('ref_hector', 'assets/ref_hector.png');
    this.load.image('shadow', 'assets/map/shadow.png');
    ['blue', 'red', 'gold', 'blue_l', 'red_l', 'gold_l', 'gold_plain'].forEach(c => this.load.image('ui_hud_banner_' + c, `assets/ui/hud_banner_${c}.png?${Date.now()}`));
    this.load.json('uilayout', 'assets/ui/layout.json?' + Date.now());
    this.load.json('sfx', 'assets/sfx/sfx.json?' + Date.now());
    ['hud_hero', 'hud_center', 'hud_minimap', 'hud_items', 'hud_stats', 'hud_enemy', 'hud_target', 'hud_kda', 'hud_score'].forEach(n => this.load.image('ui_' + n, `assets/ui/${n}.png?${Date.now()}`));
    this.load.spritesheet('ground', 'assets/map/ground.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('details', 'assets/map/details.png', { frameWidth: 32, frameHeight: 32 });
    ['trees', 'bushes', 'rocks'].forEach(n => this.load.image(n, `assets/map/${n}.png`));
    this.load.image('f_trail', 'assets/map/forest/trail.png'); this.load.image('f_gt', 'assets/map/forest/gtrans.png');   // path + grass transition tiles (Brendon Bancer)
    FOREST.forEach(n => this.load.image('f_' + n, `assets/map/forest/${n}.png`));   // forest props by Brendon Bancer (itch.io/brendon-bancer)
    VFX.forEach(n => this.load.spritesheet('vfx_' + n, `assets/vfx/${n}.png`, { frameWidth: 32, frameHeight: 32 }));
    this.load.on('loaderror', f => { if (!/^(manifest|uilayout)/.test(f.key)) console.warn('missing', f.src); });
  }

  create() {
    // second pass: sprites/icons/objects listed in the manifest (produced by tools/process_sprites.py)
    const m = this.cache.json.get('manifest') || {}, sprites = m.sprites || {};
    const t = Date.now();
    for (const ch in sprites) for (const a in sprites[ch])
      this.load.spritesheet(`${ch}_${a}`, `assets/sprites/${ch}/${a}.png?${t}`, { frameWidth: 256, frameHeight: 256 });
    (m.icons || []).forEach(n => this.load.image('icon_' + n, `assets/icons/${n}.png?${t}`));
    const sfx = this.cache.json.get('sfx') || {};
    Object.values(sfx).flat().forEach(f => this.load.audio('sfx_' + f, 'assets/sfx/' + f));
    (m.classes || []).forEach(n => this.load.image('class_' + n, `assets/classes/${n}.png?${t}`));
    (m.flags || []).forEach(n => this.load.spritesheet('flag_' + n, `assets/flags/${n}.png?${t}`, { frameWidth: 128, frameHeight: 128 }));
    (m.stats || []).forEach(n => this.load.image('stat_' + n, `assets/stats/${n}.png?${t}`));
    (m.items || []).forEach(n => this.load.image('item_' + n, `assets/items/${n}.png?${t}`));
    (m.aim || []).forEach(n => this.load.image(n, `assets/aim/${n}.png?${t}`));
    (m.objects || []).forEach(n => this.load.image(n, `assets/objects/${n}.png?${t}`));
    const LAB = k => (k.startsWith('sfx_') ? 'CARGANDO SONIDOS...' : /^(item_|icon_|class_)/.test(k) ? 'CARGANDO OBJETOS E ICONOS...' : 'CARGANDO CAMPEONES Y UNIDADES...');
    let pct = 25; this.load.off('progress'); this.load.on('progress', v => { pct = 25 + v * 75; bootScreen.progress(pct); });
    this.load.on('filecomplete', k => bootScreen.progress(pct, LAB(k)));
    this.load.once('complete', () => this.finish(sprites));
    this.load.start();
  }

  finish(sprites) {
    VFX.forEach(n => this.anims.create({ key: 'vfx_' + n, frames: this.anims.generateFrameNumbers('vfx_' + n), frameRate: 18, repeat: -1 }));
    for (const ch in sprites) for (const a in sprites[ch])
      this.anims.create({ key: `${ch}_${a}`, frames: this.anims.generateFrameNumbers(`${ch}_${a}`), frameRate: ANIM_FPS[a] || 10, repeat: LOOPS.has(a) ? -1 : 0 });
    // units that only ship walk/attack get a 1-frame idle (first walk frame)
    for (const ch in sprites) if (sprites[ch].walk && !sprites[ch].idle)
      this.anims.create({ key: `${ch}_idle`, frames: [{ key: `${ch}_walk`, frame: 0 }], frameRate: 1, repeat: -1 });
    for (const fl of (this.cache.json.get('manifest')?.flags || [])) this.anims.create({ key: 'flag_' + fl, frames: this.anims.generateFrameNumbers('flag_' + fl), frameRate: 8, repeat: -1 });
    for (const sheet in CROPS) for (const n in CROPS[sheet]) this.textures.get(sheet).add(n, 0, ...CROPS[sheet][n]);
    this.registry.set('sprites', sprites);
    const h = new URLSearchParams(location.hash.slice(1));
    bootScreen.progress(100, 'LISTO');
    if (location.hash) setTimeout(() => bootScreen.hide(), 300);   // test links go straight into the arena
    if (!location.hash) this.scene.start('launcher');   // no test hash: launcher
    else this.scene.start('arena', { allies: h.get('allies') ? h.get('allies').split(',') : (+h.get('mode') > 1 ? ['luis', 'xeviche', 'julio', 'axel'].slice(0, +h.get('mode') - 1) : []), enemies: h.get('enemies') ? h.get('enemies').split(',') : (+h.get('mode') > 1 ? ['hector', 'jorbi', 'eliud', 'leandro', 'luis'].slice(0, +h.get('mode')) : null), player: h.get('char') || 'leandro', enemy: h.get('enemy'), team: +(h.get('team') || 0), training: !!h.get('train'), haveSprites: sprites });
  }
}

/* =========================== Arena (world) =========================== */
export class Arena extends Phaser.Scene {
  constructor() { super('arena'); }

  init(data) {
    this.playerKey = data.player || 'leandro';
    this.allyKeys = data.allies || []; this.enemyKeys = data.enemies || (data.enemy ? [data.enemy] : null);
    this.enemyKey = data.enemy || null; this.myTeam = data.team || 0; this.training = !!data.training;
    this.sprites = data.haveSprites || this.registry.get('sprites') || {};
    this.paused = false; this.over = null; this.feed = []; this.cfg = data; this.nidNext = 1000; this.byNid = new Map(); this.net = null;
    this.debugFree = false;
  }

  get pc() { return this.ctrl && this.ctrl.alive ? this.ctrl : this.player; }

  hasAnims(key) { const a = this.sprites[key]; return !!a && !!(a.idle || a.walk); }

  create() {
    this.time.paused = false; this.tweens.resumeAll(); this.anims.resumeAll(); this.floatN = 0;
    this.fighters = []; this.projs = []; this.obstacles = []; this.audio = new Audio(this); this.audio.music('music_game'); this.events.once('shutdown', () => { this.audio.stopMusic(); this.audio.clearVoice(); }); this.timers = []; this.zones = []; this.castCtx = null; this.mortars = []; this.chains = []; this.eggs = []; this.spears = []; this.packages = []; this.grenades = []; this.towerRings = new Map(); this.control = null; this.ctrl = null; this.aimObjs = {}; this.rangeObjs = {}; this.gfx = null;
    this.rangeG = this.add.graphics();
    this.buildPlaceholderTextures();
    this.buildMap();

    const my = this.myTeam, dflt = CHAMP_ORDER[(CHAMP_ORDER.indexOf(this.playerKey) + 1) % CHAMP_ORDER.length];
    const enemyKeys = this.enemyKeys && this.enemyKeys.length ? this.enemyKeys : [this.enemyKey || dflt], allyKeys = this.training ? [] : this.allyKeys;
    this.laneY = LANE_MID;
    // spawn slots: staggered across the lane at each base (training zone: both at the map center)
    const pos = (team, i, n) => {
      if (this.training) return { x: WORLD_W / 2 + (team === 0 ? -140 : 140), y: LANE_MID };
      const dirx = team === 0 ? 1 : -1, bx = team === 0 ? 420 : WORLD_W - 420;
      return { x: bx + (i % 2) * 70 * dirx, y: Phaser.Math.Clamp(LANE_MID + (i - (n - 1) / 2) * 52, LANE_Y0 + 30, LANE_Y1 - 10) };
    };
    const myN = allyKeys.length + 1, enN = enemyKeys.length, pm = pos(my, 0, myN);
    if (this.cfg.roster) this.buildRoster(pos);
    else {
    this.player = new Fighter(this, this.playerKey, my, pm.x, pm.y);
    this.allies = allyKeys.map((k, i) => { const q = pos(my, i + 1, myN); const f = new Fighter(this, k, my, q.x, q.y, { ai: true }); f.aiLane = (i % 3) - 1; return f; });
    this.enemies = enemyKeys.map((k, i) => { const q = pos(1 - my, i, enN); const f = new Fighter(this, k, 1 - my, q.x, q.y, { ai: true }); f.aiLane = (i % 3) - 1; return f; });
    this.enemy = this.enemies[0];
    this.champs = [this.player, ...this.allies, ...this.enemies];
    }
    this.fighters.push(...this.champs);
    if (!this.training) {
    // nexus of each side + towers (middle lane: 2 each; top and bottom lanes: 1 each)
      this.fighters.push(new Fighter(this, 'nexus_blue', 0, 190, LANE_MID), new Fighter(this, 'nexus_red', 1, WORLD_W - 190, LANE_MID));
      this.fountains = [0, 1].map(t => ({ x: t === 0 ? 190 : WORLD_W - 190, y: LANE_MID, team: t })); this.fountG = this.add.graphics().setDepth(-996);
      [['tower_blue', 0, 560, LANE_MID - 40], ['tower_blue', 0, 1000, LANE_MID - 40], ['tower_red', 1, WORLD_W - 560, LANE_MID - 40], ['tower_red', 1, WORLD_W - 1000, LANE_MID - 40]]
        .forEach(([k, t, x, y]) => this.fighters.push(new Fighter(this, k, t, x, y, { ai: true })));
      this.fighters.filter(f => f.isTower).forEach((t, i) => this.setNid(t, 200 + i));   // structures: same id on every client
    }
    this.waveT = 4; this.waveN = 0; this.gameT = 0; this.firstBlood = false; this.streaks = new Map();
    if (!this.training) this.after(1.2, () => this.audio.voice('v_welcome', 1, 'ann_goodluck', { title: '¡QUE COMIENCE EL COMBATE!', sub: 'Bienvenidos, campeones', team: 2 }));
    if (this.training) {   // training zone: level 12, 12 skill points to spend, free mana/cooldowns, a passive dummy, no waves
      this.waveT = 1e9; this.debugFree = true; this.player.gold = 99999;
      for (let i = 1; i < 12; i++) this.player.levelUp();
      this.player.hp = this.player.maxHp; this.player.xp = 0;
      this.enemy.ai = false; this.enemy.x = this.enemy.spawn.x = this.player.x + (my === 0 ? 420 : -420); this.enemy.setAim(-this.player.ax, 0);
    }
    this.aiOn = true; this.mouseSeen = false; this.aimKey = null; this.selected = null; this.prevLeft = this.prevRight = false;
    this.aimG = this.add.graphics().setDepth(99990);

    const cam = this.cameras.main;
    this.camTarget = { x: this.player.x, y: this.player.y };
    cam.setBounds(0, -340, WORLD_W, WORLD_H + 340 + 120);   // the view may go past the top (and a bit past the bottom) of the map, so units at the edges are not hidden behind the HUD
    cam.startFollow(this.camTarget, true, 0.12, 0.12);
    this.zoom = 0;

    this.input.setDefaultCursor('crosshair');
    this.input.on('pointermove', () => (this.mouseSeen = true));
    this.input.mouse?.disableContextMenu();
    this.buildKeys();
    this.setupFog();
    this.setupCamps();
    this.setupNet();
    this.debugScenario();
    if (!this.scene.isActive('hud')) this.scene.launch('hud');
    this.game.events.emit('arena-ready');   // the launcher's loading screen waits for this
  }

  /* ---------- fog of war ----------
     Enemy units are only shown while one of your units sees them (sight radius per unit type). The whole map is known (dimmed outside your sight).
     A 128x60 canvas (25 world units per texel, smoothly scaled) is the overlay; the same texture dims the minimap. Off in the training zone (and with #nofog). */
  setupFog() {
    this.fogOn = !this.training && !new URLSearchParams(location.hash.slice(1)).has('nofog'); this.fog = null;
    if (!this.fogOn) return;
    const FW = 256, FH = 120;   // 12.5 world units per texel
    if (this.textures.exists('fogmask')) this.textures.remove('fogmask');
    const tex = this.textures.createCanvas('fogmask', FW, FH); tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.fog = { FW, FH, cw: WORLD_W / FW, ch: WORLD_H / FH, explored: new Uint8Array(FW * FH).fill(1), tex, t: 0, img: this.add.image(0, 0, 'fogmask').setOrigin(0, 0).setDisplaySize(WORLD_W, WORLD_H).setDepth(90000) };
    this.updateFog(1, true);
  }
  sightOf(f) { return f.isNexus ? 900 : f.isTower ? 850 : f.isChamp ? 820 : f.isBot ? 520 : 560; }
  updateFog(dt, force) {
    const F = this.fog; if (!F) return;
    if ((F.t -= dt) > 0 && !force) return; F.t = 0.06;
    const team = this.pc.team, src = this.fighters.filter(f => f.alive && !f.away && f.team === team), { FW, FH, cw, ch, explored } = F;
    // explore the ground around every unit of ours
    for (const s of src) {
      const r = this.sightOf(s) * 0.92, i0 = Math.max(0, Math.floor((s.x - r) / cw)), i1 = Math.min(FW - 1, Math.floor((s.x + r) / cw)), j0 = Math.max(0, Math.floor((s.y - r) / ch)), j1 = Math.min(FH - 1, Math.floor((s.y + r) / ch));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot((i + 0.5) * cw - s.x, (j + 0.5) * ch - s.y) <= r) explored[j * FW + i] = 1;
    }
    // who do we see? enemy units inside any sight circle; enemy structures once their ground has been explored
    for (const f of this.fighters) {
      if (f.team === team) { f.fogHidden = false; continue; }
      if (f.isTower) { f.fogHidden = !explored[Math.min(FH - 1, Math.floor(f.y / ch)) * FW + Math.min(FW - 1, Math.floor(f.x / cw))]; continue; }
      f.fogHidden = !src.some(s => Math.hypot(s.x - f.x, s.y - f.y) <= this.sightOf(s));
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
    ABILITY_KEYS.forEach(a => { while (p.canSpend(a) && p.ranks[a] < (+h.get('rank') || 1)) p.spend(a); });
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
    const mk = (key, w, h, draw) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      draw(g); g.generateTexture(key, w, h); g.destroy();
    };
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
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) dm[j * cols + i] = walkField((i + 0.5) * T * K, (j + 0.5) * T * K) >= 0.5 ? 1 : 0;
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

  /* ---------- map: top-down, one horizontal lane ---------- */
  buildMap() {
    const S = MAP_SCALE, R = rng(12345), rnd = (a, b) => a + R() * (b - a);
    const img = (sheet, frame, x, y, depth = y, sc = S) => this.add.image(x, y, sheet, frame).setOrigin(0.5, 1).setScale(sc).setDepth(depth);
    const pick = a => a[R() * a.length | 0];
    const BIGT = ['f_tree1', 'f_tree2', 'f_tree1', 'f_tree2', 'f_tree3'], SMALLT = ['f_tree4', 'f_tree4', 'f_tree1'], BUSH = ['f_bush1', 'f_bush2'], STONE = ['f_stone1', 'f_stone2', 'f_stone3', 'f_stone4'], TUFT = ['f_flower1', 'f_flower2', 'f_flower3', 'f_mush1', 'f_mush2', 'f_mush3', 'f_mush4', 'f_mush5', 'f_mush6', 'f_stone1', 'f_stone3'];
    const W = (i, j) => cellWalk(i, j);
    this.bakeGround();
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
    const rt = this.bakedDecor = this.add.renderTexture(0, 0, WORLD_W, WORLD_H).setOrigin(0, 0).setDepth(-5);
    baked.forEach(([sheet, frame, x, y, oy = 1, sc = S]) => rt.stamp(sheet, frame, x, y, { originX: 0.5, originY: oy, scale: sc }));
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
      i1: 'ONE', i2: 'TWO', i3: 'THREE', i4: 'FOUR', i5: 'FIVE', i6: 'SIX', shop: 'B', lvl: 'L', ai: 'F1', free: 'F2', respawn: 'ENTER', full: 'G', esc: 'ESC',
    });
    K.addCapture('TAB,SPACE,F1,F2,Q,F,E,R,CTRL,ESC');
  }

  handleInput() {
    const k = this.k, p = this.pc, J = Phaser.Input.Keyboard.JustDown, d = (a, b) => (a.isDown || b.isDown ? 1 : 0);
    p.in = { mx: d(k.right, k.right2) - d(k.left, k.left2), my: d(k.down, k.down2) - d(k.up, k.up2), run: k.run.isDown };
    if (this.mouseSeen) {
      const m = this.input.activePointer.positionToCamera(this.cameras.main);
      const ptr0 = this.input.activePointer, onUi = (this.uiRects || []).some(r => ptr0.x >= r.x && ptr0.x <= r.x + r.w && ptr0.y >= r.y && ptr0.y <= r.y + r.h);
      if (p.state !== 'cast' && !onUi) p.setAim(m.x - p.x, m.y - p.cy);   // keep the last aim while the cursor is over the HUD
    } else if ((p.in.mx || p.in.my) && p.state !== 'cast') p.setAim(p.in.mx, p.in.my);
    const ptr = this.input.activePointer, overUi = (this.uiRects || []).some(r => ptr.x >= r.x && ptr.x <= r.x + r.w && ptr.y >= r.y && ptr.y <= r.y + r.h);
    const left = ptr.leftButtonDown(), leftClick = left && !this.prevLeft, right = ptr.rightButtonDown(), rightClick = right && !this.prevRight;
    this.prevLeft = left; this.prevRight = right;
    if (leftClick && !overUi && !this.aimKey) {   // click on a champion selects it (info panel, top-right)
      const m = ptr.positionToCamera(this.cameras.main);
      const hit = this.fighters.find(f => f.isChamp && !f.hiddenFor(this.player) && Math.abs(m.x - f.x) < 48 && m.y > f.y - f.def.height - 10 && m.y < f.y + 15);
      this.selected = hit || null;
    }
    // powers: 1st press/click shows the preview, 2nd click (or same key) casts, right click / ESC cancels
    ABILITY_KEYS.forEach(a => J(k[a]) && (k.ctrl.isDown ? this.player.spend(a) : this.aimKey === a ? this.confirmAim() : this.beginAim(a)));
    if (J(k.esc) || rightClick) this.cancelAim();
    if (this.aimKey) { if (leftClick && !overUi) this.confirmAim(); }
    else if ((left && !overUi) || k.basic.isDown || k.basic2.isDown) p.tryBasic();
    ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'].forEach((n, i) => J(k[n]) && p.useItem(i));
    if (J(k.shop)) this.scene.get('hud')?.toggleShop?.();
    if (J(k.lvl)) this.player.levelUp();
    if (J(k.ai)) this.aiOn = !this.aiOn;
    if (J(k.free)) this.debugFree = !this.debugFree;
    if (J(k.full)) { this.scale.toggleFullscreen(); navigator.keyboard?.lock?.(['KeyQ', 'KeyF', 'KeyE', 'KeyR']).catch(() => {}); }
    if (J(k.respawn) && this.training && !this.net) this.champs.forEach(f => { f.x = f.spawn.x; f.y = f.spawn.y; f.reset(); f.playAnim('idle'); });
  }

  /* ---------- aiming (preview before casting) ---------- */
  mouseGround() {   // cursor is read at chest height, so the ground point sits below it
    const m = this.input.activePointer.positionToCamera(this.cameras.main), p = this.pc;
    return { x: m.x, y: m.y + p.def.height * 0.6 };
  }
  beginAim(a) {
    const p = this.pc, rank = p.ranks[a], d = p.def.abilities[a];
    if (d.passive) { this.float(p.x, p.y - p.def.height - 30, 'Habilidad pasiva', '#ffe066'); return; }
    if (p.silenceT > 0) { this.float(p.x, p.y - p.def.height - 30, 'SILENCIADO', '#c77dff'); this.audio.play('glitch', { gap: 250 }); return; }
    if ((p.key === 'luis' && a !== 'ult') || (p.key === 'xeviche' && a === 'p2') || (p.key === 'hector' && (a === 'p1' || a === 'p3'))) { p.tryCast(a); return; }   // instant casts: no aiming step
    if (p.key === 'jorbi' && a === 'p2') {   // instant dash toward the cursor (no aim step)
      const m = this.mouseGround(); if (!this.hoverKey) p.setAim(m.x - p.x, m.y - p.y);
      p.tryCast('p2'); return;
    }
    if (!rank || !p.free || p.cds[a] > 0 || (p.mana < rk(d.mana, rank) && !this.debugFree)) { if (rank) this.audio.play('ui_error', { gap: 250, vol: 0.7 }); return; }
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
    p.castPoint = spec.type === 'wall' || spec.type === 'zone' ? this.wallCenter(spec) : spec.type === 'pick' ? this.mouseGround() : null;
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
      if (p.key === 'julio' && key === 'p1') {   // show the S-shaped stroke
        const pts = this.sPath(p, spec.range, p.def.abilities.p1.amp, 40), g = this.aimG;
        g.lineStyle(spec.width, spec.color, 0.25).beginPath().moveTo(pts[0].x, pts[0].y); pts.forEach(q => g.lineTo(q.x, q.y)); g.strokePath();
        g.lineStyle(3, 0xffffff, 0.7).beginPath().moveTo(pts[0].x, pts[0].y); pts.forEach(q => g.lineTo(q.x, q.y)); g.strokePath();
        this.aimObj('band', () => this.add.tileSprite(0, 0, 10, 10, 'aim_band').setOrigin(0, 0.5)).setVisible(false);
        cap('cap', pts[pts.length - 1].x, pts[pts.length - 1].y, spec.width * 1.2);
        return;
      }
      cap('cap', ex, ey, spec.width * 1.6);
    } else if (spec.type === 'trapezoid') {
      const px = -p.ay, py = p.ax, n = spec.nearW / 2, f = spec.farW / 2, L = spec.length;
      const g = this.aimG;
      g.fillStyle(c, 0.18).fillPoints([{ x: p.x + px * n, y: p.y + py * n }, { x: p.x + p.ax * L + px * f, y: p.y + p.ay * L + py * f },
        { x: p.x + p.ax * L - px * f, y: p.y + p.ay * L - py * f }, { x: p.x - px * n, y: p.y - py * n }], true);
      g.lineStyle(3, c, 0.9).lineBetween(p.x + px * n, p.y + py * n, p.x + p.ax * L + px * f, p.y + p.ay * L + py * f).lineBetween(p.x - px * n, p.y - py * n, p.x + p.ax * L - px * f, p.y + p.ay * L - py * f)
        .lineBetween(p.x + p.ax * L + px * f, p.y + p.ay * L + py * f, p.x + p.ax * L - px * f, p.y + p.ay * L - py * f);
      this.aimObj('band', () => this.add.tileSprite(0, 0, 10, 10, 'aim_band').setOrigin(0, 0.5).setDepth(99990)).setVisible(true)
        .setPosition(p.x, p.y).setSize(L, 50).setTileScale(50 / 128).setRotation(Math.atan2(p.ay, p.ax)).setTint(c).setAlpha(0.7);
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
  enemiesNear(team, x, y, r) { return this.fighters.filter(t => t.alive && t.team !== team && eDist(t.x, t.y, x, y) <= r); }

  // tires are solid: nobody walks through them, anyone caught under a new wall is pushed out
  resolveSolids(f) {
    for (const n of this.fighters) if (n.isNexus && n.alive) {
      const min = n.br * 0.8 + BODY_R * 0.6, dx = f.x - n.x, dy = f.y - n.y, d = Math.hypot(dx, dy) || 1;
      if (d < min) { f.x += dx / d * (min - d); f.y += dy / d * (min - d); }
    }
    for (let pass = 0; pass < 2; pass++) {
      for (const o of this.obstacles) {
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
  inBase(f) { const n = this.fountains?.[f.baseTeam]; return !!n && f.alive && ((f.x - n.x) / 320) ** 2 + ((f.y - n.y) / 230) ** 2 < 1; }
  canShop(f) { return f.alive && (this.training || this.inBase(f)); }
  drawFountain() {
    if (!this.fountG) return; const g = this.fountG, t = this.time.now / 1000; g.clear();
    this.fountains.forEach(n => {
      const c = n.team === 0 ? 0x4aa3ff : 0xff5a4a, pulse = 0.5 + 0.5 * Math.sin(t * 2);
      g.fillStyle(c, 0.06 + 0.03 * pulse).fillEllipse(n.x, n.y, 640, 460);
      g.lineStyle(3, c, 0.5).strokeEllipse(n.x, n.y, 640, 460);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + t * 0.4; g.fillStyle(c, 0.5).fillCircle(n.x + Math.cos(a) * 320, n.y + Math.sin(a) * 230, 4); }
    });
  }

  /* ---------- items: active effects ---------- */
  useActive(f, a, m) {
    const w = this;
    w.audio.play('ui_select', { at: f, vol: 0.5, gap: 100 });
    if (a.type === 'shield') { w.markSrc(f, 'shield'); f.shieldHp = Math.max(f.shieldHp, 150 * m); f.shieldT = a.time; w.float(f.x, f.y - f.def.height - 34, `Escudo ${Math.round(f.shieldHp)}`, '#7ee0ff'); }
    else if (a.type === 'sprint') { f.speedBoost = 0.35 + 0.05 * m; f.speedT = a.time; w.vfx('buff', f.x, f.cy, { scale: 3 }); w.float(f.x, f.y - f.def.height - 34, '¡Sprint!', '#ffd23f'); }
    else if (a.type === 'smoke') { w.enemiesWithin(f, 260).forEach(t => t.slow(Math.min(0.7, 0.3 + 0.07 * m), a.time + 0.5 * m)); for (let i = 0; i < 6; i++) w.vfx('run_dust', f.x + (Math.random() - 0.5) * 300, f.y + (Math.random() - 0.5) * 120, { scale: 3.5, alpha: 0.8 }); }
    else if (a.type === 'recall') { f.recall = { t: 4 }; w.float(f.x, f.y - f.def.height - 34, 'Teletransportando...', '#7ee0ff'); }
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
    if (f.antivirus) return this.runAntivirus(f);
    if (f.isNexus) return;
    if (f.isTower) return this.runTower(f);
    if (f.isMinion) return this.runMinion(f);
    const range = f.def.stats.range;
    const t = this.nearestEnemy(f, f.blindT > 0 ? 150 : f.isBot ? 600 : 900);
    if (!t) {
      if (!f.owner && f.isChamp) { f.in.mx = f.team === 0 ? 1 : -1; f.in.my = (LANE_MID - f.y) * 0.03; f.setAim(f.in.mx, 0); return; }   // AI champions push the middle lane
      if (f.owner) this.escort(f);
      return;
    }
    const dx = t.x - f.x, dy = t.y - f.y, ad = Math.hypot(dx, dy) - (t.br - BODY_R);
    f.setAim(dx, dy);
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
    if (!t) for (const e of this.enemiesOf(f)) { const d = dist(e, f); if (d <= f.def.stats.range && d - (e.isMinion ? 120 : 0) < best) { best = d - (e.isMinion ? 120 : 0); t = e; } }
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
      if (d > range * 0.9) { f.in.mx = dx; f.in.my = dy; }
      if (d <= range) f.tryBasic();
    } else {
      f.in.mx = f.team === 0 ? 1 : -1; f.in.my = (LANE_MID + (f.slot.y || 0) - f.y) * 0.03;
      f.setAim(f.in.mx, 0);
    }
  }

  // Leandro's contracts: green infected area
  infectZone(o, x, y, r, life, total, poisonTime) {
    this.zones.push({ kind: 'infect', owner: o, x, y, r, t: life, tick: 0.5, total, poisonTime, ctx: this.castCtx });
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
  setupCamps() {
    this.camps = this.training ? [] : CAMP_SITES.map((c, i) => ({ i, x: c.x, y: c.y, lane: c.y < 750 ? 'n' : 's', owner: null, prog: [0, 0], spawnT: 0, contested: false, flag: null, fx: 0 }));
    this.ships = []; this.campG = this.add.graphics().setDepth(-870); this.campR = 118;
  }
  campOwnerColor(o) { return o === 0 ? 0x4aa3ff : o === 1 ? 0xff4a3a : 0xc9d1dd; }
  updateCamps(dt) {
    if (!this.camps?.length || this.net?.role === 'client' || this.over) return;
    const R = this.campR;
    for (const c of this.camps) {
      const n = [0, 0]; for (const f of this.fighters) if (f.isChamp && f.alive && !f.away && !f.drop && eDist(f.x, f.y, c.x, c.y) <= R) n[f.team]++;
      c.contested = n[0] > 0 && n[1] > 0;
      if (!c.contested && (n[0] || n[1])) {
        const T = n[0] ? 0 : 1, O = 1 - T, rate = dt / 8 * (1 + 0.35 * (n[T] - 1));
        if (c.owner === O) { c.prog[O] = Math.max(0, c.prog[O] - rate); if (c.prog[O] <= 0) { c.prog[O] = 0; c.owner = null; } }
        else if (c.prog[O] > 0) c.prog[O] = Math.max(0, c.prog[O] - rate);
        else { c.prog[T] = Math.min(1, c.prog[T] + rate); if (c.prog[T] >= 1 && c.owner !== T) this.captureCamp(c, T); }
      } else if (!c.contested && c.owner != null) c.prog[c.owner] = Math.min(1, c.prog[c.owner] + dt / 20);   // nobody on it: the owner's pie slowly refills
      if (c.owner != null) { c.spawnT -= dt; if (c.spawnT <= 0) { c.spawnT = 30; this.dropShip(c, c.owner); } }
    }
  }
  captureCamp(c, T) {
    c.owner = T; c.prog[T] = 1; c.prog[1 - T] = 0; c.spawnT = 5;
    this.fighters.forEach(f => { if (f.isChamp && f.team === T && f.alive && eDist(f.x, f.y, c.x, c.y) <= this.campR) f.gold += 80; });
    this.showBanner({ title: '¡CAMPAMENTO RECLAMADO!', sub: `${T === 0 ? 'El equipo azul' : 'El equipo rojo'} controla ${c.lane === 'n' ? 'el camino norte' : 'el camino sur'}`, team: T }, 3000);
    this.audio.play('ui_announce', { vol: 0.7, gap: 0 }); this.vfx('levelup', c.x, c.y - 30, { scale: 6 }); this.zoneDecal(c.x, c.y, this.campR, this.campOwnerColor(T), 1.5);
    this.net?.onCamp?.();
  }
  lanePath(c, team) {
    const L = c.lane === 'n' ? LANE_NORTH : LANE_SOUTH, dir = team === 0 ? 1 : -1; let idx = 0, best = 1e9;
    L.forEach((p, i) => { const d = Math.hypot(p[0] - c.x, p[1] - c.y); if (d < best) { best = d; idx = i; } });
    const raw = []; for (let i = idx; i >= 0 && i < L.length; i += dir) raw.push({ x: L[i][0], y: L[i][1] });
    raw.push({ x: team === 0 ? WORLD_W - 330 : 330, y: LANE_MID });
    const pts = [raw[0]]; for (let i = 1; i < raw.length; i++) { const a = raw[i - 1], b = raw[i], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 70); for (let k = 1; k <= n; k++) pts.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n }); }   // dense waypoints along the route centre
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
      sh.g ||= this.add.graphics().setDepth(99949); const g = sh.g; g.clear();
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
      m.ax = team === 0 ? 1 : -1; m.path = this.lanePath(c, team);
      m.drop = c.lane === 'n' ? { t: -i * 0.18, dur: 1.0, h: Math.max(120, y - fromY + 80) } : { t: -i * 0.18, dur: 1.1, h: 40, slide: { x0: x + (i - 1) * 30, y0: fromY + 10, x1: x, y1: y } };   // bottom ships launch them from the extreme: they fly in towards the camp
      this.fighters.push(m);
    });
    this.audio.play('minion_yell', { at: c, vol: 0.5, gap: 200 });
  }
  // countdown labels (seconds until the next minions): above every owned camp flag and above each nexus
  timerLabel(id, x, y, text, color, show) {
    const m = (this.tmLabels ||= {}); let t = m[id];
    if (!t) t = m[id] = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(100001);
    if (!show || !this.inView(x, y, 120)) return t.setVisible(false);
    return t.setVisible(true).setText(text).setColor(color).setPosition(x, y);
  }
  drawTimers() {
    for (const c of this.camps || []) { const own = c.owner != null; this.timerLabel('c' + c.i, c.x, c.y + this.campR * 0.75 + 16, `REFUERZOS EN ${Math.max(0, Math.ceil(c.spawnT))}s`, c.owner === 0 ? '#8ab4ff' : '#ff8a8a', own); }
    if (!this.training && this.waveT < 1e8) for (const n of this.fighters) if (n.isNexus) this.timerLabel('n' + n.baseTeam, n.x, n.y + 64, `SÚBDITOS EN ${Math.max(0, Math.ceil(this.waveT))}s`, n.baseTeam === 0 ? '#8ab4ff' : '#ff8a8a', n.alive);
  }
  drawCamps(dt) {
    this.updateShips(dt); this.drawTimers();
    if (!this.camps?.length) return; const g = this.campG; g.clear(); const t = this.time.now / 1000;
    for (const c of this.camps) {
      if (!this.inView(c.x, c.y, 220)) { c.flag?.setVisible(false); continue; }
      const a = this.campR, b = a * YR, col = (o) => this.campOwnerColor(o);
      g.fillStyle(0x0a0f1a, 0.38).fillEllipse(c.x, c.y, a * 2, b * 2);
      const pie = (frac, color, al) => { if (frac <= 0.001) return; const pts = [{ x: c.x, y: c.y }], n = Math.max(3, Math.ceil(frac * 60)); for (let i = 0; i <= n; i++) { const ang = -Math.PI / 2 + frac * Math.PI * 2 * i / n; pts.push({ x: c.x + Math.cos(ang) * a, y: c.y + Math.sin(ang) * b }); } g.fillStyle(color, al).fillPoints(pts, true); };
      pie(c.prog[0], col(0), 0.55); pie(c.prog[1], col(1), 0.55);
      g.lineStyle(3, c.contested ? 0xffffff : col(c.owner), c.contested ? 0.5 + 0.5 * Math.sin(t * 10) : 0.9).strokeEllipse(c.x, c.y, a * 2, b * 2);
      g.lineStyle(1, 0xffffff, 0.35).strokeEllipse(c.x, c.y, a * 1.7, b * 1.7);
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

  spawnWave(team) {
    if (team === 0) this.net?.onWave(this.waveN);
    if (this.waveN === 0 && team === 0) this.audio.voice('v_minions', 1, 'ann_minions', { title: '¡MINIONS DESPLEGADOS!', sub: 'La primera oleada avanza por el carril', team: 2 });
    if (team === 0) this.audio.play('minion_yell', { at: { x: 260, y: LANE_MID }, vol: 0.5, gap: 200 });
    const comp = ['melee', 'melee', 'ranged']; if (this.waveN % 2 === 1) comp.push('heavy');   // a tank/automaton every 2nd wave
    const names = team === 0 ? { melee: 'minion_blue_melee', ranged: 'minion_blue_ranged', heavy: 'minion_blue_tank' }
                             : { melee: 'minion_red_melee', ranged: 'minion_red_ranged', heavy: 'minion_red_auto' };
    comp.forEach((c, i) => {
      const slot = { x: 0, y: (i - 2) * 24 }, back = (comp.length - i) * 46;
      const m = new Fighter(this, names[c], team, team === 0 ? 260 + back : WORLD_W - 260 - back, LANE_MID + slot.y, { ai: true, slot });
      m.ax = team === 0 ? 1 : -1;
      this.fighters.push(m);
    });
  }

  // gold to the champion that landed the kill, XP to every allied champion nearby
  reward(v, killer) {
    if (v.isBot || v.summoned || v.owner) return;
    // kill credit: if a tower/minion lands the final blow on a champion, the kill goes to the last enemy champion that hit it (within 10 s)
    let kk = killer?.owner || killer;
    const lh = v.lastChampHit;
    if (v.isChamp && !kk?.isChamp && lh && this.gameT - lh.t <= 10 && lh.champ.baseTeam !== v.baseTeam) kk = lh.champ;
    killer = kk;
    if (kk?.isRage && this.net?.role !== 'client' && v.team !== kk.team) kk.addRage(kk.def.hen.rageKill[v.isChamp ? 'champ' : v.isTower ? 'tower' : 'minion']);   // a kill feeds Eliud's rage
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
    if (v.isChamp) v.hitBy = null;
    const kc = killer?.owner || killer, team = kc ? kc.team : 1 - v.team, me = this.player;
    const r = v.isChamp ? { gold: 300, xp: 90 + 12 * v.level } : v.def.reward || { gold: 0, xp: 0 };
    if (kc?.isChamp) {
      kc.gold += r.gold; if (v.isChamp) kc.kills++;
      if (v.isChamp && v.hitBy) for (const [c, t] of v.hitBy) if (c !== kc && c.baseTeam === kc.baseTeam && this.gameT - t <= 10) c.assists++;   // assists: allies who hit the victim in the last 10 s
      if (kc === me) this.float(v.x, v.y - v.def.height - 26, `+${r.gold}g`, '#ffd23f');
    }
    this.fighters.filter(c => c.isChamp && c.alive && c.team === team && dist(c, v) <= 700).forEach(c => {
      c.gainXp(r.xp);
      if (c === me) this.float(v.x + 24, v.y - v.def.height - 8, `+${r.xp}xp`, '#7ee0ff');
    });
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
    const mode = luis === this.player ? 'ctrl' : luis.pid != null && this.net ? 'remote' : 'charm';
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
  enemiesOf(f) { return this.fighters.filter(t => t.alive && !t.away && !t.drop && t.team !== f.team); }
  enemiesWithin(f, r) { return this.enemiesOf(f).filter(t => eDist(t.x, t.y, f.x, f.y) <= r); }
  meleeHits(f, reach) {
    return this.enemiesOf(f).filter(t => {
      const d = dist(t, f);
      return d <= reach + t.br && (d < 45 || ((t.x - f.x) * f.ax + (t.y - f.y) * f.ay) / d > 0.25);
    });
  }
  nearestEnemy(f, r) {
    let best = null, bd = r;
    for (const t of this.enemiesOf(f)) { if ((t.invis || (t.antivirus && t.owner?.invis)) && !f.isTower) continue; const d = dist(t, f) - (t.br - BODY_R); if (d <= bd) { best = t; bd = d; } }
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
    if (this.basicDmg && src?.key === 'xeviche' && !dot && target.team !== src.team) src.setupHit();   // a landed basic attack feeds the Setup passive
    if (target.isTower && !this.basicDmg) return 0;   // towers and nexus only take basic attacks
    if (!dot) this.audio.play(target.isNexus ? 'hit_heavy' : target.isTower ? 'hit_metal' : type === 'physical' ? 'hit_flesh' : 'debuff', { at: target, vol: target.isTower ? 0.5 : 0.55, gap: 90 });
    const resist = type === 'physical' ? target.armor : type === 'magic' ? target.mr : 0;
    if (src?.key === 'luis' && target !== src) src.lastTarget = target;
    if (target.isRage && !dot && target.alive) target.addRage(Math.min(10, raw * 100 / (100 + resist) / target.maxHp * 100 * target.def.hen.rageTaken));
    { const atk = src?.owner || src; if (target.isChamp && atk?.isChamp && atk.team !== target.team) { atk.hunted = { team: target.team, t: 3 }; target.lastChampHit = { champ: atk, t: this.gameT }; (target.hitBy ||= new Map()).set(atk, this.gameT); } }   // allied minions/towers retaliate
    if (target.key === 'luis' && src?.isChamp) { const hz = this.zones.find(z => z.kind === 'hack' && z.owner === target); if (hz && !hz.free.has(src)) { hz.free.add(src); src.silenceT = 0; this.float(src.x, src.y - src.def.height - 30, 'LIBRE', '#ffffff'); } }
    if (src?.key === 'julio' && target.ink && !dot && !this.inInk) this.explodeInk(src, target);
    let dmg = Math.max(1, raw * 100 / (100 + resist));
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
      if (target.shieldHp <= 0.5) { target.shieldHp = 0; target.shieldT = 0; }
      if (dmg <= 0) return 0;
    }
    target.hp -= dmg;
    if (target.recall && dmg > 0) { target.recall = null; this.float(target.x, target.y - target.def.height - 30, 'Teletransporte cancelado', '#ff9a7a'); }
    { const o = src?.owner || src; if (o?.isChamp && o.it?.lifesteal && type === 'physical' && !dot && o !== target) o.hp = Math.min(o.maxHp, o.hp + dmg * o.it.lifesteal * (o.pas.has('garras_vampiricas') && o.hp < o.maxHp * 0.4 ? 1 + o.pas.get('garras_vampiricas') : 1)); }
    this.onHitPassives(src, target, dmg, type, dot);
    if (target.protein && dmg > 0) { target.protein = null; this.float(target.x, target.y - target.def.height - 30, '¡Proteína rota!', '#ff9a7a'); }
    if (!dot) target.flash();
    if (dmg < 1e6) this.float(target.x + Phaser.Math.Between(-15, 15), target.y - target.def.height - 5, `${Math.round(dmg)}`,
      type === 'magic' ? '#c77dff' : type === 'physical' ? '#ffffff' : '#9be37a');
    this.net?.onDmg(src, target, dmg, type, dot);
    if (target.hp <= 0) { target.hp = 0; target.die(src); }
    return dmg;
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
    if (o?.isChamp && o.pas?.size && this.basicDmg && target.team !== o.team && !target.isTower) {
      if (o.pas.has('bate_servidor')) { target.slow(0.2 * o.pas.get('bate_servidor'), 1.5); this.vfx('spark', target.x, target.cy, { scale: 2, tint: 0x66aaff }); }
      if (o.pas.has('punio_acero') && (o.punchN = (o.punchN || 0) + 1) % (o.pas.get('punio_acero') < 1 ? 6 : 4) === 0) {
        this.inPassive = true; this.damage(o, target, dmg * 0.5 * o.pas.get('punio_acero'), 'physical', true); this.inPassive = false;
        this.vfx('shockwave', target.x, target.y - 6, { scale: 2.2, below: true, tint: 0xff9a4a }); this.vfx('punch', target.x, target.cy, { scale: 4 }); this.float(target.x, target.y - target.def.height - 30, '¡DEMOLEDOR!', '#ff9a4a');
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
    for (const f of this.champs) {
      if (!f.alive || !f.pas?.size || f.hiddenFor?.(this.player) || !this.inView(f.x, f.y, 260)) continue;
      const ring = (r, col, a, dash) => { g.lineStyle(dash ? 3 : 2, col, a).strokeEllipse(f.x, f.y, r * 2, r * 2 * YR); };
      if (f.pas.has('tarjeta_grafica')) { g.fillStyle(0xff7a2a, 0.08 + 0.04 * Math.sin(t * 6)).fillEllipse(f.x, f.y, 420, 420 * YR); ring(210, 0xff8a3a, 0.7); for (let i = 0; i < 8; i++) { const a = t * 1.4 + i * 0.785; g.fillStyle(0xffc060, 0.8).fillCircle(f.x + Math.cos(a) * 210, f.y + Math.sin(a) * 210 * YR, 3); } }
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
  inkTrail(pts, width, life) {   // pixel-art ink stroke on the ground (canvas rendered at 2px per pixel), revealed along the path, then fades
    const K = 2, m = width * 0.9 + 12, r = width / 2;
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
      if (edge > 0) c = edge < K * 1.6 ? '#0b0524' : edge < K * 3 && rough < 0.5 ? '#1d0f4a' : d < rr * 0.32 ? (rough < 0.12 ? '#9a74ff' : '#5a34d8') : (d < rr * 0.6 && rough < 0.35 ? '#35208a' : '#1d0f4a');
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

  inView(x, y, m = 160) { const v = this.cameras.main.worldView; return x > v.x - m && x < v.right + m && y > v.y - m && y < v.bottom + m; }
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
    if (o.ang) { const c = Math.cos(o.ang), sn = Math.sin(o.ang); [ax, ay] = [ax * c - ay * sn, ax * sn + ay * c]; }   // fan shots
    const x = owner.x + ax * 45, y = owner.y + ay * 45, lift = owner.def.height * 0.55;
    let s;
    if (o.obj && this.textures.exists(o.obj)) {   // sprite object (e.g. a laptop) instead of a vfx sheet
      s = this.add.image(x, y - lift, o.obj).setScale(o.scale || 0.2);
      if (o.tint) s.setTint(o.tint);
    } else {
      s = this.add.sprite(x, y - lift, 'vfx_' + (o.vfx || 'energy_bolt')).setScale(o.scale || 2).setRotation(Math.atan2(ay, ax)).setFlipY(ax < 0);
      if (o.tint) s.setTint(o.tint);
      s.play('vfx_' + (o.vfx || 'energy_bolt'));
    }
    this.projs.push({ s, x, y, px: x, py: y, lift, ax, ay, owner, team: owner.team, left: o.range || 900, ctx: this.castCtx, basic: !!this.basicDmg, ...o });
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
  tires(owner, cx, cy, life) {
    const px = -owner.ay, py = owner.ax;
    for (let i = 0; i < 4; i++) {
      const x = cx + px * (i - 1.5) * 44, y = Phaser.Math.Clamp(cy + py * (i - 1.5) * 44, WALK_Y0, WALK_Y1);
      const s = this.add.image(x, y, 'tire').setOrigin(0.5, 0.85).setDepth(y);
      const sc = 62 / s.height; s.setScale(0);
      this.tweens.add({ targets: s, scale: sc, duration: 140 + i * 40, ease: 'Back.Out' });
      this.obstacles.push({ x, y, r: 26, team: owner.team, left: life, s, nx: owner.ax, ny: owner.ay });
    }
  }

  summonBots(owner, n, life, ap) {
    if (this.net?.role === 'client') return;
    const mk = (key, count, back) => {
      for (let i = 0; i < count; i++) {
        const slot = { x: owner.facing * (back ? -90 - i * 30 : 80 + i * 30), y: (i % 2 ? 1 : -1) * (30 + (i >> 1) * 26) };
        const b = new Fighter(this, key, owner.team, owner.x + slot.x, owner.y + slot.y, { ai: true, owner, life, botAp: ap, slot });
        b.ax = owner.ax; b.ay = owner.ay;
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
    if (Phaser.Input.Keyboard.JustDown(this.k.esc)) { const hs = this.scene.get('hud'); if (hs?.shopOpen) { hs.shopOpen = false; } else if (this.aimKey) this.cancelAim(); else if (!this.over) this.togglePause(); }
    if (this.paused && !this.net) return;
    if (this.net && !this.net.live) return;   // online: wait for every player to finish loading
    this.feed = this.feed.filter(e => (e.t -= dt) > 0);
    this.audio.tick();
    if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
    if (this.over) this.over.t += dt;
    const z = Phaser.Math.Clamp(this.scale.height / VIEW_H, 0.6, 4);
    if (z !== this.zoom) { this.zoom = z; this.cameras.main.setZoom(z); }
    this.camTarget.x = this.pc.x; this.camTarget.y = this.pc.y - 30;

    if (this.ctrl || this.over) this.player.in = { mx: 0, my: 0, run: false };
    if (this.over) this.player.in = { mx: 0, my: 0, run: false }; else if (this.player.charmT > 0 && this.net?.role !== 'client') this.runAi(this.player, dt); else if (this.net && (this.paused || this.player.charmT > 0 || (this.control?.mode === 'remote' && this.control.target === this.player))) this.player.in = { mx: 0, my: 0, run: false }; else this.handleInput();
    this.net?.pre(dt);
    const due = []; this.timers = this.timers.filter(t => ((t.t -= dt) > 0) || (due.push(t), false)); due.forEach(t => { this.castCtx = t.ctx || null; t.fn(); this.castCtx = null; });
    if (this.training && this.enemy.alive && this.enemy.hp < this.enemy.maxHp) this.enemy.hp = Math.min(this.enemy.maxHp, this.enemy.hp + this.enemy.maxHp * 0.12 * dt);   // dummy regenerates
    this.gameT += dt;
    if (!this.over) this.waveT -= dt; if (this.waveT <= 0 && !this.over && this.net?.role !== 'client') { this.waveT = 28; this.spawnWave(0); this.spawnWave(1); this.waveN++; }
    if (!this.over && this.net?.role !== 'client') this.fighters.forEach(f => { if (this.control?.mode === 'remote' && f === this.control.target) return; if ((f.ai && this.aiOn && f !== this.ctrl) || f.isBot || f.isMinion || f.isTower || f.charmT > 0) this.runAi(f, dt); });
    this.recordHistory(dt);
    this.updateCamps(dt);
    this.fighters.forEach(f => f.update(dt));
    this.fighters.forEach(f => f.alive && !f.isTower && this.resolveSolids(f));
    // AI champions spend their skill points (ultimate first when available)
    this.champs.forEach(e => { if (e === this.player || e.pid != null || this.net?.role === 'client') return; while (e.points > 0) { const open = ABILITY_KEYS.filter(a => e.canSpend(a)); if (!open.length) break; e.spend(open.includes('ult') ? 'ult' : open[Math.random() * open.length | 0]); } });
    if (this.control && this.net?.role !== 'client') { this.control.t -= dt; if (this.control.t <= 0 || !this.control.target.alive || !this.control.luis.alive) this.endControl(); }
    this.updateEliud(dt);
    this.updateMortars(dt);
    this.updateChains(dt);
    this.updateZones(dt);
    this.updateProjectiles(dt);
    this.obstacles = this.obstacles.filter(o => { o.left -= dt; if (o.left <= 0) { o.s.destroy(); return false; } return true; });
    this.fighters = this.fighters.filter(f => { if (f.dispose) { f.destroy(); return false; } return true; });
    this.fighters.forEach(f => f.render(time));
    this.drawBars();
    this.drawFountain();
    this.drawTowerRanges();
    this.drawAim();
    this.drawRangeHint();
    this.drawRewind(dt);
    this.drawCamps(dt);
    this.drawPassiveFx();
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
        if (z.tick >= 0.5) { z.tick -= 0.5; this.enemiesNear(o.team, z.x, z.y, z.r).forEach(t => this.damage(o, t, z.dmg, 'physical', true)); }
        return true;
      }
      if (z.kind === 'infect') {   // Leandro's contracts: a green infected area that poisons everyone inside
        if (z.t <= 0) { z.decal?.destroy(); return false; }
        if (this.textures.exists('zone')) z.decal ||= this.add.image(z.x, z.y, 'zone').setTint(0x7dff4a).setAlpha(0.7).setDepth(z.y - 3).setDisplaySize(z.r * 2.1, z.r * 2.1 * YR);
        z.decal?.setAlpha(Math.min(0.7, z.t * 0.7));
        z.tick += dt;
        if (z.tick >= 0.5) {
          z.tick -= 0.5; this.vfx('poison_cloud', z.x + Phaser.Math.Between(-z.r * 0.6, z.r * 0.6), z.y + Phaser.Math.Between(-z.r * 0.4, z.r * 0.4) - 10, { scale: 2.2, alpha: 0.7, below: true });
          this.enemiesNear(o.team, z.x, z.y, z.r).forEach(t => { if (t.isTower) return; t.poisons = t.poisons.filter(p => p.tag !== z); t.poison(z.total / z.poisonTime, Math.max(1, z.poisonTime * 0.6), o); t.poisons[t.poisons.length - 1].tag = z; });
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
      if (z.kind === 'puddle') {
        if (z.t <= 0) { z.decal?.destroy(); return false; }
        z.decal ||= this.add.image(z.x, z.y, this.textures.exists('ink_blot') ? 'ink_blot' : 'zone').setTint(0x4a2cc0).setAlpha(0.85).setDepth(-899).setDisplaySize(z.r * 2.1, z.r * 2.1 * YR);
        this.fighters.filter(f => f.alive && f.team !== o.team && !f.isTower).forEach(f => {
          if (Math.hypot(f.x - z.x, (f.y - z.y) / 0.8) > z.r) { z.inside.delete(f); return; }
          f.slow(z.slow, 0.15);
          const t = (z.inside.get(f) || 0) + dt; z.inside.set(f, t);
          if (t >= z.stunAfter) { f.stun(z.stun); this.applyInk(o, f); z.inside.set(f, -3); }
        });
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

  updateProjectiles(dt) {
    this.projs = this.projs.filter(p => {
      p.px = p.x; p.py = p.y;
      p.x += p.ax * p.speed * dt; p.y += p.ay * p.speed * dt; p.left -= p.speed * dt;
      p.s.setPosition(p.x, p.y - p.lift).setDepth(p.y + 1);
      if (p.spin) p.s.rotation += dt * (p.spinSpeed ?? 12) * (p.ax >= 0 ? 1 : -1);
      let dead = p.left <= 0 || p.x < 0 || p.x > WORLD_W || p.y < 0 || p.y > WORLD_H;
      if (!dead) {
        const wall = this.obstacles.find(o => o.team !== p.team && segDist(p.px, p.py, p.x, p.y, o.x, o.y) < o.r + (p.r || 14) * 0.5);
        if (wall) { this.vfx('block', wall.x, wall.y - 40, { scale: 3 }); dead = true; }
      }
      if (!dead) {
        const t = this.enemiesOf(p.owner).find(t => segDist(p.px, p.py, p.x, p.y, t.x, t.y) < t.br + (p.r || 14));
        if (t) {
          if (!p.noDamage) { const pb = this.basicDmg; this.basicDmg = p.basic; this.damage(p.owner, t, p.dmg, p.type); this.basicDmg = pb; }
          this.castCtx = p.ctx || null;
          p.onImpact?.(p.x, p.y);
          this.vfx('spark', p.x, p.y - p.lift, { scale: p.big ? 4 : 2.5 });
          p.onHit?.(t); this.castCtx = null;
          dead = true;
        }
      }
      if (dead) p.s.destroy();
      return !dead;
    });
  }

  /* ---------- bars above heads: HP + mana (champions), HP only (bots) ---------- */
  drawBars() {
    if (!this.gfx) this.gfx = this.add.graphics().setDepth(99999);
    const g = this.gfx; g.clear();
    const me = this.player;
    for (const f of this.fighters) {
      const champ = f.isChamp;
      if (f.hiddenFor(me) || this.blindVis(f) <= 0) { f.bt && Object.values(f.bt).forEach(t => t.setVisible(false)); continue; }
      if (champ && !f.bt) {
        const mk = () => { const t = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3, resolution: 3 }).setOrigin(0.5).setDepth(100000); t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR); return t; };
        f.bt = { hp: mk(), mp: mk(), name: mk(), lvl: mk() };
      }
      if (!f.alive) { f.bt && Object.values(f.bt).forEach(t => t.setVisible(false)); continue; }
      const w = champ ? 96 : f.isNexus ? 160 : f.isTower ? 90 : 36, h = champ ? 12 : f.isNexus ? 14 : f.isTower ? 9 : 6, x = f.x - w / 2, mh = 8, xh = 4;
      const y = f.y - f.def.height - (champ ? 38 : 14);
      g.fillStyle(0x000000, 0.75).fillRect(x - 2, y - 2, w + 4, h + 4 + (champ ? mh + 2 : 0));
      const sh = f.shieldHp > 0 ? f.shieldHp : 0, tot = Math.max(f.maxHp, f.hp + sh);
      g.fillStyle(0x3a1414).fillRect(x, y, w, h).fillStyle(f.team === me.baseTeam ? 0x3ddc84 : 0xff5252).fillRect(x, y, w * f.hp / tot, h);
      if (sh > 0) g.fillStyle(0xffffff).fillRect(x + w * f.hp / tot, y, w * sh / tot, h).fillStyle(0xbfc8d8).fillRect(x + w * f.hp / tot, y + h * 0.65, w * sh / tot, h * 0.35);
      if (champ) {
        // second bar: mana (blue) or, for champions without mana, their own resource (Eliud: rage in orange, hen durability in gold)
        const rb = f.isRage, fr = rb ? (f.hen ? f.henHp / f.henMax : f.rage / 100) : f.maxMana ? f.mana / f.maxMana : 0;
        g.fillStyle(rb ? 0x3a1a0a : 0x12264a).fillRect(x, y + h + 2, w, mh).fillStyle(rb ? (f.hen ? 0xffd23f : 0xff7a2a) : 0x3b8cff).fillRect(x, y + h + 2, w * Phaser.Math.Clamp(fr, 0, 1), mh);
        const gx = x - 17, gy = y + (h + mh + 2) / 2;
        levelGauge(g, gx, gy, 12, f.level >= 12 ? 1 : f.xp / f.xpNeed, 4);
        f.bt.lvl.setVisible(true).setText(`${f.level}`).setPosition(gx, gy).setFontSize(11);
        f.bt.hp.setVisible(true).setText(`${Math.ceil(f.hp)}/${Math.ceil(f.maxHp)}`).setPosition(f.x, y + h / 2).setFontSize(10);
        f.bt.mp.setVisible(true).setText(`${f.isRage ? Math.floor(f.hen ? f.henHp : f.rage) : Math.floor(f.mana)}`).setPosition(f.x, y + h + 2 + mh / 2).setFontSize(8);
        f.bt.name.setVisible(true).setText(`${f.def.name}`).setPosition(f.x, y - 11).setColor(f === me ? '#7dff9a' : f.team === me.baseTeam ? '#8ab4ff' : '#ff8a8a');
      }
      if (f.pkBuffs) { let n = 0; const C = { hp: 0x5dff8a, atk: 0xff7a5a, aspd: 0xffd23f, def: 0x7ee0ff }; for (const k in f.pkBuffs) { g.fillStyle(0x000000, 0.8).fillRect(x + n * 14 - 1, y + h + (champ ? 20 : 4) , 12, 6).fillStyle(C[k]).fillRect(x + n * 14, y + h + (champ ? 21 : 5), 10 * Math.max(0, f.pkBuffs[k].t / f.pkBuffs[k].T), 4); n++; } }
      if (f.stunT > 0) g.fillStyle(0xffd23f).fillRect(x, y - 6, w * Math.min(1, f.stunT / 2), 3);
      if (f.ink) { g.fillStyle(0x1d0f4a).fillCircle(f.x, y - 14, 7).fillStyle(0x8a5cff).fillCircle(f.x - 2, y - 16, 2.5); }
      const ly = y + h + (champ ? mh + 4 : 2);
      if (f.slows.length) g.fillStyle(0x6ec6ff).fillRect(x, ly, w * 0.3, 2);
      if (f.poisons.length) g.fillStyle(0x9be37a).fillRect(x + w * 0.35, ly, w * 0.3, 2);
    }
  }
}
