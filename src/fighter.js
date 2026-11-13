import { maduroSB, SV_MAX_LEVEL, COMBOS, LUNGES, COMBO_WINDOW, CHAMPIONS, ABILITY_KEYS, MAX_LEVEL, MAX_RANK, ULT_LEVELS, rk } from './data.js';
import { JulioMixin } from './julio.js';
import { JosueMixin, PAL_DOG } from './josue.js';
import { fmtStat, STAT_LABEL as STAT_LABEL_B, ITEM_BY_ID, MINI_OF, SLOTS, sellValue, buyPlan, PERM_KEYS, PERM_BY_ID, PERM_COST, STAT_CAP } from './items.js';

// World geometry: top-down map, one horizontal lane.
import { WORLD_W, WORLD_H, CAMPS, isWalk } from './mapdata.js';
export { WORLD_W, WORLD_H, CAMPS };
export const LANE_Y0 = WORLD_H / 2 - 120, LANE_Y1 = WORLD_H / 2 + 120;                 // middle lane (ARAM): the only open lane, minions walk it
export const LANES = [{ id: 'mid', y0: LANE_Y0, y1: LANE_Y1 }];
export const WALK_Y0 = 70, WALK_Y1 = WORLD_H - 70;
export const towerCircle = t => (t.isNexus ? 210 : (t.def?.stats?.range || 320));   // a tower's own attack circle: structures can only be hit by attackers standing inside it (world units)
export const BODY_R = 28;               // ground radius used for hits

// Bot definitions (Leandro's ult).
export const BOT_DEFS = {
  sentry: { name: 'Centinela', isBot: true, bot: 'ranged', phys: true, ref: 'sentry_robot', static: true, anim: 'sentry', mound: 'sentry_mound', stats: { hp: 140, mana: 0, atk: 0, ap: 0, armor: 12, mr: 8, speed: 0, run: 0, range: 380, atkCd: 0.9 }, height: 66 },
  minigun: { name: 'Torreta minigun', isBot: true, bot: 'ranged', phys: true, rapid: true, static: true, ref: 'minigun', stats: { hp: 300, mana: 0, atk: 0, ap: 0, armor: 22, mr: 12, speed: 0, run: 0, range: 440, atkCd: 0.14 }, height: 80 },
  fence: { name: 'Reja', isBot: true, bot: 'wall', static: true, ref: 'fence_h', radius: 20, stats: { hp: 420, mana: 0, atk: 0, ap: 0, armor: 30, mr: 30, speed: 0, run: 0, range: 0, atkCd: 9 }, height: 40 },
  drone: { name: 'Dron', isBot: true, bot: 'ranged', fly: true, stats: { hp: 160, mana: 0, atk: 0, ap: 0, armor: 10, mr: 10, speed: 230, run: 230, range: 340, atkCd: 0.8 }, height: 90 },
  bodyguard: { name: 'Guardaespaldas', isBot: true, bot: 'melee', guard: true, phys: true, ref: 'bodyguard', stats: { hp: 260, mana: 0, atk: 0, ap: 0, armor: 25, mr: 15, speed: 175, run: 215, range: 70, atkCd: 0.9 }, height: 100 },   // Maduro's permanent escorts
  crate: { name: 'Cesta', isBot: true, bot: 'crate', phys: true, ref: 'empty_box', radius: 34, stats: { hp: 220, mana: 0, atk: 0, ap: 0, armor: 10, mr: 0, speed: 0, run: 0, range: 0, atkCd: 9 }, height: 60 },   // Maduro's box: lasts a minute, spawns bugs and poisons the area
  roach: { name: 'Cucaracha', isBot: true, bot: 'melee', phys: true, ref: 'roach', stats: { hp: 60, mana: 0, atk: 0, ap: 0, armor: 5, mr: 0, speed: 190, run: 190, range: 46, atkCd: 0.7 }, height: 62 },
  josue_dog: PAL_DOG,   // Josué's partner (dog or archer, see josue.js)
  bot_melee:  { name: 'Bot', isBot: true, bot: 'melee',  stats: { hp: 140, mana: 0, atk: 0, ap: 0, armor: 10, mr: 10, speed: 170, run: 170, range: 70,  atkCd: 0.8 }, height: 100 },
  bot_ranged: { name: 'Bot', isBot: true, bot: 'ranged', stats: { hp: 90,  mana: 0, atk: 0, ap: 0, armor: 5,  mr: 5,  speed: 150, run: 150, range: 340, atkCd: 1.0 }, height: 100 },
};

// Lane units. Blue = modern military, red = robots. Art: art/raw/objects/<tex>.png (all face right, the game flips them).
const mkMinion = (tex, name, height, stats, attack, reward) => ({ kind: 'minion', name, ref: tex, tex, height, stats: { mana: 0, atk: 0, ap: 0, mr: 10, run: stats.speed, ...stats }, attack, reward });
const mkTower = (tex, name, proj) => ({ kind: 'tower', name, ref: tex, tex, height: 205, radius: 42,
  stats: { hp: 1800, mana: 0, atk: 0, ap: 0, armor: 50, mr: 50, speed: 0, run: 0, range: 320, atkCd: 1.1 },
  attack: { type: 'ranged', dmg: 160, dmgType: 'physical', proj }, reward: { gold: 150, xp: 120 } });
// 8-direction sprites: screen directions in clockwise order from east (y points down). Only s/se/e/ne/n are drawn; the left side mirrors se/e/ne.
const DIR8 = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
const DIR_SRC = { e: ['e', false], se: ['se', false], s: ['s', false], ne: ['ne', false], n: ['n', false], w: ['e', true], sw: ['se', true], nw: ['ne', true] };

const w2g = f => f.w.gameT || 0;

// bosses (neutral team 2). `art` = their own sprite set (Codex, art/BOSS_SPEC.md); until it is packed the game draws `artFallback` tinted with `phTint`.
const mkBoss = (art, fb, tint, name, height, stats, attack, reward, hb = {}) => ({ kind: 'boss', name, ref: art, tex: art, art, artFallback: fb, phTint: tint, height, stats: { mana: 0, atk: 0, ap: 0, mr: 10, run: stats.speed, ...stats }, attack, reward, ...hb });
const mkCamp = (art, fb, name, stats, attack, reward) => ({ ...mkMinion(art, name, 110, stats, attack, reward), art, artFallback: fb, phTint: 0xe0c98a });
export const UNIT_DEFS = {
  boss_beast:    mkBoss('boss_beast', 'minion_red_auto', 0xa8784a, 'Bestia peluda', 330, { hp: 3400, armor: 28, mr: 12, speed: 92, range: 150, atkCd: 2.2 }, { type: 'melee', dmg: 70, dmgType: 'physical', reach: 190 }, { gold: 0, xp: 260 }, { hitR: 80, hitUp: 210 }),
  boss_captain:  mkBoss('boss_captain', 'minion_blue_melee', 0xd8b86a, 'Capitán', 118, { hp: 2700, armor: 30, mr: 20, speed: 110, range: 330, atkCd: 1.0 }, { type: 'ranged', dmg: 34, dmgType: 'physical', proj: { vfx: 'bullet_tracer', speed: 640, scale: 1.4, r: 10 } }, { gold: 0, xp: 220 }),
  boss_robot:    mkBoss('boss_robot', 'minion_red_auto', 0x6a7078, 'Robot de guerra', 340, { hp: 9500, armor: 55, mr: 40, speed: 0, range: 0, atkCd: 9 }, { type: 'melee', dmg: 0, dmgType: 'physical', reach: 0 }, { gold: 0, xp: 500 }, { hitR: 95, hitUp: 230 }),
  camp_soldier_melee: mkCamp('camp_soldier_melee', 'minion_blue_melee', 'Soldado del campamento', { hp: 340, armor: 18, speed: 112, range: 70, atkCd: 1.0 }, { type: 'melee', dmg: 16, dmgType: 'physical', reach: 80 }, { gold: 0, xp: 20 }),
  camp_soldier_rifle: mkCamp('camp_soldier_rifle', 'minion_blue_ranged', 'Fusilero del campamento', { hp: 240, armor: 10, speed: 112, range: 320, atkCd: 1.1 }, { type: 'ranged', dmg: 15, dmgType: 'physical', proj: { vfx: 'bullet_tracer', speed: 560, scale: 1.3, r: 10 } }, { gold: 0, xp: 18 }),
  minion_blue_melee:  mkMinion('minion_blue_melee', 'Soldado', 110, { hp: 320, armor: 15, speed: 105, range: 70, atkCd: 1.0 }, { type: 'melee', dmg: 12, dmgType: 'physical', reach: 80 }, { gold: 20, xp: 28 }),
  minion_blue_ranged: mkMinion('minion_blue_ranged', 'Fusilero', 110, { hp: 220, armor: 8, speed: 105, range: 300, atkCd: 1.1 }, { type: 'ranged', dmg: 12, dmgType: 'physical', proj: { vfx: 'bullet_tracer', speed: 560, scale: 1.3, r: 10 } }, { gold: 16, xp: 22 }),
  minion_blue_tank:   mkMinion('minion_blue_tank', 'Tanque de guerra', 124, { hp: 500, armor: 20, mr: 20, speed: 85, range: 360, atkCd: 2.0 }, { type: 'ranged', dmg: 13.5, dmgType: 'physical', proj: { vfx: 'cannonball', speed: 420, scale: 2.2, r: 16 } }, { gold: 50, xp: 70 }),
  minion_red_melee:   mkMinion('minion_red_melee', 'Robot', 110, { hp: 320, armor: 15, speed: 105, range: 70, atkCd: 1.0 }, { type: 'melee', dmg: 12, dmgType: 'physical', reach: 80 }, { gold: 20, xp: 28 }),
  minion_red_ranged:  mkMinion('minion_red_ranged', 'Robot artillero', 110, { hp: 220, armor: 8, speed: 105, range: 300, atkCd: 1.1 }, { type: 'ranged', dmg: 12, dmgType: 'magic', proj: { vfx: 'plasma_shot', speed: 520, scale: 1.3, r: 10, tint: 0xff6a5a } }, { gold: 16, xp: 22 }),
  minion_red_auto:    mkMinion('minion_red_auto', 'Autómata', 150, { hp: 550, armor: 20, mr: 20, speed: 80, range: 95, atkCd: 1.4 }, { type: 'melee', dmg: 16.5, dmgType: 'physical', reach: 105 }, { gold: 50, xp: 70 }),
  nexus_blue: { kind: 'nexus', name: 'Nexo militar', ref: 'nexus_blue', tex: 'nexus_blue', height: 280, radius: 95, reward: { gold: 0, xp: 0 },
    stats: { hp: 6000, mana: 0, atk: 0, ap: 0, armor: 60, mr: 60, speed: 0, run: 0, range: 0, atkCd: 9 } },
  nexus_red: { kind: 'nexus', name: 'Nexo robot', ref: 'nexus_red', tex: 'nexus_red', height: 280, radius: 95, reward: { gold: 0, xp: 0 },
    stats: { hp: 6000, mana: 0, atk: 0, ap: 0, armor: 60, mr: 60, speed: 0, run: 0, range: 0, atkCd: 9 } },
  tower_blue: mkTower('tower_blue', 'Torreta militar', { vfx: 'cannonball', speed: 650, scale: 2, r: 14 }),
  tower_red:  mkTower('tower_red', 'Torre robot', { vfx: 'plasma_shot', speed: 650, scale: 2.2, r: 14, tint: 0xff4a3a }),
};

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const LUNGE_RUN_T = 0.45;   // seconds of running needed to gain the impulse for the forward attack
export class Fighter {
  constructor(world, key, team, x, y, opts = {}) {
    this.w = world;
    this.nid = opts.nid ?? world.nidNext++; world.byNid?.set(this.nid, this); this.pid = null;   // network id (same on every client for champions and towers)
    this.key = key;
    this.def = CHAMPIONS[key] || BOT_DEFS[key] || UNIT_DEFS[key];
    if (key === 'maduro') { this.defN = this.def; this.defSB = maduroSB(this.def); }   // normal / Súper Bigote kits (the transformation swaps this.def)
    this.isBot = !!this.def.isBot;
    this.isBoss = this.def.kind === 'boss'; this.isMinion = this.def.kind === 'minion' || this.isBoss; this.isNexus = this.def.kind === 'nexus'; this.isTower = this.def.kind === 'tower' || this.isNexus;
    this.isChamp = !this.isBot && !this.isMinion && !this.isTower;
    { const a = this.def.art; this.art = a && world.sprites[a] ? a : this.def.artFallback || key; this.placeholder = !!a && this.art !== a; }   // bosses / camp units: their own art once it is packed, a tinted stand-in until then
    this.xp = 0; this.gold = this.isChamp ? 500 : 0;
    this.inv = Array(SLOTS).fill(null); this.pas = new Map(); this.perm = {}; this.it = this.zeroStats(); this.potions = []; this.potionCd = 0; this.recall = null; this.skin = this.art; this.bonus = {}; this.buff = null;
    this.team = team; this.baseTeam = team;
    this.x = x; this.y = y;
    this.spawn = { x, y };
    this.owner = opts.owner || null;       // bots: the champion that summoned them
    this.ai = !!opts.ai; this.antivirus = !!opts.antivirus; this.lastTarget = null; this.invis = null; this.away = false;
    this.life = opts.life ?? Infinity; this.life0 = this.life; this.enraged = false;
    this.botAp = opts.botAp || 0; this.hpMult = opts.hpMult || 1;   // summoned bots: health multiplier (Leandro's ult scales it with his AI power)
    this.slot = opts.slot || { x: 0, y: 0 };
    this.ax = team === 0 ? 1 : -1; this.ay = 0;   // aim (unit vector on the ground)
    this.level = 1;
    this.points = this.isChamp ? 1 : 0;
    this.ranks = { p1: 0, p2: 0, p3: 0, ult: 0 };
    this.branch = {};   // ability slot -> 1 when the second branch (def.alt) was chosen
    if (this.def.duo) this.duoInit();   // Josué: two bodies (josue.js)
    this.comb = null; this.leakRe = null; this.revealT = 0;
    this.setupStacks = 0;
    this.basicCount = 0;
    this.kills = 0; this.deaths = 0; this.assists = 0;
    this.reset();
    this.buildSprite();
  }

  /* ---------- items ---------- */
  zeroStats() { return { atk: 0, ap: 0, armor: 0, mr: 0, hp: 0, mana: 0, speed: 0, aspd: 0, lifesteal: 0, cdr: 0, hpRegen: 0, manaRegen: 0 }; }
  recomputeItems() {
    const hpR = this.hp / (this.maxHp || 1), mR = this.maxMana ? this.mana / this.maxMana : 0, t = this.zeroStats();
    this.inv.forEach(sl => { if (!sl) return; const st = ITEM_BY_ID[sl.id].stats; for (const k in st) t[k] += st[k]; });
    for (const k in this.bonus) t[k] += this.bonus[k];   // boss upgrades
    for (const k in this.perm) t[k] += this.perm[k] * PERM_BY_ID['p_' + k].per;   // permanent upgrades
    for (const k in STAT_CAP) t[k] = Math.min(t[k], STAT_CAP[k]);
    this.it = t; this.pas = new Map(); this.inv.forEach(q => { if (!q) return; const it = ITEM_BY_ID[q.id]; if (!it.passive) return; const key = it.passive.mini ? MINI_OF[q.id] : q.id, v = it.passive.mini ? 0.5 : 1; this.pas.set(key, Math.max(this.pas.get(key) || 0, v)); });   // ids of the items carried (unique passives look here)
    if (this.maxHp) this.hp = Math.min(this.maxHp, Math.max(this.hp, this.maxHp * hpR));   // buying never lowers current health; the new max HP is granted proportionally
    if (this.maxMana) this.mana = Math.min(this.maxMana, Math.max(this.mana, this.maxMana * mR));
  }
  slotOf(id) { return this.inv.findIndex(sl => sl && sl.id === id); }
  canBuy(id) { const p = buyPlan(this.inv, id); return this.isChamp && p.ok && this.gold >= p.gold; }
  // crafting: components already carried are consumed, the missing ones are bought (see items.js buyPlan)
  buyItem(id) {
    if (this.w.net?.role === 'client') return this.w.net.op('buy', id);
    const it = ITEM_BY_ID[id], p = buyPlan(this.inv, id); if (!this.canBuy(id)) return false;
    this.gold -= p.gold;
    if (p.topUp !== undefined) this.inv[p.topUp].charges++;
    else { p.use.forEach(i => { this.inv[i] = null; }); this.inv[this.inv.indexOf(null)] = { id, cd: 0, charges: it.consumable ? 1 : 0 }; }
    this.recomputeItems(); this.w.audio.play(p.use.length ? 'ui_upgrade' : 'ui_confirm', { gap: 0, vol: 0.7 });
    if (p.use.length) this.w.vfx('levelup', this.x, this.y - 20, { scale: 3 });
    return true;
  }
  canBuyPerm(k) { return this.isChamp && this.alive && this.gold >= PERM_COST; }
  buyPerm(k) {
    if (this.w.net?.role === 'client') return this.w.net.op('perm', k);
    if (!this.canBuyPerm(k)) return false;
    this.gold -= PERM_COST; this.perm[k] = (this.perm[k] || 0) + 1; this.recomputeItems();
    this.w.audio.play('ui_upgrade', { gap: 0, vol: 0.8 }); this.w.vfx('levelup', this.x, this.y - 20, { scale: 3 }); return true;
  }
  sellItem(slot) {
    if (this.w.net?.role === 'client') return this.w.net.op('sell', slot);
    const sl = this.inv[slot]; if (!sl) return false;
    this.gold += sellValue(ITEM_BY_ID[sl.id]) * (ITEM_BY_ID[sl.id].consumable ? Math.max(1, sl.charges) : 1);
    this.inv[slot] = null; this.recomputeItems(); this.w.audio.play('ui_confirm', { gap: 0, vol: 0.7 }); return true;
  }
  useItem(slot) {   // consumables and active items
    if (this.w.net?.role === 'client') return this.w.net.op('use', slot);
    const sl = this.inv[slot]; if (!sl || !this.alive || this.stunT > 0) return false;
    const it = ITEM_BY_ID[sl.id], m = 1, w = this.w;
    if (it.consumable) {
      const c = it.consumable; if (this.potionCd > 0 || sl.charges <= 0) return false;
      if (c.cleanse) { this.stunT = 0; this.silenceT = 0; this.slows = []; this.poisons = []; this.blindT = 0; if (this.state === 'stun') this.state = 'idle'; }
      this.potions.push({ hp: (c.hp || 0) * m, mana: (c.mana || 0) * m, t: c.time, T: c.time });
      this.potionCd = 1.0; sl.charges--; w.vfx('heal', this.x, this.cy, { scale: 3, tint: c.mana && !c.hp ? 0x66aaff : 0x66ff99 });
      w.audio.playAll('a_xeviche_p2', { at: this, vol: 0.35, gap: 150 });
      if (sl.charges <= 0) { this.inv[slot] = null; this.recomputeItems(); }
      return true;
    }
    if (!it.active || sl.cd > 0) return false;
    const a = it.active; sl.cd = a.cd;
    w.useActive(this, a, m);
    return true;
  }

  // Xeviche's Setup (passive): every few hits he lands (basic attacks that connect, abilities cast) adds a piece
  setupHit() {
    if (this.key !== 'xeviche' || !this.def.abilities.p3.interval || !this.ranks.p3 || !this.alive) return;   // (the old Setup passive is gone: inert)
    const a = this.def.abilities.p3, max = rk(a.maxStacks, this.ranks.p3), w = this.w;
    if (this.setupStacks >= max) { this.setupHits = 0; return; }
    if ((this.setupHits = (this.setupHits || 0) + 1) < rk(a.interval, this.ranks.p3)) return;
    this.setupHits = 0; this.setupStacks++;
    w.audio.playAll('a_xeviche_p3', { at: this, vol: 0.8, gap: 0 }); w.vfx('buff', this.x, this.cy, { scale: 3 }); w.float(this.x, this.y - this.def.height - 40, `Setup x${this.setupStacks}`, '#7ee0ff');
  }

  // ---- unique passives of the level-3 items (automatic, no input) ----
  itemPassives(dt) {
    const w = this.w, P = this.pas, ft = this.in && (this.in.mx || this.in.my);
    this.moveT = ft ? (this.moveT || 0) + dt : 0;
    this.runT = ft ? Math.min(2, (this.runT || 0) + dt) : 0;
    if (this.isChamp && this.alive && this.runT >= LUNGE_RUN_T) {   // impulse ready: a flash when it is gained, then a speed trail while it lasts
      if (!this.impulse) { this.impulse = true; w.vfx('shockwave', this.x, this.y - 6, { scale: 1.4, below: true, tint: 0xffe27a, alpha: 0.9 }); w.vfx('buff', this.x, this.cy, { scale: 2.2, tint: 0xffe27a, alpha: 0.8 }); }
      if ((this.impT = (this.impT || 0) - dt) <= 0) { this.impT = 0.07; w.vfx('spark', this.x - this.ax * 16, this.y - 10 - Math.random() * 20, { scale: 1.3, tint: 0xffe27a, alpha: 0.85, below: true }); }
    } else this.impulse = false;
    if (P.has('botas_hipersonicas') && this.moveT > 2 && (this.trailT = (this.trailT || 0) - dt) <= 0) { this.trailT = 0.12; w.vfx('spark', this.x - this.ax * 18, this.y - 8, { scale: 1.6, tint: 0x66e0ff, alpha: 0.8, below: true }); }
    if (P.has('filtro_spam') && (this.spamT = (this.spamT || 0) - dt) <= 0) { this.spamT = 0.25; w.enemiesNear(this.team, this.x, this.y, 260).forEach(t => { if (!t.isTower) { t.atkSlow = 0.25 * P.get('filtro_spam'); t.atkSlowT = 0.4; } }); }
    if (P.has('nucleo_ia')) {   // AI core: the shield stays until it is broken; once lost, the 12 s counter starts again from zero
      if (this.coreOn && this.shieldHp <= 0) { this.coreOn = false; this.coreT = 12; }
      if (!this.coreOn && (this.coreT = (this.coreT ?? 12) - dt) <= 0) { this.coreT = 12; this.coreOn = true; this.shieldHp = Math.max(this.shieldHp, (25 + this.ap * 0.5) * P.get('nucleo_ia')); this.shieldT = Infinity; w.vfx('shield', this.x, this.cy, { scale: 2.6 }); w.float(this.x, this.y - this.def.height - 34, '¡Escudo de núcleo!', '#ffffff'); }
    } else if (this.coreOn) { this.coreOn = false; this.coreT = 12; }
    if (P.has('firewall_magico')) { if (this.mshieldCd > 0) this.mshieldCd -= dt; else if (!this.mshield) { this.mshield = (120 + this.mr * 2) * P.get('firewall_magico'); w.vfx('shield', this.x, this.cy, { scale: 2.2, tint: 0x66e0ff }); } }
    if (P.has('corazon_silicio') && !(this.combatT > 0) && this.hp < this.maxHp) { this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.03 * P.get('corazon_silicio') * dt); if (Math.random() < dt * 3) w.vfx('heal', this.x + (Math.random() - 0.5) * 40, this.cy + (Math.random() - 0.5) * 30, { scale: 1.6, alpha: 0.8, tint: 0x66ff99 }); }
    if (this.backupCd > 0) this.backupCd -= dt;
  }

  /* ---------- geometry ---------- */
  startRecall() {   // B: go back to the base after 4 s (taking damage cancels it; pressing it again cancels it too)
    if (!this.alive || !this.isChamp) return;
    if (this.recall) { this.recall = null; this.w.float(this.x, this.y - this.def.height - 34, 'Teletransporte cancelado', '#ff9a7a'); return; }
    if (this.w.inBase(this)) { this.w.float(this.x, this.y - this.def.height - 34, 'Ya estás en la base', '#9fb4d0'); return; }
    this.recall = { t: 10, T: 10 }; this.w.float(this.x, this.y - this.def.height - 34, 'Volviendo a la base...', '#7ee0ff'); this.w.vfx('summon', this.x, this.y - 10, { scale: 3, tint: 0x7ee0ff });
  }
  cancelRecall() { if (this.recall) { this.recall = null; this.w.float(this.x, this.y - this.def.height - 34, 'Teletransporte cancelado', '#ff9a7a'); } }
  hiddenInBush(viewerTeam) {   // inside a bush: invisible to the other team unless it attacked / cast a moment ago or an enemy stands next to the bush
    if (!this.inBush || this.brRevealT > 0) return false;
    return !this.w.fighters.some(e => e.alive && !e.away && e.baseTeam === viewerTeam && Math.hypot(e.x - this.x, e.y - this.y) < 200);
  }
  hiddenFor(me) { return this.away || this.w.cages?.some(c => c.inside.has(me) !== c.inside.has(this)) || this.fogHidden || (this.baseTeam !== me.baseTeam && this.hiddenInBush(me.baseTeam)) || ((this.invis || (this.antivirus && this.owner?.invis)) && this.baseTeam !== me.baseTeam); }
  breakInvis() { if (this.invis) { this.invis = null; if (this.isBot) { this.w.vfx('run_dust', this.x, this.y - 6, { scale: 3, alpha: 0.9, below: true }); this.w.vfx('summon', this.x, this.y - 10, { scale: 2 }); return; } if (this.hunt) this.josueHuntEnd(); if (this.key === 'luis') this.stab = 2.5; this.w.float(this.x, this.y - this.def.height - 30, 'visible', '#9be37a'); } }
  tryMove(nx, ny) {   // forest (trees / bushes) is impassable: slide along walls
    if (isWalk(nx, this.y)) this.x = nx;
    if (isWalk(this.x, ny)) this.y = ny;
  }
  // dash / lunge movement: small sub-steps and it STOPS at solids (Leandro's tires, nexus) and map limits instead of being pushed out on the far side; returns false when blocked
  dashStep(dx, dy) {
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)), sx = dx / n, sy = dy / n;
    for (let i = 0; i < n; i++) {
      const ox = this.x, oy = this.y; this.tryMove(clamp(this.x + sx, 60, WORLD_W - 60), clamp(this.y + sy, WALK_Y0, WALK_Y1));
      if (this.w.solidAt(this.x, this.y, this.team) || (this.x === ox && this.y === oy)) { this.x = ox; this.y = oy; return false; }
    }
    return true;
  }
  get br() { return this.def.radius || BODY_R; }   // body radius for hits
  get facing() { return this.ax >= 0 ? 1 : -1; }
  get cy() { return this.y - this.def.height * 0.6; }        // chest height on screen
  setAim(dx, dy) {
    const l = Math.hypot(dx, dy);
    if (l > 1e-3 && !this.flame && !this.harem) { this.ax = dx / l; this.ay = dy / l; }
  }

  /* ---------- stats ---------- */
  grow(stat) {
    const g = this.def.grow?.[stat] ?? 0;
    return this.def.stats[stat] * (1 + g * (this.level - 1));
  }
  pk(type) { return this.pkBuffs?.[type]?.m || 0; }   // temporary package buffs (Eliud's R): hp / atk / aspd / def
  get maxHp() { return (this.grow('hp') + this.it.hp) * (this.buff?.hpMult || 1) * (1 + this.pk('hp')) * (this.hpMult || 1); }
  get maxMana() { return this.def.rage ? 0 : this.def.stats.mana ? this.def.stats.mana + this.it.mana : 0; }
  get atk() { return (this.grow('atk') + this.it.atk) * (this.buff?.atkMult || 1) * (1 + this.pk('atk')) * (this.pas?.has('exoesqueleto') && this.hp < this.maxHp * 0.5 ? 1 + 0.2 * this.pas.get('exoesqueleto') : 1); }
  get ap() { return this.isBot ? this.botAp : (this.grow('ap') + this.it.ap) * (1 + this.pk('atk')); }
  get armor() { return (this.sb ? this.sb.armor : 0) + (this.armorShredT > 0 ? 1 - this.armorShred : 1) * (this.def.stats.armor + this.it.armor) * (1 + this.pk('def')) + this.pk('def') * 30 + this.setupBonus('armorPer') + (this.hen ? this.def.hen.armor : 0); }
  get mr() { return (this.sb ? this.sb.mr : 0) + (this.def.stats.mr + this.it.mr) * (1 + this.pk('def')) + this.pk('def') * 30 + this.setupBonus('mrPer') + (this.hen ? this.def.hen.mr : 0); }
  get atkRange() { const b = this.def.basic; return this.hen ? b.hen.reach : this.comb ? this.comb.reach : (b?.kind === 'melee' ? b.reach : this.def.stats.range); }
  // basic attack in use: Eliud's hen form and Leandro's comb turn it into a melee swing
  get basicDef() {
    if (this.hen) return { ...this.def.basic, ...this.def.basic.hen };
    if (this.comb) { const a = this.def.abilities.p1; return { ...this.def.basic, kind: 'melee', type: 'magic', reach: rk(a.reach, this.ranks.p1 || 1), base: rk(a.dmg, this.ranks.p1 || 1), atkScale: 0, apScale: a.apScale, vfx: 'spark', wave: (this.ranks.p1 || 1) >= 2, waveRed: (this.ranks.p1 || 1) >= 3, waveMult: (this.ranks.p1 || 1) >= 3 ? 1.15 : 0.7 }; }  // rank 1: plain melee hits; rank 2: crescent waves; rank 3: red waves with more damage
    return this.def.basic;
  }
  get isRage() { return !!this.def.rage; }
  setupBonus(field) {
    if (this.key !== 'xeviche' || !this.def.abilities.p3.interval || !this.ranks.p3) return 0;
    return this.setupStacks * rk(this.def.abilities.p3[field], this.ranks.p3);
  }
  // stats without items, buffs, transformation or setup pieces (the HUD shows these as the base value)
  baseStats() {
    const sv = [this.it, this.buff, this.pkBuffs, this.hen, this.setupStacks];
    this.it = this.zeroStats(); this.buff = null; this.pkBuffs = {}; this.hen = false; this.setupStacks = 0;
    try { return { hp: this.maxHp, mana: this.maxMana, atk: this.atk, ap: this.ap, armor: this.armor, mr: this.mr, speed: this.speed }; }
    finally { [this.it, this.buff, this.pkBuffs, this.hen, this.setupStacks] = sv; }
  }
  get speed() {
    const base = this.running ? this.def.stats.run : this.def.stats.speed;
    return base * (this.enraged ? 1.4 : 1) * (1 - this.slows.reduce((m, s) => Math.max(m, s.pct), 0)) * (1 + (this.speedT > 0 ? this.speedBoost : 0) + this.it.speed + (this.moveT > 2 ? 0.15 * (this.pas.get('botas_hipersonicas') || 0) : 0)) * (this.hen ? 1 + this.def.hen.speed : 1) * (this.lure ? 0.45 : 1);   // the giant hen runs faster
  }

  /* ---------- lifecycle ---------- */
  reset() {
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    this.alive = true;
    this.state = 'idle';
    this.stateT = 0; this.stateDur = 0;
    this.pending = null; this.fired = false;
    this.stunT = 0; this.slows = []; this.poisons = []; this.rootT = 0; this.woundT = 0;
    this.running = false;
    this.deadT = 0;
    this.in = { mx: 0, my: 0, run: false };
    this.flame?.spr?.destroy(); this.flame = null; this.bomber = null; this.charge = 0; this.harem = null; this.lure = null; this.gun = false; this.gunT = 0; this.arepaGrace = 0; this.setupStacks = 0; this.setupHits = 0; this.rw = null; this.mshield = 0; this.mshieldCd = 0; this.backupCd = 0; this.moveT = 0; this.punchN = 0; this.combatT = 0; this.atkSlowT = 0; this.coreT = undefined;
    this.cds = { p1: 0, p2: 0, p3: 0, ult: 0, basic: 0 };
    this.guardInit = false; this.ink = null; this.inkDash = null; this.burst = null; this.inkFree = null; this.puddle = null; this.inkSh = null; this.silenceT = 0; this.blindT = 0; this.shieldHp = 0; this.shieldT = 0; this.speedBoost = 0; this.speedT = 0; this.charmT = 0; this.team = this.baseTeam; this.malware = null;
    this.rage = 0; this.hen = false;
    this.dashCharges = this.key === 'jorbi' && this.ranks.p2 > 0 ? 3 : 0; this.dashTimers = []; this.dashV = null; this.castPoint = null;
    if (this.buff) { this.buff = null; this.setSkin(this.key); }
    this.hen = false; this.rage = 0; this.pkBuffs = {}; this.protein = null; this.pullTo = null; this.bike = null; this.ride = null;
    this.qRe = null; this.cdrT = 0; this.invulT = 0; this.drT = 0; this.sShield = null; this.atkSlowT = 0; this.armorShredT = 0; this.devalT = 0; this.shove = null; this.pullMe = null; this.comb = null; this.leakRe = null; this.revealT = 0; if (this.sb) this.setSB(0);
    if (this.skin !== this.art) this.setSkin(this.art);
    if (this.duo) this.josueReset();
  }

  // sprite set in use ('jorbi' or 'jorbi_buff' while transformed)
  setSkin(skin) {
    this.skin = skin;
    if (this.spr && this.hasAnims) this.playAnim(this.state === 'walk' ? 'walk' : this.state === 'run' ? 'run' : 'idle');
    if (this.spr && !this.hasAnims) this.spr.setScale(this.baseScale * (skin.endsWith('_buff') ? 1.12 : 1));
  }

  startDash() {   // jorbi "Rico caldito": instant dash; each used charge recharges on its own
    const a = this.def.abilities.p2, dist = rk(a.dashDist, this.ranks.p2), dur = 0.22;
    this.dashCharges--; this.dashTimers.push(rk(a.cd, this.ranks.p2)); this.w.audio.playAll('a_jorbi_p2', { at: this, vol: 0.95, gap: 0 });
    this.state = 'cast'; this.anim = 'dash'; this.stateT = 0; this.stateDur = dur; this.windup = 99; this.pending = null; this.fired = true;
    this.dashV = { x: this.ax * dist / dur, y: this.ay * dist / dur };
    this.playAnim('dash', dur);
    this.w.vfx('run_dust', this.x, this.y - 6, { scale: 2.4, alpha: 0.8, below: true });
  }
  addPkBuff(type, t, m) {   // temporary buff from an Eliud package
    this.pkBuffs = this.pkBuffs || {};
    const before = this.maxHp; this.pkBuffs[type] = { t, m, T: t };
    if (type === 'hp') this.hp += this.maxHp - before;
  }
  addRage(n) {
    if (!this.isRage || this.hen || !this.alive) return;
    this.rageIdle = 0;   // fighting (hitting or being hit) keeps the rage up
    this.rage = Math.min(100, this.rage + n);
    if (this.rage >= 100) this.startHen();
  }
  startHen() {   // giant hen appears, Eliud rides it
    const h = this.def.hen;
    this.hen = true; this.rage = 100;
    this.buff = { t: Infinity, hpMult: h.hpMult, atkMult: h.atkMult, cdSpeed: 1 };   // permanent until the hen's own health is gone
    this.henHp = this.henMax = h.hp * (1 + h.hpScale * (this.level - 1));
    this.pending = null; this.stunT = 0;
    this.startAction('transform', 0.55, 1.0, () => { this.setSkin('eliud_hen'); this.w.vfx('shockwave', this.x, this.y - 10, { scale: 6, below: true });  });
    this.w.audio.playAll('ev_eliud_hen', { at: this, vol: 0.95, gap: 0 });
    this.w.float(this.x, this.y - this.def.height - 40, '¡GALLINA!', '#ff9a2e');
    this.w.vfx('levelup', this.x, this.y - 10, { scale: 6, below: true });
  }

  endBuff() {
    this.buff = null; if (this.hen) { this.hen = false; this.rage = 0; this.henHp = 0; }
    this.hp = Math.min(this.hp, this.maxHp);
    this.setSkin(this.key);
    this.w.float(this.x, this.y - this.def.height - 30, 'fin de la transformación', '#ffb0b0');
  }

  get respawnTime() { return 4 + this.level * 1.2; }
  get maxLv() { return this.w.survival ? SV_MAX_LEVEL : MAX_LEVEL; }
  get xpNeed() { return this.w.survival ? Math.round(70 + 55 * Math.pow(this.level - 1, 1.15)) : Math.round(110 * Math.pow(1.3, this.level - 1)); }   // each level needs ~30% more XP than the last (about 55 % more XP in total than before: levelling is slower)
  gainXp(n) {
    if (!this.isChamp || this.level >= this.maxLv) return;
    this.xp += n;
    while (this.level < this.maxLv && this.xp >= this.xpNeed) { this.xp -= this.xpNeed; this.levelUp(); }
    if (this.level >= this.maxLv) this.xp = 0;
  }

  levelUp() {
    if (this.level >= this.maxLv) return false;
    const ratio = this.hp / this.maxHp;
    this.level++; this.points++;
    if (this.w.survival && this.isChamp) { this.points--; this.w.sv.picks++; }   // survival: every level is a card to choose instead of a free skill point
    this.w.audio.play('levelup', { at: this, vol: this === this.w.player ? 1 : 0.5, gap: 0 });
    this.hp = Math.min(this.maxHp, this.maxHp * ratio + this.maxHp * 0.1);
    this.w.vfx('levelup', this.x, this.y - 20, { scale: 3.2 });
    this.w.float(this.x, this.y - this.def.height - 30, `NIVEL ${this.level}`, '#ffe066');
    return true;
  }

  canSpend(k) {
    if (!this.isChamp || this.points <= 0 || this.ranks[k] >= MAX_RANK) return false;
    return k !== 'ult' || this.level >= ULT_LEVELS[this.ranks.ult];
  }

  setBranch(k, b) {   // idempotent: swaps the ability of slot k for its second-branch version
    if (!this.def.alt?.[k] || (this.branch[k] || 0) === b) return;
    this.branch[k] = b; this.def = { ...this.def, abilities: { ...this.def.abilities, [k]: b ? this.def.alt[k] : (CHAMPIONS[this.key].abilities[k]) } };
  }
  spend(k, b = 0) {
    if (this.w.net?.role === 'client') return this.canSpend(k) && this.w.net.op('spend', b ? k + ':1' : k);
    if (!this.canSpend(k)) return false;
    if (!this.ranks[k] && this.def.alt?.[k]) this.setBranch(k, b ? 1 : 0);   // the choice is made when the ability is first learned
    this.ranks[k]++; this.points--;
    this.w.audio.play('ui_upgrade', { gap: 0 });
    if (this.key === 'jorbi' && k === 'p2' && this.ranks.p2 === 1) this.dashCharges = 3;
    return true;
  }

  /* ---------- actions ---------- */
  get free() { return this.alive && this.stunT <= 0 && !(this.carriedT > 0) && this.state !== 'cast' && !this.rw; }

  startAction(anim, windup, dur, fn) {
    this.state = 'cast'; this.anim = anim;
    this.stateT = 0; this.stateDur = dur; this.windup = windup;
    this.pending = fn; this.fired = false; this.lunge = null;
    this.playAnim(anim, dur);
  }

  // basic attacks are the only damage towers/nexus accept (abilities don't affect structures)
  basicDo(fn) { const w = this.w, prev = w.basicDmg; w.basicDmg = true; try { fn(); } finally { w.basicDmg = prev; } }

  tryBasic() {
    const n = this.w.net;
    if (n?.role === 'client' && !n.replaying) return n.clientBasic(this);
    const ok = this._tryBasic(); if (ok && n?.role === 'host') n.sendBasic(this); return ok;
  }
  tryCast(k) {
    const n = this.w.net;
    if (n?.role === 'client' && !n.replaying) return n.clientCast(this, k);
    const ok = this._tryCast(k); if (ok) { this.fIdle = 0; this.setupHit(); if (this.pas.has('consola_overclock') && this.maxMana) { this.mana = Math.min(this.maxMana, this.mana + this.maxMana * 0.08 * this.pas.get('consola_overclock')); this.w.vfx('buff', this.x, this.cy, { scale: 2, tint: 0x3b8cff, alpha: 0.7 }); } if (this.pas.has('procesador_cuantico')) { this.speedBoost = Math.max(this.speedT > 0 ? this.speedBoost : 0, 0.25 * this.pas.get('procesador_cuantico')); this.speedT = Math.max(this.speedT, 2); this.w.vfx('run_dust', this.x, this.y - 6, { scale: 2.2, alpha: 0.8, below: true }); } if (n?.role === 'host') n.sendCast(this, k); } return ok;
  }
  // basic attack combo: up to 3 chained hits (see COMBOS in data.js). Bots/minions/towers keep the single swing.
  // a basic attack may be started in the middle of the previous swing once that hit has landed (animation cancel): every click throws the next hit
  chaining() { return this.alive && this.stunT <= 0 && !this.rw && this.state === 'cast' && /^attack/.test(this.anim || '') && this.fired && !this.dashV; }
  comboCfg() { const b = this.basicDef, c = (this.comb ? COMBOS.jorbi : COMBOS[this.key]) || (b.kind === 'melee' ? COMBOS.jorbi : COMBOS.axel); return c; }
  // damage the NEXT basic attack (the next hit of the combo) would deal to `t`, after armour / magic resistance (used by the last-hit indicator)
  nextBasicDmg(t) {
    const b = this.basicDef, C = this.comboCfg(), w = this.w;
    const inWin = this.comboStep > 0 && this.comboStep < C.length && (w.gameT || 0) - (this.comboEnd || 0) <= COMBO_WINDOW, cs = C[inWin ? this.comboStep : 0];
    let raw;
    if (b.kind === 'melee') raw = (b.base + this.atk * (b.atkScale || 0) + this.ap * (b.apScale || 0)) * cs.dmg * (this.key === 'jorbi' && cs.fin && this.ranks.p3 > 0 ? rk(this.def.abilities.p3.critMult, this.ranks.p3) : 1);
    else if (b.obj || !b.every3) raw = ((b.alt || (b.apScale != null && b.atkScale == null) ? b.base + this.ap * b.apScale : b.base + this.atk * b.atkScale) * cs.dmg) * (cs.shots || 1);
    else raw = (b.base + this.ap * b.apScale) * (cs.fin ? b.every3.mult * (cs.finMult || 1) : cs.dmg) * (cs.shots || 1);
    const res = b.type === 'physical' ? t.armor : b.type === 'magic' ? t.mr : 0;
    return Math.max(1, raw * 100 / (100 + res));
  }
  _tryBasic() {
    const w = this.w;
    if (!(this.free || this.chaining()) || this.cds.basic > 0 || this.flame || this.ride || this.lure || this.bomber || this.burst || this.inkFree) {   // no basic attacks while the flamethrower / Julio's golden burst / ink glide is active
      return false;
    }
    if (this.hunt) return this.josuePounce();   // Josué's dog hunting: the attack is a leap on the prey
    this.cancelRecall(); this.bufferT = 0; this.fIdle = 0; this.brRevealT = 1.6;   // attacking pauses the Farándula recharge; attacking from a bush gives away the position
    this.cds.basic = (this.comb?.atkCd || this.def.stats.atkCd) * (this.enraged ? 0.6 : 1) / (1 + this.pk('aspd') + this.it.aspd) / (this.atkSlowT > 0 ? 1 - this.atkSlow : 1);
    if (this.invis) this.breakInvis();
    if (this.isBot) { this.startAction('attack', 0.2, 0.4, () => this.basicDo(() => this.botAttack())); return true; }
    if (this.isMinion || this.isTower) { this.startAction('attack', 0.15, 0.35, () => this.basicDo(() => this.unitAttack())); return true; }
    const b = this.basicDef, C = this.comboCfg();
    this.basicCount++;
    const t = w.gameT || 0, baseCd = this.cds.basic, fs = this.forceStep; this.forceStep = 0;
    // attack + move toward the aim = a single attack with a forward impulse and its own animation (not a combo hit)
    const mv = Math.hypot(this.in?.mx || 0, this.in?.my || 0), LG = (this.comb ? LUNGES.jorbi : LUNGES[this.key]) || (b.kind === 'melee' ? LUNGES.jorbi : LUNGES.axel);
    if (fs === -1 || (!fs && mv > 0 && this.rootT <= 0 && (this.runT || 0) >= LUNGE_RUN_T && (this.in.mx * this.ax + this.in.my * this.ay) / mv > 0.35)) {
      let wind = (b.windup || 0.2) * LG.w, dur = (b.dur || 0.45) * LG.t; if (b.alt) { this.basicSpeed = b.slow.speed; wind = b.slow.windup * LG.w; dur = b.slow.dur * LG.t; }
      const cd = Math.max(baseCd * LG.cd, wind + 0.06), td = Math.max(0.14, wind + 0.04), cs = { anim: 'lunge', dmg: LG.dmg, reachAdd: LG.reachAdd || 0, obj: LG.obj, scale: LG.scale || 1, speed: LG.speed || 1, lungeAtk: true };
      this.runT = 0; this.cds.basic = cd; this.comboStep = 0; this.cstepN = -1; this.comboEnd = t; this.holdPose = false; this.cstep = cs;
      this.startAction('lunge', wind, dur, () => this.basicDo(() => this.fireBasic(false, cs)));
      this.lunge = { vx: this.ax * LG.dist / td, vy: this.ay * LG.dist / td, t: td };
      return true;
    }
    // which hit of the combo: the next one if the previous swing ended less than COMBO_WINDOW ago, otherwise back to the first
    let step = fs || ((this.comboStep > 0 && this.comboStep < C.length && t - (this.comboEnd || 0) <= COMBO_WINDOW) ? this.comboStep + 1 : 1);
    const cs = C[step - 1]; this.comboStep = step >= C.length ? 0 : step; this.cstep = cs; this.cstepN = step;
    let wind = b.windup * cs.w, dur = b.dur * cs.t, cd = this.cds.basic * cs.cd;   // cd = time until the next click can act
    if (b.alt) {   // julio: slow drawing, fast scribble, slow big blot
      const m = step === 2 ? b.fast : b.slow; this.basicSpeed = m.speed; wind = m.windup * cs.w; dur = m.dur * cs.t; cd = m.cd * cs.cd;
    }
    { const k = Math.min(1, cd * 1.05 / dur); wind *= k; dur *= k; }   // faster playback instead of a cut swing: the hit still lands at the same frame
    cd = Math.max(cd, wind + 0.06); this.cds.basic = cd; this.comboEnd = t + cd;   // the hit has to land before the next one can cancel the swing; the click window starts when the next hit becomes possible
    this.startAction(cs.anim, wind, dur, () => this.basicDo(() => this.fireBasic(!!cs.fin, cs)));
    return true;
  }

  _tryCast(k) {
    const a = this.def.abilities?.[k], rank = this.ranks[k];
    if (!a || !rank || a.passive || this.silenceT > 0 || this.charmT > 0) return false;
    if (this.burst || this.inkFree) return false;   // Julio: golden burst and the ink glide lock every other ability
    if (this.flame || this.ride || this.lure || (this.bomber && this.key !== 'yonaiker') || this.abilityLocked(k)) return false;   // while the flamethrower burns / the bike runs / lured by a heart: no other ability and no recast
    if (this.duo && k === 'ult' && !(this.pal?.alive && !this.pal.away)) return false;   // Fiel compañero needs the partner at hand
    if (this.key === 'jorbi' && k === 'p2') {   // instant dash, uses one charge
      if (!this.free || this.dashCharges <= 0) return false;
      const cost = rk(a.mana, rank);
      if (this.mana < cost && !this.w.debugFree) return false;
      if (!this.w.debugFree) this.mana -= cost;
      if (location.hash) console.log('dbg cast', k, rank);
      this.startDash(); return true;
    }
    if (this.puddle && a.v === 'shield') return false;
    if (this.recall && this.free && this.cds[k] <= 0 && this.mana >= rk(a.mana, rank)) this.cancelRecall();   // any action cancels the return   // as an ink puddle he cannot shield himself
    if (this.puddle && a.v === 'puddle') { this.endPuddle(); return true; }   // 2nd press: back to normal form
    if (!this.free || this.cds[k] > 0) return false;
    const cost = (this.key === 'diosa' && k === 'p1' && this.qRe) || (this.leakRe && k === 'ult') ? 0 : rk(a.mana, rank);   // Diosa: the Q recast (backflip) is free
    if (this.mana < cost && !this.w.debugFree) return false;
    if (!this.w.debugFree) this.mana -= cost;
    this.cds[k] = this.w.debugFree ? 0.5 : rk(a.cd, rank); this.brRevealT = 1.6;   // casting from a bush reveals the position
    if (location.hash) console.log('dbg cast', k, rank);
    if (this.invis && !(this.key === 'luis' && k === 'p2')) this.breakInvis();
    const map = { p1: 'power1', p2: 'power2', p3: 'power3', ult: 'ult' };
    if (this.key === 'leandro' && a.v) { const nm = a.v === 'comb' ? 'power1b' : a.v === 'dryer' ? (this.castPoint?.x === 1 ? 'power2b_push' : 'power2b_pull') : a.v === 'throw' ? 'power3b' : 'ultb'; if (this.w.anims.exists('leandro_' + nm)) map[k] = nm; }   // branch-B cast animations (fall back to the normal ones until drawn)
    if (this.key === 'julio' && a.v === 'puddle' && this.w.anims.exists('julio_puddle_in')) map.ult = 'puddle_in';
    if (this.key === 'julio' && a.v === 'shield') map.p2 = this.w.anims.exists('julio_power2b') ? 'power2b' : 'ult';   // golden shield: its own casting pose (not the dash)
    if (this.key === 'axel' && k === 'p1') { this.malware = ['virus', 'trojan', 'worm'][Math.random() * 3 | 0]; map.p1 = 'power1_' + this.malware; }
    const re = this.key === 'leandro' && a.v === 'leak' && this.leakRe;   // 2nd activation of Filtraciones: no animation, it cancels the activation pose
    this.startAction(re ? 'idle' : map[k], re ? 0.05 : a.windup, re ? 0.25 : a.dur, () => { this.w.castCtx = { f: this, k }; this.fireAbility(k, a, rank); this.w.castCtx = null; });
    return true;
  }

  /* ---------- effects (champion specific) ---------- */
  fireBasic(heavy = false, cs = null) {
    const b = this.basicDef, w = this.w; cs ||= { dmg: 1 };
    w.audio.basic(this, heavy);
    if (b.kind === 'melee') {
      let dmg = (b.base + this.atk * (b.atkScale || 0) + this.ap * (b.apScale || 0)) * cs.dmg;
      const crit = heavy && this.key === 'jorbi' && this.ranks.p3 > 0;
      if (crit) dmg *= rk(this.def.abilities.p3.critMult, this.ranks.p3);   // jorbi's passive turns the finisher into a critical hit; junior's 3rd punch gets its stun from the fist counter
      const hitNow = w.meleeHits(this, b.reach + (cs.reachAdd || 0));
      if (b.wave) w.projectile(this, { animFx: b.waveRed ? 'comb_wave_fx_red' : 'comb_wave_fx', pierce: true, hits: new Set(hitNow), scale: heavy ? 1.3 : 1.05, range: b.reach + 55, speed: 620, dmg: dmg * (b.waveMult || 0.7), type: 'magic', r: 26, basic: true });   // the comb throws a crescent wave with every swing (short range, pierces)
      hitNow.forEach(t => {
        w.damage(this, t, dmg, b.type); this.addRage(this.def.hen?.rageHit || 0);
        if (this.key === 'luis' && this.stab > 0 && t.isChamp && (t.ax * (this.x - t.x) + t.ay * (this.y - t.y)) < 0) {   // backstab after leaving invisibility: critical AI damage
          this.stab = 0; w.damage(this, t, 60 + this.ap * 2.2, 'magic'); w.float(t.x, t.y - t.def.height - 46, '¡APUÑALADA!', '#33ff88');  w.vfx('spark', t.x, t.cy, { scale: 5, tint: 0x33ff88 });
        }
        w.vfx(b.vfx, t.x, t.cy, { scale: heavy ? 5.5 : cs.anim === 'attack2' ? 3.5 : 3 });
        if (crit) w.float(t.x, t.y - t.def.height - 28, '¡CRÍTICO!', '#ff9a2e');
      });
      return;
    }
    // ranged: a volley of 1-3 shots per combo hit, same projectile style as the champion's basic attack
    const n = cs.shots || 1, spread = cs.spread ?? 0.1, gap = cs.gap ?? 0.09;
    const shoot = (ang) => {
      if (b.obj || !b.every3) {   // generic ranged physical attack (axel's laptop, yonaiker's bolts, julio's drawings, eliud's eggs)
        const jb = this.key === 'julio' ? this.inkBounces() : null, jd = (b.base + this.ap * b.apScale) * cs.dmg;   // Tinta rebotona (passive): golden ink that bounces to the nearest enemy
        w.projectile(this, { ang, range: this.def.stats.range, onHit: jb ? t => w.inkBounce(this, t, rk(jb.bounces, this.ranks.p3), jd * jb.keep, jb, new Set([t])) : this.key === 'eliud' ? () => this.addRage(this.def.hen.rageHit) : null, speed: jb ? 900 : (this.basicSpeed || b.speed) * (cs.speed || 1), dmg: (b.alt || (b.apScale != null && b.atkScale == null) ? b.base + this.ap * b.apScale : b.base + this.atk * b.atkScale) * cs.dmg, type: b.type, obj: this.puddle && w.textures.exists('ink_bubble') ? 'ink_bubble' : jb && w.textures.exists('ink_gold_drop') ? 'ink_gold_drop' : cs.obj || b.obj, tint: jb && !this.puddle ? 0xffd23f : null, ...(this.puddle ? { lift: 12 } : {}), vfx: b.vfx, spin: !!b.obj && !b.alt && !b.face, face: b.face, scale: this.puddle || jb ? 0.05 : (b.fit ? w.objFit(cs.obj || b.obj, b.fit) : b.scale ? b.scale : b.alt ? 0.2 : this.key === 'eliud' ? 0.12 : 0.17) * (cs.scale || 1), r: 14 * (cs.scale > 1 ? 1.3 : 1) });
        return;
      }
      const big = !!cs.fin;   // leandro / xeviche: the finisher is their big magic missile
      let dmg = b.base + this.ap * b.apScale;
      dmg = big ? dmg * b.every3.mult * (cs.finMult || 1) : dmg * cs.dmg;
      w.projectile(this, { ang, range: this.def.stats.range, speed: b.speed, dmg, type: b.type, vfx: b.vfx, scale: big ? b.every3.scale * 2.4 : 2.2 * (n > 1 ? 0.85 : 1),
        tint: big ? 0x9ad7ff : null, big, r: big ? 22 : 14 });
    };
    for (let i = 0; i < n; i++) {
      const ang = n > 1 ? (i - (n - 1) / 2) * spread : 0;
      if (i === 0) shoot(ang); else w.after(i * gap, () => { if (this.alive && !this.stunT) shoot(ang); });
    }
  }

  // ---- Leandro, second branch: comb / hair dryer / tire throw / leaks ----
  fireLeandroB(k, a, rank) {
    const w = this.w, dmg = (a.dmg ? rk(a.dmg, rank) : 0) + this.ap * (a.apScale || 0);
    if (a.v === 'comb') {
      this.comb = { t: rk(a.time, rank), atkCd: a.atkCd, reach: rk(a.reach, rank) };
      w.vfx('summon', this.x, this.y - 10, { scale: 3, tint: 0x66ffcc }); w.float(this.x, this.y - this.def.height - 30, '¡Poder del peine!', '#9fffd8');
    } else if (a.v === 'dryer') {
      const push = this.castPoint?.x === 1; this.castPoint = null;
      const px = -this.ay, py = this.ax, L = rk(a.length, rank);
      for (let i = 1; i <= 7; i++) w.after(i * 0.03, () => w.vfx('run_dust', this.x + this.ax * L * i / 7, this.y + this.ay * L * i / 7 - 10, { scale: 3 + i * 0.25, alpha: 0.85 }));
      w.enemiesOf(this).forEach(t => {
        if (t.isTower || t.def?.static) return;
        const rx = t.x - this.x, ry = t.y - this.y, along = rx * this.ax + ry * this.ay, side = Math.abs(rx * px + ry * py);
        if (along < 0 || along > L || side > a.width / 2 + t.br * 0.6) return;
        w.damage(this, t, dmg, 'magic'); t.carriedT = a.hold;   // cannot act (nor escape) while dragged
        if (push) t.shove = { vx: this.ax * a.speed, vy: this.ay * a.speed, t: a.hold }; else t.pullMe = { by: this, t: a.hold + 0.15 };
      });
      w.float(this.x, this.y - this.def.height - 30, push ? '¡Impulso!' : '¡Jalón!', '#ff9ad0');
    } else if (a.v === 'throw') {
      const c = this.castPoint || { x: this.x + this.ax * a.range * 0.6, y: this.y + this.ay * a.range * 0.6 }; this.castPoint = null;
      w.throwTires(this, c, a, dmg);
    } else if (a.v === 'leak') {
      if (this.leakRe) {   // 2nd activation: teleport next to the chosen enemy and lock both of you in a virtual cage
        const t = w.pickTarget(this, 1e6, this.castPoint || { x: this.x, y: this.y }); this.castPoint = null;
        this.leakRe = null; this.cds.ult = rk(a.cd, rank);
        if (!t) return;
        w.vfx('summon', this.x, this.y - 10, { scale: 4, tint: 0x66ffcc });
        const origin = { x: this.x, y: this.y }, tOrigin = { x: t.x, y: t.y };   // where both were before the cage
        const side = this.team === 0 ? -1 : 1; let nx = t.x + side * 90, ny = t.y; if (!isWalk(nx, ny)) { nx = t.x - side * 90; if (!isWalk(nx, ny)) { nx = t.x; ny = t.y + 60; } }
        this.x = nx; this.y = ny; this.ax = -side; this.ay = 0;
        w.vfx('summon', this.x, this.y - 10, { scale: 4, tint: 0x66ffcc }); w.makeCage(this, t, a.radius, rk(a.cage, rank), origin, tOrigin);
        w.float(this.x, this.y - this.def.height - 30, '¡Jaula virtual!', '#66ffcc');
      } else {   // 1st activation: leak where the enemy champions are
        const T = rk(a.reveal, rank);
        w.fighters.forEach(e => { if (e.alive && e.isChamp && e.team !== this.team) { e.revealT = T; e.revealBy = this.team; e.revealSight = a.sight; } });
        this.leakRe = { t: a.recast }; this.cds.ult = 0;
        w.vfx('summon', this.x, this.y - 10, { scale: 3, tint: 0x66ffcc }); w.float(this.x, this.y - this.def.height - 30, '¡Filtración!', '#66ffcc');
      }
    }
  }

  // ---- Maduro: bodyguards (W) ----
  guardTick(dt) {   // passive: the first 2 appear when learned, then one more every `interval` s (the HUD shows the countdown over the icon)   // one more bodyguard every `interval` seconds until the cap; they are permanent
    if (this.w.net?.role === 'client') return;
    const a = CHAMPIONS.maduro.abilities.p2, r = this.ranks.p2; this.guards = (this.guards || []).filter(g => g.alive && !g.dispose);
    if (!this.guardInit) { this.guardInit = true; for (let i = 0; i < a.initial; i++) this.spawnGuard(); this.guardT = rk(a.interval, r); this.w.vfx('shockwave', this.x, this.y - 6, { scale: 4, below: true, tint: 0x7ee0ff }); }
    const dmg = rk(a.dmg, r) + this.atk * a.atkScale, hp = rk(a.hp, r);
    this.guards.forEach((q, i) => { const t = i / this.guards.length * Math.PI * 2; q.slot = { x: Math.cos(t) * 95, y: Math.sin(t) * 62 }; });   // evenly spread around Maduro, also after a loss
    this.guards.forEach(g => { g.botAp = dmg; if (g.def.stats.hp !== hp) { g.hp += hp - g.def.stats.hp; g.def = { ...g.def, stats: { ...g.def.stats, hp } }; } });   // upgrades also improve the ones already out
    if (this.guards.length >= rk(a.cap, r)) { this.guardT = rk(a.interval, r); return; }
    if ((this.guardT = (this.guardT ?? rk(a.interval, r)) - dt) <= 0) { this.spawnGuard(); this.guardT = rk(a.interval, r); }
  }
  spawnGuard() {
    const w = this.w; if (w.net?.role === 'client') return false;
    const a = CHAMPIONS.maduro.abilities.p2, r = this.ranks.p2 || 1; this.guards = (this.guards || []).filter(g => g.alive && !g.dispose);
    if (this.guards.length >= rk(a.cap, r)) return false;
    const ang = Math.random() * 6.283, g = new Fighter(w, 'bodyguard', this.team, this.x + Math.cos(ang) * 70, this.y + Math.sin(ang) * 45, { ai: true, owner: this, botAp: rk(a.dmg, r) + this.atk * a.atkScale });
    g.def = { ...g.def, stats: { ...g.def.stats, hp: rk(a.hp, r) } }; g.hp = g.maxHp; g.ax = this.ax; g.ay = this.ay; w.fighters.push(g); this.guards.push(g);
    this.guards.forEach((q, i) => { const t = i / this.guards.length * Math.PI * 2; q.slot = { x: Math.cos(t) * 95, y: Math.sin(t) * 62 }; });   // always surrounding Maduro
    w.vfx('summon', g.x, g.y - 10, { scale: 2.4 }); return true;
  }
  // ---- Diosa Canales ----
  diosaStealth() {   // passive: after killing a champion she vanishes for a few seconds, until she attacks or casts
    this.invis = { t: this.def.passive.invis, trail: 0.15 }; this.w.vfx('summon', this.x, this.y - 10, { scale: 3, tint: 0xff4fa3 }); this.w.float(this.x, this.y - this.def.height - 34, 'Fuera de escena...', '#ff9ad0');
  }
  lookedAtBy(t) { const dx = this.x - t.x, dy = this.y - t.y, d = Math.hypot(dx, dy) || 1; return (t.ax * dx + t.ay * dy) / d > 0.25; }   // t is facing her
  fireDiosa(k, a, rank) {
    const w = this.w, byDist = (p, q) => Math.hypot(p.x - this.x, p.y - this.y) - Math.hypot(q.x - this.x, q.y - this.y);
    if (k === 'p1' && this.qRe) {   // recast: backflip + a volley of kisses (AI damage, on-hit effects)
      this.qRe = null; this.cds.p1 = rk(a.cd, rank);
      const dmg = rk(a.kissDmg, rank) + this.ap * a.kissAp, ang0 = Math.atan2(this.ay, this.ax);
      this.state = 'cast'; this.anim = 'power1'; this.stateT = 0; this.stateDur = 0.4; this.fired = true; this.dashV = { x: -this.ax * a.back / 0.3, y: -this.ay * a.back / 0.3 };
      [-0.22, 0, 0.22].forEach((o, i) => w.after(i * 0.06, () => { if (this.alive) w.projectile(this, { ang: o, range: a.kissRange, speed: 780, dmg, type: 'magic', vfx: 'magic_missile', scale: 1.8, tint: 0xff4fa3, r: 20 }); }));
      w.float(this.x, this.y - this.def.height - 30, '¡Muac!', '#ff9ad0');
      return;
    }
    if (k === 'p1') {   // dash through enemies
      const dmg = rk(a.dmg, rank) + this.atk * a.atkScale, dur = 0.22, pts = [{ x: this.x, y: this.y }, { x: this.x + this.ax * a.dist, y: this.y + this.ay * a.dist }];
      this.state = 'cast'; this.anim = 'power1'; this.stateT = 0; this.stateDur = dur + 0.1; this.fired = true; this.dashV = { x: this.ax * a.dist / dur, y: this.ay * a.dist / dur };
      let champ = false;
      w.enemiesOf(this).filter(t => w.nearPath(pts, t.x, t.y, a.width / 2 + BODY_R * 0.6)).forEach(t => { w.damage(this, t, dmg, 'physical'); w.vfx('spark', t.x, t.cy, { scale: 3, tint: 0xff4fa3 }); if (t.isChamp) champ = true; });
      for (let i = 0; i < 5; i++) w.vfx('spark', this.x + this.ax * a.dist * i / 5, this.y - 20, { scale: 1.8, tint: 0xff9ad0 });
      if (champ) { this.qRe = { t: a.recast }; this.cds.p1 = a.recastCd; }
    } else if (k === 'p2') {   // dance: charm the ones who look at her, slow the ones turned away
      const sh = rk(a.shield, rank); let n = 0;
      w.vfx('shockwave', this.x, this.y - 6, { scale: a.radius / 40, below: true, tint: 0xff4fa3 }); w.vfx('buff', this.x, this.cy, { scale: 3, tint: 0xff9ad0 });
      w.float(this.x, this.y - this.def.height - 34, 'Mírame bien, que no me repito.', '#ff9ad0');
      w.enemiesNear(this.team, this.x, this.y, a.radius).filter(t => t.isChamp).forEach(t => {
        if (this.lookedAtBy(t)) t.lureTo(this, rk(a.charm, rank)); else t.slow(a.slow, a.slowTime);
        n++; w.vfx('heal', t.x, t.cy - 20, { scale: 1.8, tint: 0xff4fa3 });
      });
      if (n) { this.shieldHp += sh * n; this.shieldT = Math.max(this.shieldT, a.shieldTime); w.vfx('shield', this.x, this.cy, { scale: 2.6, tint: 0xff9ad0, alpha: 0.7 }); }
    } else if (k === 'p3') {   // stiletto: front = slow, back = execute (missing health)
      const dmg = rk(a.dmg, rank) + this.atk * a.atkScale, pts = [{ x: this.x, y: this.y }, { x: this.x + this.ax * a.reach, y: this.y + this.ay * a.reach }];
      const t = w.enemiesOf(this).filter(q => w.nearPath(pts, q.x, q.y, a.width / 2 + BODY_R * 0.6)).sort(byDist)[0];
      w.vfx('punch', this.x + this.ax * a.reach * 0.7, this.y - 24, { scale: 3, tint: 0xff4fa3 });
      if (t) {
        const dx = t.x - this.x, dy = t.y - this.y, d = Math.hypot(dx, dy) || 1, behind = (t.ax * dx + t.ay * dy) / d > 0.3;   // his back is toward her
        w.damage(this, t, dmg, 'physical');
        if (behind) { w.damage(this, t, (t.maxHp - t.hp) * rk(a.backPct, rank), 'physical', true); w.float(t.x, t.y - t.def.height - 40, '¡POR LA ESPALDA!', '#ff4fa3'); w.vfx('shockwave', t.x, t.y - 6, { scale: 3, below: true, tint: 0xff4fa3 }); }
        else t.slow(a.slow, a.slowTime);
      }
    } else {   // R: invulnerable on a stage of lights (NOT invisible) with a ring on the ground, then a flash of cameras that robs half of the gold of every champion in the zone
      this.stunT = 0; this.silenceT = 0; this.rootT = 0; this.slows = []; this.poisons = []; this.blindT = 0; this.charmT = 0; this.lure = null;   // cleanse every control effect
      this.invulT = 1.0; const cx = this.x, cy = this.y;
      w.zoneDecal(cx, cy, a.radius, 0xff4fa3, 1.4); w.vfx('summon', cx, cy - 10, { scale: 4 }); w.vfx('levelup', cx, cy - 10, { scale: 5 }); w.float(cx, cy - this.def.height - 34, '¡Se prendió la farándula!', '#ffe27a');
      w.after(1.0, () => {
        if (!this.alive) return; this.invulT = 0;
        w.vfx('shockwave', this.x, this.y - 6, { scale: a.radius / 25, below: true, tint: 0xffffff }); w.vfx('levelup', this.x, this.y, { scale: 8, tint: 0xffffff });
        w.enemiesNear(this.team, this.x, this.y, a.radius).filter(t => t.isChamp).forEach(t => {
          t.blindT = Math.max(t.blindT, a.blind);
          const st = Math.floor(t.gold * a.steal); if (st > 0) { t.gold -= st; this.gold += st; w.float(t.x, t.y - t.def.height - 40, `-${st} oro`, '#ffd23f'); }
        });
        this.mana = this.maxMana; this.cdrT = a.cdrTime;
      });
    }
  }

  // ---- Maduro ----
  setSB(t) {   // transform into Súper Bigote for t seconds, or back to normal (t = 0)
    const on = t > 0, was = !!this.sb, still = !this.hasAnims && !this.dirFrames && this.spr;
    if (on) {
      this.sb = { t, armor: this.sb?.armor || 0, mr: this.sb?.mr || 0 };
      if (!was) { this.def = this.defSB; this.comboStep = 0; this.setSkin('maduro_sb'); if (still && this.w.textures.exists('ref_superbigote')) this.spr.setTexture('ref_superbigote'); }
    } else if (was) {
      this.sb = null; this.def = this.defN; this.comboStep = 0; this.speedT = 0; this.speedBoost = 0; this.setSkin('maduro'); if (still) this.spr.setTexture('ref_maduro');
    }
  }
  fireMaduro(k, a, rank) {
    const w = this.w, sb = !!this.sb;
    const line = L => [{ x: this.x, y: this.y }, { x: this.x + this.ax * L, y: this.y + this.ay * L }];
    const byDist = (p, q) => Math.hypot(p.x - this.x, p.y - this.y) - Math.hypot(q.x - this.x, q.y - this.y);
    if (k === 'ult') {   // Súper Bigote: global slow, speed, armour
      this.setSB(a.time); this.sb.armor = rk(a.armor, rank); this.sb.mr = rk(a.mr, rank); this.speedBoost = a.speed; this.speedT = a.time;
      const R = rk(a.radius, rank), P = rk(a.push, rank), D = rk(a.dmg, rank) + this.ap * a.apScale, col = [0xffffff, 0x4aa3ff, 0xff3a3a][Math.min(2, rank - 1)];   // white / blue / red shockwave
      for (let i = 0; i < 4; i++) w.after(i * 0.06, () => w.vfx('shockwave', this.x, this.y - 6, { scale: R / 40 * (0.55 + i * 0.25), below: true, tint: col }));
      w.vfx('levelup', this.x, this.y - 10, { scale: 5 }); w.vfx('buff', this.x, this.cy, { scale: 3.5, tint: col }); w.zoneDecal(this.x, this.y, R, col, 0.9);
      w.fighters.forEach(t => {   // everybody around is pushed back (allies too, without damage)
        if (t === this || !t.alive || t.away || t.isTower || t.def?.static || t.def?.bot === 'crate') return;
        const dx = t.x - this.x, dy = t.y - this.y, d = Math.hypot(dx, dy) || 1; if (d > R) return;
        const amt = P * (t.isChamp ? 1 : 0.6) * (1 - 0.35 * d / R); t.shove = { vx: dx / d * amt / 0.3, vy: dy / d * amt / 0.3, t: 0.3 }; t.carriedT = Math.max(t.carriedT || 0, 0.3);
        if (t.team !== this.team) { w.damage(this, t, D, 'magic'); w.vfx('spark', t.x, t.cy, { scale: 3, tint: col }); }
      });
      w.float(this.x, this.y - this.def.height - 50, '¡Con mi mano de hierro, destruiré el sabotaje enemigo!', '#ffe27a');
      w.showBanner?.({ title: '¡APARICIÓN DE SÚPER BIGOTE!', sub: 'La onda expansiva empuja a todos hacia atrás', team: this.baseTeam, face: w.faceOf?.(this) }, 2200);
      return;
    }
    if (k === 'p1' && !sb) {   // megaphone: damage + silence along a line (+ stun from rank 2); the waves are pale yellow / intense yellow / red
      const dmg = rk(a.dmg, rank) + this.ap * a.apScale, pts = line(a.length), col = [0xfff0b0, 0xffd000, 0xff2a2a][Math.min(2, rank - 1)], stun = rk(a.stun, rank);
      for (let i = 1; i <= 6; i++) w.vfx('shockwave', this.x + this.ax * a.length * i / 6, this.y + this.ay * a.length * i / 6 - 8, { scale: 1 + i * 0.35, tint: col, alpha: 0.9 });
      if (rank >= 3) for (let i = 1; i <= 8; i++) w.addStain(this.x + this.ax * a.length * i / 8, this.y + this.ay * a.length * i / 8, 38 + (i % 3) * 10, a.stainTime);   // red stains on the ground
      let champs = 0;
      w.enemiesOf(this).filter(t => w.nearPath(pts, t.x, t.y, a.width / 2 + BODY_R * 0.6)).sort(byDist).forEach(t => {
        w.damage(this, t, dmg, 'magic'); t.silenceT = Math.max(t.silenceT, a.silence); if (stun > 0 && !t.isTower && !t.def?.static) t.stun(stun);
        if (t.isChamp && ++champs === 2) t.slow(a.slowPct, a.slowTime);
        w.vfx('spark', t.x, t.cy, { scale: 2.5, tint: col });
      });
    } else if (k === 'p1') {   // Puño de hierro: fly forward and smash the ground; the first champion hit is stunned
      const dmg = rk(a.dmg, rank) + this.atk * a.atkScale, dur = 0.2, pts = line(a.dist + 70);
      const tgt = w.enemiesOf(this).filter(t => t.isChamp && w.nearPath(pts, t.x, t.y, 38)).sort(byDist)[0];
      const trav = tgt ? Math.max(0, Math.min(a.dist, Math.hypot(tgt.x - this.x, tgt.y - this.y) - 62)) : a.dist;
      this.state = 'cast'; this.anim = 'power1'; this.stateT = 0; this.stateDur = dur + 0.2; this.fired = true; this.dashV = { x: this.ax * trav / dur, y: this.ay * trav / dur };
      w.float(this.x, this.y - this.def.height - 34, '¡Toma dosis de patria!', '#ff7a5a');
      w.after(dur, () => {
        if (!this.alive) return; const ix = this.x + this.ax * 50, iy = this.y + this.ay * 50;
        w.vfx('shockwave', ix, iy, { scale: 4, below: true, tint: 0xff7a5a }); w.vfx('punch', ix, iy - 20, { scale: 5 });
        if (tgt?.alive) { w.damage(this, tgt, dmg, 'physical'); tgt.stun(a.stun); }
        w.enemiesNear(this.team, ix, iy, a.radius).filter(t => t !== tgt).forEach(t => w.damage(this, t, dmg * a.splash, 'physical'));
      });
    } else if (k === 'p2' && !sb) {   // bodyguards: 2 appear instantly, more come over time up to the cap (see guardTick)
      for (let i = 0; i < a.initial; i++) this.spawnGuard(); this.guardT = rk(a.interval, rank);
      w.vfx('shockwave', this.x, this.y - 6, { scale: 4, below: true, tint: 0x7ee0ff });
    } else if (k === 'p2') {   // Escudo antimperialista: blocks the first hit / CC, then bursts
      this.sShield = { t: rk(a.time, rank), r: a.radius, mult: a.burst, base: a.base };
      w.vfx('shield', this.x, this.cy, { scale: 3, tint: 0x66b0ff, alpha: 0.8 }); w.vfx('shockwave', this.x, this.y - 6, { scale: 3, below: true, tint: 0x66b0ff });
    } else if (k === 'p3' && !sb) {   // the box is thrown, lands and stays on the map (see World.throwBox)
      const c = this.castPoint || w.aiPoint(this, a.range); this.castPoint = null; w.throwBox(this, c, a, rank);
    } else {   // Mano de hierro: grabs the first enemy on the line, pulls him in and breaks his armour
      const dmg = rk(a.dmg, rank) + this.atk * a.atkScale, pts = line(a.range);
      const tgt = w.enemiesOf(this).filter(t => w.nearPath(pts, t.x, t.y, a.width / 2 + BODY_R * 0.6)).sort((p, q) => (q.isChamp ? 1 : 0) - (p.isChamp ? 1 : 0) || byDist(p, q))[0];
      const end = tgt ? Math.hypot(tgt.x - this.x, tgt.y - this.y) : a.range;
      for (let i = 1; i <= 8; i++) w.vfx('spark', this.x + this.ax * end * i / 8, this.y + this.ay * end * i / 8 - 14, { scale: 1.6, tint: 0xc0c8d8 });
      if (tgt) { w.damage(this, tgt, dmg, 'physical'); tgt.armorShred = a.shred; tgt.armorShredT = a.shredTime; if (tgt.isChamp) tgt.pullMe = { by: this, t: 0.7 }; w.vfx('punch', tgt.x, tgt.cy, { scale: 4 }); }
    }
  }

  fireAbility(k, a, rank) {
    const w = this.w;
    w.audio.ability(this, k);
    if (this.duo) return this.fireJosue(k, a, rank);   // josue.js
    if (this.key === 'leandro' && a.v) return this.fireLeandroB(k, a, rank);
    if (this.key === 'julio' && (k !== 'ult' || a.v)) return this.fireJulio(k, a, rank);   // julio.js
    switch (this.key + ':' + k) {
      case 'diosa:p1': case 'diosa:p2': case 'diosa:p3': case 'diosa:ult': this.fireDiosa(k, a, rank); break;
      case 'maduro:p1': case 'maduro:p2': case 'maduro:p3': case 'maduro:ult': this.fireMaduro(k, a, rank); break;
      case 'leandro:p1': {
        const dmg = rk(a.dmg, rank) + this.ap * a.apScale, stun = rk(a.stun, rank);
        const c = this.castPoint || w.aiPoint(this, a.range); this.castPoint = null;
        const rad = rk(a.radius, rank);   // the zone grows with the level
        w.zoneDecal(c.x, c.y, rad, 0x7dff5a, 1.6);
        w.cacti(c.x, c.y, rad);
        w.after(0.25, () => w.enemiesNear(this.team, c.x, c.y, rad).forEach(t => { w.damage(this, t, dmg, 'magic'); t.stun(stun); }));
        break;
      }
      case 'leandro:p2': {   // contracts fan out toward the front; each one that hits an enemy infects the area around it
        const n = rk(a.count, rank), rad = rk(a.areaRadius, rank), life = rk(a.areaLife, rank), dmg = rk(a.dmg, rank) + this.ap * a.apScale, total = dmg * a.poisonRatio;   // the poison of each contract is half of that contract's impact damage
        for (let i = 0; i < n; i++) {
          const ang = n > 1 ? (i / (n - 1) - 0.5) * a.spread : 0;
          w.projectile(this, {
            ang, speed: a.speed, range: rk(a.reach, rank), dmg, type: 'magic', obj: 'contract', spin: true, scale: 0.13, r: 18,
            onImpact: (x, y) => w.infectZone(this, x, y, rad, life, total),
          });
        }
        break;
      }
      case 'leandro:p3':
        {
        const c = this.castPoint || { x: this.x + this.ax * a.offset, y: this.y + this.ay * a.offset };
        this.castPoint = null;
        w.tires(this, c.x, c.y, rk(a.life, rank), rk(a.size, rank), rk(a.hp, rank));
      }
        break;
      case 'leandro:ult': {
        w.vfx('summon', this.x, this.y - 10, { scale: 4 });
        w.summonBots(this, { melee: rk(a.melee, rank), ranged: rk(a.ranged, rank) }, a.life, a.botApScale * this.ap, 1 + this.ap / 100 * a.botHpScale);   // the more AI power Leandro has, the more damage AND health his bots have
        break;
      }
      case 'julio:ult': {   // ink rain on every enemy champion, up to N rounds, 1s apart
        const dmg = rk(a.dmg, rank) + this.ap * a.apScale, rounds = rk(a.drops, rank);
        w.float(this.x, this.y - this.def.height - 34, '¡Lluvia de tinta!', '#a58cff');
        for (let i = 0; i < rounds; i++) w.after(i * 1.0, () => {
          if (!this.alive) return;
          w.fighters.filter(f => f.alive && f.isChamp && f.team !== this.team).forEach(t => w.inkDrop(this, t.x, t.y, a.radius, dmg));
        });
        break;
      }
      case 'hector:p1':   // protein: heal over time until he takes any damage
        w.markSrc(this, 'protein');
        this.protein = { t: a.maxTime, hps: rk(a.hps, rank) + rk(a.hpPct, rank) * this.maxHp, tick: 0 };
        w.vfx('heal', this.x, this.cy, { scale: 4, tint: 0x66ff99 });
        break;
      case 'hector:p2':
        w.chainShot(this, a, rank);
        break;
      case 'hector:p3':   // protective gear: shield scaled by max HP
        w.markSrc(this, 'shield');
        this.shieldHp = rk(a.shieldFlat, rank) + rk(a.shieldPct, rank) * this.maxHp + rk(a.shieldArmor, rank) * this.armor; this.shieldT = rk(a.time, rank);
        w.float(this.x, this.y - this.def.height - 34, `Escudo ${Math.round(this.shieldHp)}`, '#7ee0ff');
        break;
      case 'hector:ult': {   // mounts the bike: it always moves forward, slow at first and accelerating; he steers it freely until it vanishes
        const mv = Math.hypot(this.in.mx, this.in.my), dx = mv > 0 ? this.in.mx / mv : this.ax, dy = mv > 0 ? this.in.my / mv : this.ay;
        this.setSkin('hector_bike'); this.state = 'run'; this.stateDur = 0; this.playAnim('run'); this.pending = null;
        this.ride = { t: rk(a.life, rank), T: rk(a.life, rank), age: 0, a, ramp: a.ramp, v0: a.startSpeed, v1: rk(a.maxSpeed, rank), dx, dy, hit: new Map(), dmg: rk(a.dmg, rank) + this.atk * a.atkScale, stun: rk(a.stun, rank), fire: rk(a.fireDmg, rank) + this.atk * 0.25, fireTime: a.fireTime, lx: this.x, ly: this.y };
        w.vfx('shockwave', this.x, this.y - 10, { scale: 3, below: true, tint: 0xff7a3a });
        break;
      }
      case 'eliud:p1': {   // grenade egg: lobbed, explodes after a fuse
        const c = this.castPoint || w.aiPoint(this, a.range); this.castPoint = null;
        w.eggGrenade(this, c.x, c.y, rk(a.dmg, rank) + this.atk * a.atkScale, a.radius, rk(a.fuse, rank));
        this.addRage(this.def.hen.rageSkill);
        break;
      }
      case 'eliud:p2': {   // egg trap field
        const c = this.castPoint || w.aiPoint(this, a.range); this.castPoint = null;
        w.eggTrap(this, c.x, c.y, rk(a.eggs, rank), a.radius, rk(a.dmg, rank) + this.atk * a.atkScale, a.life);
        this.addRage(this.def.hen.rageSkill);
        break;
      }
      case 'eliud:p3':   // spear: pierces, bonus damage by distance, sticks in the ground (pick it up to reset the cooldown)
        w.spearThrow(this, a, rank);
        this.addRage(this.def.hen.rageSkill);
        break;
      case 'eliud:ult': {   // packages fall from the sky
        const c = this.castPoint || w.aiPoint(this, a.range); this.castPoint = null;
        w.packageDrop(this, c.x, c.y, rk(a.packages, rank), a.life, rk(a.effectTime, rank), rk(a.effectPower, rank));
        break;
      }
      case 'luis:p1': {   // antivirus robots (replace the previous ones)
        if (w.net?.role === 'client') break;
        w.fighters.forEach(f => { if (f.antivirus && f.owner === this) f.dispose = true; });
        const n = rk(a.robots, rank), dmg = rk(a.dmg, rank) + this.ap * a.apScale;
        for (let i = 0; i < n; i++) {
          const slot = { x: -this.facing * (95 + i * 36), y: (i % 2 ? 1 : -1) * (55 + (i >> 1) * 30) };
          const b = new Fighter(w, 'drone', this.team, this.x + slot.x, this.y + slot.y, { ai: true, owner: this, life: Infinity, botAp: dmg, slot, antivirus: true });
          w.fighters.push(b); w.vfx('summon', b.x, b.y - 10, { scale: 2.2, below: true });
        }
        break;
      }
      case 'yonaiker:p1': this.gun = !this.gun; if (this.bomber) this.bomber.gunT = 0; w.float(this.x, this.y - this.def.height - 34, this.gun ? '¡AMETRALLADORA!' : 'Ametralladora apagada', '#ffd23f'); break;
      case 'yonaiker:p2':
        if (this.bomber) { this.cds.p2 = rk(a.crateCd, rank); w.callCrates(this, a, rank); }   // aboard the ship: supply crates on the reticle (own cooldown)
        else { const c = this.castPoint || w.aiPoint(this, a.range); this.castPoint = null; w.smokeGrenade(this, c.x, c.y, a, rank); }
        break;
      case 'yonaiker:ult': w.smokeScreen(this, a, rank); break;
      case 'junior:p1': w.anchorDrag(this, a, rank); break;   // lunge: Junior dashes forward carrying every enemy champion he reaches
      case 'junior:p2': {   // somersault dash, then a shield
        const dist = rk(a.dist, rank), dur = this.stateDur || 0.38;
        this.dashV = { x: this.ax * dist / dur, y: this.ay * dist / dur }; this.dashShield = { sh: rk(a.shield, rank) + this.maxHp * a.shieldHpPct, t: rk(a.time, rank) };
        break;
      }
      case 'junior:p3': this.flame = { t: a.active, T: a.active, a, rank, tick: 0 }; w.float(this.x, this.y - this.def.height - 34, '¡LANZALLAMAS!', '#ff9a4a'); break;
      case 'junior:ult': { const c = this.castPoint || w.aiPoint(this, a.range); this.castPoint = null; w.startBombardment(this, c.x, c.y, rk(a.radius, rank), rk(a.time, rank), rk(a.dmg, rank) + this.atk * a.atkScale, a); break; }
      case 'luis:p2':   // invisibility with a silhouette trail
        w.markSrc(this, 'invis');
        this.invis = { t: Infinity, trail: 0.15 };
        w.vfx('buff', this.x, this.cy, { scale: 4, tint: 0x66ffcc });
        break;
      case 'luis:p3':   // silence aura that follows Luis
        w.zones.push({ ctx: w.castCtx, kind: 'hack', owner: this, t: rk(a.duration, rank), r: rk(a.radius, rank), free: new Set(), decal: null });
        w.vfx('levelup', this.x, this.y - 10, { scale: 4, below: true, tint: 0x33ff88 });
        break;
      case 'luis:ult': {   // take over an enemy champion
        const t = w.pickTarget(this, a.range, this.castPoint || this); this.castPoint = null;
        if (!t) { w.float(this.x, this.y - this.def.height - 30, 'sin objetivo', '#ff9a7a'); this.cds.ult = 1; this.mana += rk(a.mana, rank); break; }
        w.startControl(this, t, rk(a.control, rank));
        break;
      }
      case 'axel:p1': {   // random malware laptop
        const type = this.malware || 'virus', col = { virus: 0xc77dff, trojan: 0xff5a4a, worm: 0x7dff5a }[type];
        w.float(this.x, this.y - this.def.height - 34, { virus: 'VIRUS', trojan: 'TROYANO', worm: 'GUSANO' }[type], '#' + col.toString(16).padStart(6, '0'));
        const dmg = rk(a.dmg, rank) + this.ap * a.apScale;
        w.projectile(this, { range: 900, speed: a.speed, dmg: 0, type: 'magic', obj: 'laptop_' + type, spin: true, scale: 0.2, r: 20, noDamage: true,
          onImpact: (x, y) => {
            w.audio.playAll('ev_axel_' + type, { at: { x, y }, vol: 0.95, gap: 0 });
            w.vfx('spark', x, y - 20, { scale: 4, tint: col });
            const life = rk(a.zoneLife, rank), self = this;
            const apply = (t, first) => {   // first = just entered the zone
              if (type === 'trojan') w.damage(self, t, first ? dmg : dmg * 0.35, 'magic');
              else if (type === 'virus') {
                if (first) { w.damage(self, t, dmg * 0.35, 'magic'); t.poison(dmg * 0.65 / a.poisonTime, a.poisonTime, self); w.float(t.x, t.y - t.def.height - 28, 'SILENCIADO', '#c77dff'); }
                t.silenceT = Math.max(t.silenceT, Math.max(0.9, rk(a.silence, rank) * 0.7)); w.markSrc(t, 'silence'); t.slow(rk(a.slow, rank), 1.2);
              }   // worm: its blindness comes from the purple blind zone created below (only while they stand in it)
            };
            w.zones.push({ ctx: w.castCtx, kind: 'malware', owner: this, x, y, r: a.radius, t: life, type, col, apply, first: new Set(), cd: new Map(), decal: null, icon: null });
            if (type === 'worm') w.blindZone(this, x, y, a.radius, life);
          } });
        break;
      }
      case 'axel:p2': {   // healing zone that follows him
        w.zones.push({ ctx: w.castCtx, owner: this, t: rk(a.life, rank), r: rk(a.radius, rank), hps: rk(a.hps, rank) + this.ap * a.apScale, tick: 0, decal: null });
        w.vfx('heal', this.x, this.cy, { scale: 5 });
        break;
      }
      case 'axel:p3': {   // Canaima laptop: a black hole that drags nearby enemies to its centre, then explodes
        const c = this.castPoint || w.aiPoint(this, a.range); this.castPoint = null;
        w.blackHole(this, c.x, c.y, rk(a.radius, rank), rk(a.life, rank), a.pull, rk(a.dmg, rank) + this.ap * a.apScale);
        break;
      }
      case 'axel:ult': {   // enemies in the area switch sides, fight their own team, cannot cast
        const c = this.castPoint || w.aiPoint(this, a.range); this.castPoint = null;
        const r = rk(a.radius, rank), tm = rk(a.charm, rank);
        w.zoneDecal(c.x, c.y, r, 0xffd23f, 1.8);
        w.vfx('levelup', c.x, c.y - 10, { scale: 6, below: true });
        
        w.after(0.2, () => w.fighters.filter(f => f.alive && f.team !== this.team && !f.isTower && Math.hypot(f.x - c.x, f.y - c.y) <= r).forEach(f => {
          w.castCtx = { f: this, k: 'ult' }; w.markSrc(f, 'charm'); w.castCtx = null;
          f.charmT = tm; f.team = this.team; f.pending = null; f.stunT = 0; if (f.state === 'cast') { f.state = 'idle'; f.playAnim('idle'); }
          w.float(f.x, f.y - f.def.height - 28, '¡ALIADO!', '#ffd23f');
        }));
        break;
      }
      case 'jorbi:p1': {   // trapezoid of banknotes in front: damage + slow
        const dmg = rk(a.dmg, rank) + this.atk * a.atkScale, slow = rk(a.slow, rank), L = a.length, hits = [];
        for (const t of w.enemiesOf(this)) {
          const dx = t.x - this.x, dy = t.y - this.y, u = dx * this.ax + dy * this.ay, v = Math.abs(-dx * this.ay + dy * this.ax);
          if (u >= -20 && u <= L + BODY_R && v <= (a.nearW + (a.farW - a.nearW) * Math.max(0, Math.min(1, u / L))) / 2 + BODY_R * 0.6) hits.push(t);
        }
        hits.forEach(t => { w.damage(this, t, dmg, 'physical'); t.slow(slow, a.slowTime); });
        w.moneyBurst(this, L, a.nearW, a.farW);
        break;
      }
      case 'jorbi:ult': {   // 15 Minutos más: rewinds minions and champions 5 s, then shields/speeds allies and slows enemies
        w.zoneDecal(this.x, this.y - 6, 120, 0x66d0ff, 1.2);
        w.vfx('shockwave', this.x, this.y - 10, { scale: 5, below: true, tint: 0x66d0ff });
        w.float(this.x, this.y - this.def.height - 34, '¡15 MINUTOS MÁS!', '#7ee0ff');
        w.startRewind(this, a, rank);
        break;
      }
      case 'xeviche:p1': {   // fast volley of lego bricks: more pieces and damage per rank
        const n = rk(a.pieces, rank), dmg = rk(a.dmg, rank) + this.ap * a.apScale;
        for (let i = 0; i < n; i++) w.after(i * a.gap, () => {
          if (!this.alive || this.stunT > 0) return;
          const obj = 'lego_' + (1 + (i % 4)), has = w.textures.exists(obj);
          w.projectile(this, { ang: (Math.random() - 0.5) * 0.22, speed: a.speed, dmg, type: 'magic', obj: has ? obj : null, vfx: 'rock_throw', scale: has ? 0.1 : 1.6, tint: has ? null : [0xff3b30, 0x3b8cff, 0xffd23f, 0x5dff8a][i % 4], spin: true, r: 11, range: 640 });
        });
        break;
      }
      case 'xeviche:p3': {   // heart: the enemy hit walks to Xeviche, out of control
        const dmg = rk(a.dmg, rank) + this.ap * a.apScale, tm = rk(a.lure, rank), has = w.textures.exists('heart');
        w.projectile(this, { range: a.range, speed: a.speed, dmg, type: 'magic', obj: has ? 'heart' : null, vfx: 'magic_missile', scale: has ? 0.13 : 2.6, tint: has ? null : 0xff3b60, r: 24, onHit: t => t.lureTo(this, tm) });
        break;
      }
      case 'xeviche:ult': {   // Karis Harem: three helpers fire one piercing beam; Xeviche is rooted meanwhile
        const T = rk(a.time, rank);
        this.stateT = 0; this.stateDur = T + 0.4;
        w.startHarem(this, a, rank, T);
        break;
      }
    }
  }

  unitAttack() {
    const a = this.def.attack, w = this.w, t = w.nearestEnemy(this, this.def.stats.range + 40);
    if (!t) return;
    this.setAim(t.x - this.x, t.y - this.y);
    w.audio.attack(this);
    if (this.isMinion && this.key.includes('blue') && Math.random() < 0.07) w.audio.play('minion_grunt', { at: this, vol: 0.45, gap: 400 });   // only the human soldiers shout; robots stay quiet
    if (this.isTower) w.vfx('spark', this.x + this.ax * 70, this.y + this.ay * 40 - this.def.height * 0.5, { scale: 2.6 });
    const dm = this.dmgMult || 1;
    if (a.type === 'melee') { w.damage(this, t, a.dmg * dm, a.dmgType); w.vfx('spark', t.x, t.cy, { scale: 2.2 }); }
    else w.projectile(this, { range: this.def.stats.range + 60, speed: a.proj.speed, dmg: a.dmg * dm, type: a.dmgType, vfx: a.proj.vfx, scale: a.proj.scale, tint: a.proj.tint, r: a.proj.r });
  }

  botAttack() {
    this.w.audio.attack(this);
    if (this.def.pal) return this.palAttack();   // Josué's partner
    if (this.antivirus) { if (this.owner?.invis) return; const lt = this.owner?.lastTarget, t = lt?.alive && !lt.away && Math.hypot(lt.x - this.x, lt.y - this.y) < 750 ? lt : this.w.nearestEnemy(this, 400); if (t?.alive && !t.away) { this.setAim(t.x - this.x, t.y - this.y); this.w.laser(this, t, this.botAp); } return; }
    const t = this.w.nearestEnemy(this, this.def.stats.range + 40);
    if (!t) return;
    this.setAim(t.x - this.x, t.y - this.y);
    if (this.def.bot === 'melee') {
      this.w.damage(this, t, this.botAp, this.def.phys ? 'physical' : 'magic');
      this.w.vfx('spark', t.x, t.cy, { scale: this.def.guard ? 2.2 : 1.6, tint: this.def.guard ? 0xffffff : 0xb8e06a });
    } else {
      if (this.def.static) { this.fireT = this.def.rapid ? 0.3 : 0.45; if (!this.def.rapid) this.w.vfx('spark', this.x + this.ax * (this.def.height * 0.55), this.y - this.def.height * 0.55, { scale: 1.8, tint: 0x9ff0ff }); }   // muzzle flash + the 'firing' picture for a moment
      if (this.def.rapid) { const sp = (Math.random() - 0.5) * 0.06, c = Math.cos(sp), sn = Math.sin(sp), ox = this.ax, oy = this.ay; this.ax = ox * c - oy * sn; this.ay = ox * sn + oy * c; this.w.projectile(this, { range: this.def.stats.range + 60, speed: 1100, dmg: this.botAp, type: 'physical', vfx: 'bullet_tracer', scale: 1.0, r: 8 }); this.ax = ox; this.ay = oy; }
      else if (this.def.phys) this.w.projectile(this, { range: this.def.stats.range + 60, speed: 700, dmg: this.botAp, type: 'physical', vfx: 'bullet_tracer', scale: 1.3, r: 10 });
      else this.w.projectile(this, { range: this.def.stats.range + 60, speed: 420, dmg: this.botAp, type: 'magic', vfx: 'energy_bolt', scale: 1.6, tint: 0x66ffcc, r: 12 });
    }
  }

  // Yonaiker: on foot only F works; aboard the ship F is off and Q / E / R work
  abilityLocked(k) { if (this.key !== 'yonaiker') return false; const fly = this.bomber?.phase === 'fly'; return k === 'p2' ? false : !fly; }   // F smoke (foot) / crates (aboard); Q gun, E missiles and R smoke screen only aboard the ship

  drawShield() {   // life shield: a white holographic light rising from the ground circle, fading out toward the top (stacked ellipses: curved, no hard edges)
    const w = this.w, on = this.shieldHp > 0 && this.alive && !this.hiddenFor(w.player);
    if (!on) { this.shieldG?.setVisible(false); return; }
    const g = (this.shieldG ||= w.add.graphics()), t = w.time.now, h = this.def.height, rx = h * 0.34, ry = rx * 0.4, N = 34, top = h * 1.1, step = top / N, pulse = 0.85 + 0.15 * Math.sin(t / 170);
    g.setVisible(true).clear().setDepth(this.y + 1).setBlendMode('ADD');
    const gold = this.inkSh ? this.inkSh.rank : 0, col = gold ? 0xffc83a : 0xffffff;   // golden ink shield: thicker (more layers, a solid rim) with rank
    if (gold) { g.fillStyle(0xffd23f, 0.1 + 0.07 * gold).fillEllipse(this.x, this.y - h * 0.5, rx * 2.3, h * 1.0); g.lineStyle(1 + gold, 0xfff0a0, 0.55 + 0.1 * gold).strokeEllipse(this.x, this.y - h * 0.5, rx * 2.3, h * 1.0); }
    for (let k = 0; k < N; k++) g.fillStyle(col, (1 - k / N) ** 1.3 * (0.07 + 0.03 * gold) * pulse).fillEllipse(this.x, this.y - k * step, rx * 2, ry * 2);
    for (let i = 0; i < 2; i++) { const ph = ((t / 2400) + i / 2) % 1; g.lineStyle(1, 0xdff2ff, 0.45 * (1 - ph)).strokeEllipse(this.x, this.y - ph * top, rx * 1.9, ry * 1.9); }   // curved bands rising and fading
  }
  drawStun() {   // stunned champion: two little pixel birds circling the head (behind it on the far side) and the word STUN
    const w = this.w, on = this.isChamp && this.alive && this.stunT > 0 && !this.hiddenFor(w.player);
    if (!on) { this.stunBirds?.forEach(b => b.setVisible(false)); this.stunTxt?.setVisible(false); return; }
    const t = w.time.now, h = this.def.height, cx = this.x, cy = this.y - h + 6;
    const bs = (this.stunBirds ||= [0, 1].map(() => w.add.image(0, 0, 'bird_a').setScale(0.8)));
    bs.forEach((b, i) => {
      const a = t / 320 + i * Math.PI, d = Math.cos(a) >= 0 ? 1 : -1, back = Math.sin(a) < 0;
      b.setVisible(true).setTexture(Math.floor(t / 110 + i) % 2 ? 'bird_a' : 'bird_b').setFlipX(d < 0).setPosition(cx + Math.cos(a) * 22, cy + Math.sin(a) * 7 - 2 + Math.sin(t / 90 + i) * 1).setDepth(back ? this.y - 1 : this.y + 5).setAngle(d * 4);
    });
    const tx = (this.stunTxt ||= w.add.text(0, 0, 'STUN', { fontFamily: 'monospace', fontSize: '14px', fontStyle: 'bold', color: '#ffe27a', stroke: '#000', strokeThickness: 4 }).setOrigin(0, 0.5));
    tx.setVisible(true).setPosition(cx + 36, cy - 6).setDepth(this.y + 6);
  }
  get poisoned() { return this.poisons.some(p => !p.burn); }
  get burning() { return this.poisons.some(p => p.burn); }
  get slowed() { return this.slows.length > 0; }
  drawPoison() {   // poisoned champion: toxic puddle aura on the ground around the feet, with bubbles rising
    const w = this.w, on = this.isChamp && this.alive && this.poisoned && !this.hiddenFor(w.player);
    if (!on) { this.poisonG?.setVisible(false); return; }
    const g = (this.poisonG ||= w.add.graphics()), t = w.time.now, rx = this.def.height * 0.5, ry = rx * 0.4;
    g.setVisible(true).clear().setDepth(this.y - 3);
    g.fillStyle(0x4fbf3a, 0.28 + 0.08 * Math.sin(t / 220)).fillEllipse(this.x, this.y, rx * 2, ry * 2).lineStyle(3, 0x9be37a, 0.75).strokeEllipse(this.x, this.y, rx * 2, ry * 2);
    g.lineStyle(2, 0x2f8f2a, 0.6).strokeEllipse(this.x, this.y, rx * 1.3, ry * 1.3);
    for (let i = 0; i < 7; i++) { const ph = ((t / 900) + i * 0.29) % 1, a = i * 2.4 + t / 1500; g.fillStyle(0xb8ff9a, 0.7 * (1 - ph)).fillCircle(this.x + Math.cos(a) * rx * 0.75, this.y + Math.sin(a) * ry * 0.75 - ph * this.def.height * 0.5, 3 + 2 * (1 - ph)); }
  }

  /* ---------- Xeviche: Arepa reina pepiada (passive shield) ---------- */
  get arepaUp() { return this.key === 'xeviche' && this.ranks.p2 > 0 && this.cds.p2 <= 0 && this.alive; }
  // the shield swallows the first basic attack / ability / crowd control: it breaks and recharges; effects of that same hit are ignored too
  arepaBlocks() {
    if (this.arepaGrace > 0) return true;
    if (!this.arepaUp) return false;
    this.cds.p2 = rk(this.def.abilities.p2.cd, this.ranks.p2); this.arepaGrace = 0.25;
    this.w.vfx('shield', this.x, this.cy, { scale: 4, tint: 0x66e0ff }); this.w.float(this.x, this.y - this.def.height - 30, 'ESCUDO ROTO', '#7ee0ff'); this.w.audio.play('block', { at: this, vol: 0.7, gap: 80 });
    return true;
  }
  lureTo(src, t) {   // "Una bonita sonrisita": the target walks slowly to the caster and cannot act
    if (!this.alive || this.isTower || this.arepaBlocks()) return;
    this.lure = { src, t }; this.pending = null; if (this.state === 'cast') { this.state = 'idle'; this.playAnim('idle'); }
    this.w.float(this.x, this.y - this.def.height - 30, '♥', '#ff3b60'); this.w.markSrc(this, 'charm');
  }
  drawArepa() {   // yellow aura rising from his feet while the shield is up: a halo around the silhouette plus light streaks lifting off the ground ring
    const w = this.w, on = this.arepaUp && !this.hiddenFor(w.player) && !this.invis;
    if (!on) { this.auraG?.setVisible(false); this.auraSpr?.setVisible(false); return; }
    const spr = this.spr, t = w.time.now, h = this.def.height, g = (this.auraG ||= w.add.graphics());
    g.setVisible(true).clear().setDepth(this.y - 1).setBlendMode('ADD');
    const rx = h * 0.36, ry = rx * 0.4;
    for (let i = 0; i < 16; i++) {   // streaks: start on the feet ring and climb, fading out
      const a = (i / 16) * Math.PI * 2 + t / 900, ph = (t / 600 + i * 0.37) % 1, bx = this.x + Math.cos(a) * rx, by = this.y + Math.sin(a) * ry, len = h * (0.55 + 0.5 * Math.sin(i * 1.7 + t / 400) ** 2);
      for (let k = 0; k < 5; k++) { const y0 = by - len * (k / 5) * (0.6 + ph * 0.5), y1 = by - len * ((k + 1) / 5) * (0.6 + ph * 0.5); g.lineStyle(3 - k * 0.4, 0xffd23f, 0.5 * (1 - k / 5)).lineBetween(bx, y0, bx + Math.sin(t / 300 + i) * 2, y1); }
    }
    g.lineStyle(2, 0xfff0a0, 0.55).strokeEllipse(this.x, this.y, rx * 2, ry * 2);   // glowing ring on the ground
    const s2 = (this.auraSpr ||= w.add.sprite(0, 0, spr.texture.key).setBlendMode('ADD').setTint(0xffd23f));
    s2.setVisible(true).setTexture(spr.texture.key, spr.frame.name).setOrigin(spr.originX, spr.originY).setPosition(spr.x, spr.y).setScale(spr.scaleX * 1.12, spr.scaleY * 1.08).setFlipX(spr.flipX).setDepth(spr.depth - 0.5).setAlpha(0.3 + 0.12 * Math.sin(t / 180));
  }

  /* ---------- status ---------- */
  stun(t) {
    if (!this.alive || this.isTower || this.arepaBlocks()) return;
    if (this.invulT > 0) return;
    if (this.sShield && this.w.sShieldBlock(this, 0)) return;
    this.stunT = Math.max(this.stunT, t); this.state = 'stun'; this.pending = null; this.w.markSrc(this, 'stun');
    this.w.audio.play('stun', { at: this, vol: 0.8 });
  }
  slow(pct, t) {
    if (this.isTower || this.arepaBlocks()) return;
    if (this.invulT > 0) return;
    if (this.sShield && this.w.sShieldBlock(this, 0)) return; this.slows.push({ pct, t }); this.w.markSrc(this, 'slow'); }
  poison(dps, t, src, type, key) {   // `key` = refreshed instead of stacked (smoke clouds)
    if (this.isTower) return;
    const q = key && this.poisons.find(p => p.key === key && p.src === src); if (q) { q.t = Math.max(q.t, t); q.dps = Math.max(q.dps, dps); return; }
    this.poisons.push({ dps, t, src, tick: 0, type, key }); this.w.markSrc(this, 'poison'); }
  burn(dps, t, src, type = 'physical', key = null) {   // fire: damage over time (physical unless told otherwise), refreshed (not stacked) by the same source and kind
    if (this.isTower || this.arepaBlocks()) return; const b = this.poisons.find(p => p.burn && p.src === src && p.key === key); if (b) { b.t = Math.max(b.t, t); b.dps = Math.max(b.dps, dps); return; }
    this.poisons.push({ dps, t, src, tick: 0, type, burn: true, key }); }
  // active effects for the HUD status bar: [{id, name, sub, icon, t (seconds, null = no timer), bad, desc}]
  statusList() {
    const L = [], me = this, add = (id, label, t, bad, desc, extra = {}) => {
      const sr = me.srcs?.[id] || null;
      L.push({ id, label, t, bad, count: extra.count || 0, icon: sr?.icon || extra.icon || null, name: sr ? sr.name : (extra.name || label), by: sr ? sr.champ : (extra.by || null), desc: sr ? sr.desc : (extra.desc || desc), tint: extra.tint || (bad ? 0xff5a5a : 0x5dff8a) });
    };
    if (this.arepaUp) add('invul', 'Invulnerable', null, false, 'Ningún ataque ni habilidad te afecta: el escudo se rompe con el primero y se recarga.', { icon: 'icon_invul', name: 'Invulnerable', tint: 0xffd23f });
    if (this.rootT > 0) add('root', 'Atrapado', this.rootT, true, 'No puedes moverte, pero sí atacar y usar poderes.', { icon: 'icon_yonaiker_p2', name: 'Trampa invisible', by: 'Yonaiker' });
    if (this.stunT > 0) add('stun', 'Aturdido', this.stunT, true, 'No puedes moverte, atacar ni usar poderes.');
    if (this.silenceT > 0) add('silence', 'Silenciado', this.silenceT, true, 'No puedes usar poderes.');
    if (this.blindT > 0) add('blind', 'Cegado', this.blindT, true, 'Tu visión se reduce a una zona pequeña a tu alrededor. Recuperas la vista al salir del círculo morado.', { icon: 'icon_blind', name: 'Cegado', tint: 0xb070ff });
    if (this.lure) add('lure', 'Hechizado', this.lure.t, true, 'Caminas hacia Xeviche y no puedes atacar ni usar poderes.', { icon: 'icon_charm', name: 'Hechizado', by: this.lure.src?.def?.name || 'Xeviche', tint: 0xff5a9a });
    if (this.charmT > 0) add('charm', 'Controlado', this.charmT, true, 'Luchas para el enemigo y no puedes usar poderes.');
    if (this.invulT > 0) add('invul2', 'Invulnerable', this.invulT, false, 'Ningún daño ni control de masas te afecta.', { tint: 0xffd23f });
    if (this.cdrT > 0) add('cdr', 'Show principal', this.cdrT, false, 'Tus habilidades se recargan el doble de rápido.', { tint: 0xff4fa3 });
    if (this.qRe) add('qre', 'Pose de portada', this.qRe.t, false, 'Pulsa Q otra vez: voltereta hacia atrás y ráfaga de besos.', { tint: 0xff4fa3 });
    if (this.sb) add('sb', 'Súper Bigote', this.sb.t, false, 'Más velocidad y armadura; tus poderes son ofensivos y tus ataques son puñetazos.', { tint: 0xff4a3a });
    if (this.drT > 0) add('dr', 'Colectivo protector', this.drT, false, `Recibes un ${Math.round(this.drPct * 100)} % menos de daño.`, { tint: 0x7ee0ff });
    if (this.sShield) add('sshield', 'Escudo antimperialista', this.sShield.t, false, 'Bloquea el primer ataque o control de masas que te golpee.', { tint: 0x66b0ff });
    if (this.atkSlowT > 0 && this.atkSlowSrc === 'supply') add('supply', 'Desabastecimiento', this.atkSlowT, true, 'Menos velocidad de ataque y de curación.', { tint: 0xffb040 });
    if (this.armorShredT > 0) add('shred', 'Armadura rota', this.armorShredT, true, `Tu armadura se reduce un ${Math.round(this.armorShred * 100)} %.`, { tint: 0xc0c8d8 });
    if (this.woundT > 0) add('wound', 'Herida', this.woundT, true, `Recibes un ${Math.round(this.woundPct * 100)} % menos de curación, regeneración y robo de vida.`, { icon: 'icon_wound', name: 'Herida', tint: 0xff5a5a });
    if (this.slows.length) add('slow', 'Ralentizado', Math.max(...this.slows.map(s => s.t)), true, 'Te mueves más lento.', { icon: 'icon_slow', name: 'Ralentización', tint: 0x7ee0ff });
    if (this.poisons.some(p => p.burn)) add('burn', 'Quemado', Math.max(...this.poisons.filter(p => p.burn).map(p => p.t)), true, 'Recibes daño de fuego cada medio segundo.', { icon: 'icon_burn', name: 'Quemadura', by: (() => { const s = this.poisons.find(p => p.burn)?.src; return (s?.owner || s)?.def?.name || ''; })(), tint: 0xff5a2a });
    if (this.poisons.some(p => !p.burn)) add('poison', 'Envenenado', Math.max(...this.poisons.filter(p => !p.burn).map(p => p.t)), true, 'Recibes daño cada medio segundo.', { icon: 'icon_poison', name: 'Envenenado', tint: 0x7be05a });
    if (this.ink && this.ink.t > 0) add('ink', 'Marcado con tinta', this.ink.t, true, 'Tu siguiente daño de Julio hace explotar la tinta.');
    if (this.shieldHp > 0) add('shield', `Escudo ${Math.round(this.shieldHp)}`, this.shieldT < 1e6 ? this.shieldT : null, false, this.coreOn ? 'Escudo de núcleo: dura hasta que se rompe.' : 'Absorbe daño.');
    if (this.speedT > 0) add('speed', 'Velocidad extra', this.speedT, false, 'Te mueves más rápido.');
    if (this.recall) add('recall', 'Teletransporte', this.recall.t, false, 'Volverás a tu base. Se cancela si recibes daño.', { icon: 'item_teleport_base', name: 'Teleport a la base' });
    if (this.potions.length) add('potion', 'Poción', Math.max(...this.potions.map(p => p.t)), false, 'Recuperas vida y maná con el tiempo.', { icon: 'item_pocion_vida_peq', name: 'Poción' });
    if (this.protein) add('protein', 'Curación (proteína)', this.protein.t, false, 'Te curas con el tiempo hasta recibir daño.');
    if (this.duo) this.josueStatus(add);
    if (this.invis) add('invis', 'Invisible', null, false, 'Los enemigos no te ven (solo las torretas).');
    if (this.hen) add('hen', `Gallina ${Math.ceil(this.henHp)}`, null, false, 'Montas una gallina gigante: más ataque, defensa y velocidad. Absorbe daño hasta agotarse.', { icon: 'icon_eliud_p1', name: 'Gallina gigante', by: this.def.name });
    if (this.buff && !this.hen) add('buff', 'Transformación', this.buff.t, false, 'Más vida y ataque, poderes más rápidos.');
    if (this.pkBuffs) for (const k in this.pkBuffs) { const N = { hp: 'Vida extra', atk: 'Daño +', aspd: 'Vel. ataque +', def: 'Defensa +' }[k]; add('pk_' + k, N, this.pkBuffs[k].t, false, 'Mejora temporal de un paquete.', { icon: 'icon_eliud_ult', name: 'Paquete sorpresa', by: 'Eliud' }); }
    if (this.key === 'xeviche' && this.setupStacks > 0) add('setup', `Setup x${this.setupStacks}`, null, false, 'Piezas de setup: más armadura y resistencia a IA.', { icon: 'icon_xeviche_p3', name: 'Setup', by: this.def.name });
    if (this.buffs) for (const id in this.buffs) { const bi = this.w.buffInfo?.(id); if (bi) add('bb_' + id, bi.name, null, false, bi.desc, { count: this.buffs[id], icon: 'icon_' + bi.icon, name: bi.name, by: 'Robot de guerra', tint: bi.col }); }   // upgrades from the war robot
    for (const k of Object.keys(this.perm || {})) { const n = this.perm[k], pm = PERM_BY_ID['p_' + k]; if (n > 0 && pm) add('perm_' + k, STAT_LABEL_B[k], null, false, `Mejora permanente comprada (Prompt): ${fmtStat(k, pm.per * n)} ${STAT_LABEL_B[k]} en total.`, { count: n, icon: 'stat_' + k, name: pm.name, by: 'Prompt', tint: 0xffe27a }); }   // permanent prompts live in the effects bar
    if (this.beastUp) { const n = Object.values(this.beastUp).reduce((a, b) => a + b, 0); add('beast_up', 'Bendición de la bestia', null, false, 'Mejoras permanentes ganadas al derrotar a la bestia: ' + Object.entries(this.beastUp).map(([k, v]) => `${STAT_LABEL_B[k] || k} x${v}`).join(', ') + '.', { count: n, icon: 'icon_boss_beast', name: 'Bendición de la bestia', by: 'Bestia peluda', tint: 0xd9a05a }); }
    return L;
  }

  // anti-heal: while wounded every source of healing is reduced (wound(pct, t) keeps the strongest pct and the longest time)
  wound(pct, t) { if (this.isTower || !this.alive) return; this.woundPct = Math.max(this.woundT > 0 ? this.woundPct : 0, pct); this.woundT = Math.max(this.woundT || 0, t); this.w.markSrc?.(this, 'wound'); }
  get healMult() { return this.woundT > 0 ? 1 - this.woundPct : 1; }
  heal(n) {
    if (this.isTower) return;
    const h = Math.min(n * this.healMult, this.maxHp - this.hp);
    this.hp += h;
    if (h > 0) this.w.float(this.x, this.y - this.def.height - 10, `+${Math.round(h)}`, '#5dff8a');
  }

  die(killer) {
    if (this.duo && this.w.net?.role !== 'client' && this.josueSave(killer)) return;   // Josué: the partner takes over, nobody died yet
    if (this.isChamp) this.deaths++;
    this.alive = false; this.state = 'dead';
    this.stateT = 0; this.deadT = 0; this.pending = null; this.stunT = 0;
    this.slows = []; this.poisons = [];
    if (this.flame) { this.flame.spr?.destroy(); this.flame = null; }   // Junior dying mid-flamethrower: the jet disappears with him
    this.playAnim('death', 0.9);
    {
      if (this.isChamp) this.w.audio.line(this, 'death');
      const au = this.w.audio, big = this.isNexus ? 'nexus_destroy' : this.isTower ? 'explosion_big' : null;
      if (big) au.play(big, { at: this, vol: 1, gap: 0 });
      else if (this.isChamp) au.play('champ_death', { at: this, vol: 0.9, gap: 0 });
      else if (this.isMinion) au.play(this.key.includes('red') ? 'explosion' : 'minion_yell', { at: this, vol: 0.55, gap: 120 });
      else au.play('explosion', { at: this, vol: 0.4, gap: 150 });
    }
    if (this.isTower) this.destroyTower();
    if (this.isNexus) this.w.endGame(1 - this.team);
    this.w.reward(this, killer);
  }

  // tower: play the collapse once, then leave a permanent rubble pile of its base
  destroyTower() {
    const k = `${this.key}_destroy`, showRubble = () => { if (this.w.sprites[this.key]?.rubble) this.spr.stop().setTexture('atl_' + this.key, 'rubble/0'); else this.spr.setTint(0x333333); };
    try { this.spr.renderFilters = false; } catch (e) { /* no filters */ }   // drop the team glow
    this.shadow.setVisible(false);
    if (this.w.anims.exists(k)) { this.spr.play({ key: k, repeat: 0 }); this.spr.once('animationcomplete', showRubble); } else showRubble();
  }

  /* ---------- per-frame ---------- */
  // cooldown of an item PASSIVE (for the item slot counter): { cd, max } or null when it is ready / active
  passiveCd(id) {
    if (!this.pas?.has(id)) return null;
    if (id === 'nucleo_ia') return !this.coreOn ? { cd: Math.max(0, this.coreT ?? 12), max: 12 } : null;
    if (id === 'firewall_magico') return !this.mshield && this.mshieldCd > 0 ? { cd: this.mshieldCd, max: 10 } : null;
    if (id === 'servidor_redundante') return this.backupCd > 0 ? { cd: this.backupCd, max: 60 } : null;
    return null;
  }
  // health bar animation state: _hs = what the solid bar shows, _gh = the "ghost" of the health lost (fades out slowly), heal = animated fill towards the real health
  tickHp(dt) {
    const hp = Math.max(0, this.hp), mh = Math.max(1, this.maxHp);
    if (this._hs === undefined || !this.alive) { this._hs = this._gh = hp; this._gd = 0; return; }
    if (hp < this._hs - 0.01) { this._gh = Math.max(this._gh, this._hs); this._gd = 0.45; this._hs = hp; }   // damage: the bar drops at once, a reddish ghost keeps the old value
    else if (hp > this._hs + 0.01) this._hs = Math.min(hp, this._hs + (mh * 0.5 + (hp - this._hs) * 1.2) * dt);   // healing: the bar climbs smoothly, a dark green strip shows where it will end
    if (this._gh > this._hs) { if ((this._gd -= dt) <= 0) this._gh = Math.max(this._hs, this._gh - (mh * 0.28 + (this._gh - this._hs) * 0.9) * dt); } else this._gh = this._hs;
  }
  update(dt) {
    const w = this.w;
    this.tickHp(dt);
    if (!this.alive) {
      this.deadT += dt; this.stateT += dt;
      if (this.isBot || this.isMinion) { if (this.deadT > 2.6) this.dispose = true; }   // corpse stays ~2s, then fades
      else if (!this.isTower && !this.w.survival && this.deadT > this.respawnTime && this.w.net?.role !== 'client') {
        const keep = { ...this.cds };   // cooldowns freeze while dead and resume where they were
        this.x = this.spawn.x; this.y = this.spawn.y; this.reset(); this.cds = keep; if (this.duo) this.josueRespawn(); this.playAnim('idle');
      }
      return;
    }
    if (this.drop) {   // reinforcement falling from the ship: untouchable until it lands
      const d = this.drop; d.t += dt; if (d.slide && d.t > 0) { const k = Math.min(1, d.t / d.dur), e = 1 - Math.pow(1 - k, 2); this.x = d.slide.x0 + (d.slide.x1 - d.slide.x0) * e; this.y = d.slide.y0 + (d.slide.y1 - d.slide.y0) * e; } else if (d.slide) { this.x = d.slide.x0; this.y = d.slide.y0; }
      if (d.t >= d.dur) { this.drop = null; this.w.vfx('run_dust', this.x, this.y - 6, { scale: 2.6, alpha: 0.8, below: true }); this.w.audio.play('step', { at: this, vol: 0.5, gap: 60 }); } return;
    }
    if (this.isBot) {
      this.life -= dt;
      if (this.life <= 0) { this.dispose = true; return; }
      if (this.owner && !this.owner.alive && this.key.startsWith('bot_') && !this.enraged) { this.enraged = true; this.w.vfx('shockwave', this.x, this.y - 6, { scale: 2.2, below: true, tint: 0xff3b3b }); this.w.float(this.x, this.y - this.def.height - 20, '¡FURIA!', '#ff5a5a'); }   // Leandro's bots do not vanish when he dies: they go berserk (red, faster attacks and movement)
      else if (this.owner && !this.owner.alive && !this.key.startsWith('bot_')) { this.dispose = true; return; }
    }
    if (this.rw) {   // being rewound by Jorbi's ultimate: slide back along the recorded path
      const rw = this.rw; rw.t += dt;
      const p = Math.min(1, rw.t / rw.dur), e = p * p * (3 - 2 * p), k = (1 - e) * (rw.path.length - 1), i = Math.floor(k), fr = k - i, A = rw.path[i], B = rw.path[Math.min(rw.path.length - 1, i + 1)];
      this.x = A[0] + (B[0] - A[0]) * fr; this.y = A[1] + (B[1] - A[1]) * fr; this.in = { mx: 0, my: 0, run: false };
      if (A !== B) this.setAim(A[0] - B[0], A[1] - B[1]);
      if (this.state !== 'run') { this.state = 'run'; this.pending = null; this.playAnim('run'); }
      if (p >= 1) { this.rw = null; this.state = 'idle'; this.playAnim('idle'); }
      return;
    }
    for (const k in this.cds) this.cds[k] = Math.max(0, this.cds[k] - dt * (k !== 'basic' ? (this.buff ? this.buff.cdSpeed : 1) * (1 + this.it.cdr) : 1));
    if (this.ink && (this.ink.t -= dt) <= 0) this.ink = null;
    if (this.invis) { if ((this.invis.t -= dt) <= 0) this.breakInvis(); else if ((this.invis.trail -= dt) <= 0) { this.invis.trail = 1.5; w.ghost(this); } }
    if (this.pkBuffs) for (const k in this.pkBuffs) if ((this.pkBuffs[k].t -= dt) <= 0) { delete this.pkBuffs[k]; if (k === 'hp') this.hp = Math.min(this.hp, this.maxHp); }
    for (const sl of this.inv) if (sl && sl.cd > 0) sl.cd = Math.max(0, sl.cd - dt);
    if (this.potionCd > 0) this.potionCd -= dt;
    if (this.potions.length) this.potions = this.potions.filter(p => {   // potions heal over their duration
      const f = Math.min(dt, p.t) / p.T; p.t -= dt;
      if (p.hp) this.hp = Math.min(this.maxHp, this.hp + p.hp * f);
      if (p.mana && this.maxMana) this.mana = Math.min(this.maxMana, this.mana + p.mana * f);
      return p.t > 0;
    });
    if (this.fireT > 0) this.fireT -= dt;
    if (this.flame) { const F = this.flame; F.t -= dt; if (F.t <= 0 || this.stunT > 0) { this.flame = null; F.spr?.destroy(); if (this.state === 'idle' || this.state === 'walk' || this.state === 'run') this.state = ''; } else this.w.flameTick(this, F, dt); }
    if (this.atkSlowT > 0) this.atkSlowT -= dt;
    if (this.combatT > 0) this.combatT -= dt;
    if (this.isChamp && this.pas.size) this.itemPassives(dt);
    if (this.isChamp) {   // item regen, passive income and the base fountain
      this.hp = Math.min(this.maxHp, this.hp + this.it.hpRegen * dt * this.healMult);
      if (this.maxMana) this.mana = Math.min(this.maxMana, this.mana + this.it.manaRegen * dt);
      this.gold += dt * 3.2;
      if (w.inBase(this)) { this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.10 * dt); if (this.maxMana && !this.def.farandula) this.mana = Math.min(this.maxMana, this.mana + this.maxMana * 0.10 * dt); }
    }
    if (this.recall) { const R = this.recall; if ((R.t -= dt) <= 0) { this.recall = null; this.recallFx = { phase: 'out', t: 0.25 }; w.audio.play('ui_open', { at: this, gap: 0 }); } else if (this.stunT > 0) this.recall = null; }
    if (this.recallFx) {   // return to base: the champion is stretched into the sky and vanishes, then rebuilds at the base with the same wave coming back down
      const F = this.recallFx; F.t -= dt; this.carriedT = Math.max(this.carriedT || 0, 0.15); this.invulT = Math.max(this.invulT || 0, 0.15);
      if (F.t <= 0) { if (F.phase === 'out') { this.x = this.spawn.x; this.y = this.spawn.y; this.recallFx = { phase: 'in', t: 0.4 }; w.audio.play('ui_open', { at: this, gap: 0 }); } else this.recallFx = null; }
    }
    if (this.protein) {   // healing over time; any damage breaks it (see world.damage)
      this.protein.t -= dt; this.protein.tick += dt;
      if (this.protein.t <= 0) this.protein = null;
      else if (this.protein.tick >= 0.5) { this.protein.tick -= 0.5; this.heal(this.protein.hps * 0.5); if (Math.random() < 0.6) w.vfx('heal', this.x + (Math.random() - 0.5) * 40, this.cy + (Math.random() - 0.5) * 30, { scale: 2, tint: 0x66ff99, alpha: 0.9 }); }
    }
    if (this.stab > 0) this.stab -= dt;
    if (this.isRage && !this.hen && this.rage > 0) { this.rageIdle = (this.rageIdle || 0) + dt; if (this.rageIdle > 2) this.rage = Math.max(0, this.rage - dt * 6); }   // no fighting for 2 s: rage drains
    if (this.hunted && (this.hunted.t -= dt) <= 0) this.hunted = null;
    if (this.silenceT > 0) this.silenceT -= dt;
    if (this.def.farandula) {   // Farándula: always starts full, every ability spends it, and it recharges fast while she neither attacks nor casts
      if (!this._fInit) { this._fInit = true; this.mana = this.maxMana; }
      this.fIdle = (this.fIdle || 0) + dt; if (this.fIdle > 0.7 && this.alive) this.mana = Math.min(this.maxMana, this.mana + this.maxMana * 0.6 * dt);
    }
    if (this.invulT > 0) this.invulT -= dt;
    if (this.cdrT > 0) { this.cdrT -= dt; for (const k of ['p1', 'p2', 'p3']) if (this.cds[k] > 0) this.cds[k] = Math.max(0, this.cds[k] - dt); }   // Show principal: abilities recharge twice as fast
    if (this.key === 'leandro' && !!this.leakRe !== !!this._lkw) { this._lkw = !!this.leakRe; if (this.state === 'idle' && this.hasAnims) this.playAnim('idle'); }
    if (this.key === 'leandro') { const want = this.comb ? 'leandro_comb' : 'leandro'; if (this.skin !== want) this.setSkin(want); }   // comb in hand while the power lasts
    if (this.comb && (this.comb.t -= dt) <= 0) { this.comb = null; this.w.float(this.x, this.y - this.def.height - 30, 'Peine guardado', '#9fffd8'); }
    if (this.key === 'maduro' && this.alive && this.ranks.p2 > 0) this.guardTick(dt);
    if (this.duo) this.josueTick(dt);
    if (this.revealT > 0) this.revealT -= dt; if (this.brRevealT > 0) this.brRevealT -= dt;
    if (this.leakRe && (this.leakRe.t -= dt) <= 0) { this.leakRe = null; this.cds.ult = rk(this.def.abilities.ult.cd, this.ranks.ult || 1); }   // the 2nd activation window closed: the full cooldown starts
    if (this.qRe && (this.qRe.t -= dt) <= 0) { this.qRe = null; this.cds.p1 = Math.max(this.cds.p1, rk(this.def.abilities.p1.cd, this.ranks.p1 || 1)); }   // the recast window closed: the full cooldown starts
    if (this.drT > 0) this.drT -= dt; if (this.armorShredT > 0) this.armorShredT -= dt;
    if (this.sShield && (this.sShield.t -= dt) <= 0) { this.sShield = null; this.w.float(this.x, this.y - this.def.height - 30, 'Escudo agotado', '#c0c8d8'); }
    if (this.sb && (this.sb.t -= dt) <= 0) { this.setSB(0); this.w.vfx('summon', this.x, this.y - 10, { scale: 3 }); this.w.float(this.x, this.y - this.def.height - 30, 'Maduro', '#ffe27a'); }
    if (this.shove) { const sv = this.shove; sv.t -= dt; if (!this.dashStep(sv.vx * dt, sv.vy * dt) || sv.t <= 0) this.shove = null; }
    if (this.pullMe) { const pm = this.pullMe, by = pm.by, dx = by.x + by.ax * 62 - this.x, dy = by.y + by.ay * 62 - this.y, dd = Math.hypot(dx, dy) || 1; pm.t -= dt; this.carriedT = 0.12; if (dd < 14 || pm.t <= 0 || !by.alive || !this.dashStep(dx / dd * 1100 * dt, dy / dd * 1100 * dt)) this.pullMe = null; }
    if (this.blindT > 0) this.blindT -= dt;
    if (this.speedT > 0 && (this.speedT -= dt) <= 0) this.speedBoost = 0;
    if (this.shieldT > 0 && (this.shieldT -= dt) <= 0) { this.shieldHp = 0; this.inkSh = null; }
    this.shieldMaxT = this.shieldT > 0 && this.shieldT < 1e6 && this.shieldHp > 0 ? Math.max(this.shieldMaxT || 0, this.shieldT) : 0;   // for the white duration bar
    if (this.charmT > 0 && (this.charmT -= dt) <= 0) { this.team = this.baseTeam; this.w.float(this.x, this.y - this.def.height - 28, 'libre', '#ffffff'); }
    if (this.key === 'jorbi' && this.dashTimers.length) {   // per-charge recharge (faster while transformed)
      const sp = this.buff ? this.buff.cdSpeed : 1;
      this.dashTimers = this.dashTimers.map(t => t - dt * sp).filter(t => { if (t <= 0) { this.dashCharges++; return false; } return true; });
    }
    if (this.key === 'jorbi') this.cds.p2 = this.dashCharges > 0 || !this.dashTimers.length ? 0 : Math.min(...this.dashTimers);
    if (this.buff && (this.buff.t -= dt) <= 0) this.endBuff();
    if (this.maxMana) this.mana = Math.min(this.maxMana, this.mana + dt * (w.debugFree ? 99 : 0.5));
    if (!this.isTower && !this.def.lane) this.hp = Math.min(this.maxHp, this.hp + dt * this.maxHp * 0.004);   // structures never regenerate
    if (this.isChamp && this.ai && this.retreat && Math.hypot(this.x - this.spawn.x, this.y - this.spawn.y) < 260) { this.hp = Math.min(this.maxHp, this.hp + dt * this.maxHp * 0.07); this.mana = Math.min(this.maxMana, this.mana + dt * this.maxMana * 0.05); }   // base fountain for retreating AI
    this.slows = this.slows.filter(s => (s.t -= dt) > 0);
    if (this.woundT > 0) this.woundT -= dt;
    this.poisons = this.poisons.filter(p => {
      p.t -= dt; p.tick += dt;
      if (p.tick >= 0.5) { p.tick -= 0.5; w.damage(p.src, this, p.dps * 0.5, p.type || 'true', p.burn ? 'burn' : 'poison'); if (p.burn && Math.random() < 0.35) w.vfx('burning_ground', this.x + (Math.random() - 0.5) * 30, this.y - 6, { scale: 1.4, alpha: 0.8, below: true }); }
      return p.t > 0 && this.alive;
    });
    if (this.key === 'julio' || this.inkSh) this.julioTick(dt);
    if (!this.alive) return;

    if (this.stunT > 0) {
      this.stunT -= dt; this.state = 'stun';
      if (this.stunT <= 0) { this.state = 'idle'; this.playAnim('idle'); }
      return;
    }
    if (this.pullTo) {   // Héctor is dragged by the chains toward the tied enemy
      const t = this.pullTo.target, dx = t.x - this.x, dy = t.y - this.y, d = Math.hypot(dx, dy);
      if (!t.alive || d <= 78 || (this.pullTo.t -= dt) <= 0) {
        if (t.alive && d <= 120) { w.damage(this, t, this.pullTo.dmg * 0.5, 'physical'); w.vfx('punch', t.x, t.cy, { scale: 3.5 }); w.audio.playAll('ev_hector_chain', { at: t, vol: 0.9, gap: 0 }); }
        this.pullTo = null; this.state = 'idle'; this.playAnim('idle');
      } else { this.setAim(dx, dy); this.tryMove(clamp(this.x + dx / d * 1250 * dt, 60, WORLD_W - 60), clamp(this.y + dy / d * 1250 * dt, WALK_Y0, WALK_Y1)); return; }
    }
    if (this.state === 'cast') {
      this.stateT += dt;
      if (this.bike) {   // bike dash: damage + stun everyone crossed, leave fire behind
        const b = this.bike; w.castCtx = { f: this, k: 'ult' };
        w.enemiesOf(this).forEach(t => { if (!b.hit.has(t) && Math.hypot(t.x - this.x, t.y - this.y) < 64) { b.hit.add(t); w.damage(this, t, b.dmg, 'physical'); t.stun(b.stun); w.vfx('punch', t.x, t.cy, { scale: 3.5 }); } });
        if (Math.hypot(this.x - b.lx, this.y - b.ly) > 38) { b.lx = this.x; b.ly = this.y; w.firePatch(this, this.x, this.y, b.fire, b.fireTime); }
        w.castCtx = null;
      }
      if (this.inkDash) {   // ink wave: damage + mark everyone the dash crosses
        const d = this.inkDash;
        w.enemiesOf(this).forEach(t => { if (!d.hit.has(t) && Math.hypot(t.x - this.x, t.y - this.y) < 62) { d.hit.add(t); w.damage(this, t, d.dmg, 'magic'); w.applyInk(this, t); } });
        if (Math.random() < 0.8) w.vfx('poison_hit', this.x, this.y - 14, { scale: 2.2, tint: 0x6a3cff, below: true, alpha: 0.8 });
      }
      if (this.dashV) {   // dashing: fast move along the aim
        if (!this.dashStep(this.dashV.x * dt, this.dashV.y * dt)) this.stateT = this.stateDur;   // hit a wall / tire / the edge: the dash ends there
        if (Math.random() < 0.5 && !this.dashShield) w.vfx('run_dust', this.x, this.y - 6, { scale: 1.6, alpha: 0.6, below: true });
        if (this.stateT >= this.stateDur) { if (this.dashV && this.dashShield) { const d = this.dashShield; this.dashShield = null; this.shieldHp = Math.max(this.shieldHp, d.sh); this.shieldT = d.t; this.w.markSrc(this, 'shield'); } this.dashV = null; if (this.inkDash) { if (this.inkDash.trail) w.inkTrail([{ x: this.inkDash.ox, y: this.inkDash.oy }, { x: this.x, y: this.y }], 34, 3, 1); this.inkDash = null; } if (this.bike) { this.bike = null; this.setSkin(this.key); } }
      }
      if (this.lunge) { const L = this.lunge; L.t -= dt; if (this.rootT <= 0 && !this.dashStep(L.vx * dt, L.vy * dt)) L.t = 0; if (Math.random() < 0.6) w.vfx('run_dust', this.x - this.ax * 14, this.y - 6, { scale: 1.2, alpha: 0.5, below: true }); if (L.t <= 0) this.lunge = null; }
      if (!this.fired && this.stateT >= this.windup) { this.fired = true; this.pending?.(); }
      if (this.stateT >= this.stateDur) {
        this.state = 'idle';
        if (this.isChamp && /^attack/.test(this.anim || '') && this.comboStep > 0) this.holdPose = true;   // combo in progress: stay in the final pose of this hit (it is the first pose of the next one)
        else this.playAnim('idle');
      }
      return;
    }

    if (this.def.charge && this.ranks.p3 && this.alive && !this.bomber && !this.away && this.w.net?.role !== 'client') {   // Yonaiker: the bar does not fill by itself (only by landing hits, see World.damage); full -> the ship comes for him
      if (this.charge >= 100 && this.free) this.w.startBomber(this, this.def.abilities.p3, this.ranks.p3);
    }
    if (this.holdPose && (this.state !== 'idle' || (w2g(this) - (this.comboEnd || 0) > COMBO_WINDOW))) { this.holdPose = false; if (this.state === 'idle' && this.alive) this.playAnim('idle'); }
    if (this.bufferT > 0) { this.bufferT -= dt; if ((this.free || this.chaining()) && this.cds.basic <= 0) { this.bufferT = 0; this.tryBasic(); } }
    if (this.arepaGrace > 0) this.arepaGrace -= dt;
    if (this.carriedT > 0) this.carriedT -= dt;
    if (this.lure) { const L = this.lure; L.t -= dt; const dx = L.src.x - this.x, dy = L.src.y - this.y, d = Math.hypot(dx, dy); if (L.t <= 0 || !L.src.alive) this.lure = null; else this.in = d > 70 ? { mx: dx / d, my: dy / d, run: false } : { mx: 0, my: 0, run: false }; }
    if (this.ride) {   // bike: auto-forward, accelerating, free steering
      const R = this.ride, w2 = this.w; R.t -= dt; R.age += dt;
      if (R.t <= 0 || this.stunT > 0 || !this.alive) { this.ride = null; this.setSkin(this.key); this.state = ''; this.turn = 0; }
      else {
        const mv = Math.hypot(this.in.mx, this.in.my); if (mv > 0) { R.dx = this.in.mx / mv; R.dy = this.in.my / mv; }
        const k = Math.min(1, R.age / R.ramp), spd = (R.v0 + (R.v1 - R.v0) * k * k) * (1 - this.slows.reduce((m, s) => Math.max(m, s.pct), 0));
        if (this.rootT > 0) this.rootT -= dt; else this.tryMove(clamp(this.x + R.dx * spd * dt, 60, WORLD_W - 60), clamp(this.y + R.dy * spd * dt, WALK_Y0, WALK_Y1));
        this.ax = R.dx; this.ay = R.dy; this.turn = 0; this.running = true;
        if (this.state !== 'run') { this.state = 'run'; this.playAnim('run'); }
        if (spd > 120) {
          w2.castCtx = { f: this, k: 'ult' }; const now = w2.time.now;
          w2.enemiesOf(this).forEach(t => { if (!t.isTower && Math.hypot(t.x - this.x, (t.y - this.y) / 0.75) < 64 && now - (R.hit.get(t) || -1e9) > 1500) { R.hit.set(t, now); w2.damage(this, t, R.dmg * Math.min(1, spd / R.v1 + 0.3), 'physical'); t.stun(R.stun); w2.vfx('punch', t.x, t.cy, { scale: 3.5 }); } });
          w2.castCtx = null;
          if (Math.hypot(this.x - R.lx, this.y - R.ly) > 38) { R.lx = this.x; R.ly = this.y; w2.firePatch(this, this.x, this.y, R.fire, R.fireTime); }
        }
        if (Math.random() < Math.min(0.8, spd / 400)) w2.vfx('run_dust', this.x - R.dx * 20, this.y - 6, { scale: 1.6, alpha: 0.6, below: true });
        return;
      }
    }
    if (this.rootT > 0) { this.rootT -= dt; this.in = { mx: 0, my: 0, run: false }; }   // snared: can still attack and cast, cannot move
    if (this.burst) this.in = { mx: 0, my: 0, run: false };   // golden burst: Julio stands still while it lasts
    if (this.inkFree) { const l = Math.hypot(this.in.mx, this.in.my); if (l > 0) { this.inkFree.dx = this.in.mx / l; this.inkFree.dy = this.in.my / l; } this.in = { mx: this.inkFree.dx, my: this.inkFree.dy, run: true }; }   // Ola de tinta nv3: he always keeps sliding (never stands) until the effect ends
    const { mx, my, run } = this.in, len = Math.hypot(mx, my);
    this.running = run && len > 0;
    if (len > 0 && this.recall) this.cancelRecall();   // moving cancels the return
    if (len > 0) {
      // walking against where you aim: the character turns to face where it walks (no backpedaling, no slowdown); attacks and powers still aim at the cursor
      const nx = mx / len, ny = my / len, dot = nx * this.ax + ny * this.ay;
      this.turn = !this.flame && dot < -0.2 && Math.abs(nx) > 0.2 ? (nx >= 0 ? 1 : -1) : 0;
      const k = this.in.analog ? Math.min(1, len) : 1;   // analog input (escorts): speed eases with the remaining distance, no stop-and-go
      this.tryMove(clamp(this.x + nx * this.speed * k * dt, 60, WORLD_W - 60), clamp(this.y + ny * this.speed * k * dt, WALK_Y0, WALK_Y1));
      const s = this.running ? 'run' : 'walk';
      if (this.state !== s) { this.state = s; this.playAnim(s); }
      if (this.running) {
        this.stepT = (this.stepT || 0) - dt; if (this.stepT <= 0 && this.isChamp) { this.stepT = 0.2; w.audio.play('step', { at: this, vol: this === w.pc ? 0.22 : 0.12, gap: 120 }); }
        this.dust = (this.dust || 0) + dt;
        if (this.dust > 0.18) { this.dust = 0; w.vfx('run_dust', this.x - nx * 22, this.y - 6, { scale: 1.8, alpha: 0.7, below: true }); }
      }
    } else { this.turn = 0; if (this.state !== 'idle') { this.state = 'idle'; this.playAnim('idle'); } }
  }

  /* ---------- sprite ---------- */
  buildSprite() {
    const s = this.w;
    this.dirFrames = this.isTower && !!s.sprites[this.key]?.aim;       // tower: 8 aim directions (E,SE,S,SW,W,NW,N,NE)
    this.hasAnims = !this.dirFrames && s.hasAnims(this.art);
    const sp = s.sprites[this.art], tex = this.dirFrames || this.hasAnims ? 'atl_' + this.art : (this.def.ref || this.key), fr = this.dirFrames ? 'aim/0' : this.hasAnims ? (sp.idle ? 'idle/0' : 'walk/0') : undefined;   // atlas frame for towers / animated units
    this.shadow = s.add.image(this.x, this.y, 'shadow').setAlpha(0.45).setScale(this.def.height / 32 * 0.8, this.def.height / 32 * 0.4);
    this.spr = s.add.sprite(this.x, this.y, tex, fr);
    if (this.dirFrames) {
      this.spr.setOrigin(0.5, 0.89).setScale(this.def.height / 190);
    } else if (this.hasAnims) {
      this.spr.setOrigin(0.5, 0.89).setScale(this.def.height / 190);
      this.spr.play(`${this.art}_idle`);
    } else if (this.isBot || this.isMinion || this.isTower) {
      this.spr.setOrigin(0.5, 0.95).setScale(this.def.height / this.spr.height);
    } else {
      this.spr.setOrigin(0.5, 0.97).setScale(this.def.height / 1330);
    }
    this.baseScale = this.spr.scaleX;
    // The beast's idle and walk art is larger than the first frames of its attacks.
    if (this.art === 'boss_beast' && this.hasAnims) this.spr.setScale(this.baseScale * 0.86);
    this.tintBot();
    // ground ring under every champion: green = in use, blue = ally, red = enemy (always below the sprite)
    if (this.isChamp) this.ring = s.add.ellipse(this.x, this.y, this.def.height * 0.85, this.def.height * 0.34, 0xffffff, 0.1).setStrokeStyle(3, 0xffffff, 0.85);
  }

  tintBot() { if (this.placeholder && this.def.phTint) { this.spr.setTint(this.def.phTint); return; } if (this.def.guard || this.def.bot === 'crate' || this.key === 'roach') return; if (this.antivirus && this.hasAnims) return; if (this.antivirus) { this.spr.setTint(0xa0ffc0); return; } if (this.isBot && !this.hasAnims) this.spr.setTint(this.team === 0 ? 0xb8fff0 : 0xffb8a8); }

  // direction the sprite faces: where it walks while moving, else where it aims. Sector changes need to pass the sector edge by a margin (no flicker on the diagonals).
  curDir() {
    const moving = (this.state === 'walk' || this.state === 'run') && this.mvLen > 0, dx = moving ? this.mvx : this.ax, dy = moving ? this.mvy : this.ay;
    if (dx === 0 && dy === 0) return DIR8[this.d8i || 0];
    const a = Math.atan2(dy, dx), step = Math.PI / 4;
    if (this.d8i === undefined) this.d8i = (Math.round(a / step) + 8) % 8;
    else { let df = a - this.d8i * step; df = Math.atan2(Math.sin(df), Math.cos(df)); if (Math.abs(df) > step / 2 + 0.14) this.d8i = (Math.round(a / step) + 8) % 8; }
    return DIR8[this.d8i];
  }

  playAnim(name, dur, reverse = false, keep = false) {
    if (!this.hasAnims) return;
    if (name === 'idle' && this.key === 'leandro' && this.leakRe && this.w.anims.exists('leandro_ultb_loop')) name = 'ultb_loop';   // while the Filtraciones window is open Leandro keeps the activation pose cycling (frames 3+)
    if (this.puddle && this.key === 'julio') name = /^(idle|walk|run)$/.test(name) ? 'puddle_move' : /^(attack|lunge|power)/.test(name) ? (this.w.anims.exists('julio_puddle_cast') ? 'puddle_cast' : 'puddle_move') : name;   // puddle form: only the puddle art
    const held = this.flame && (name === 'idle' || name === 'walk' || name === 'run');   // flamethrower stays in his hands while it is active
    if (held) name = 'power3';
    const d = this.curDir(), [sfx, mir] = DIR_SRC[d];
    let key = null; const own = this.duo || this.def.pal;   // Josué's two bodies only use their own skin (never the other body's art)
    for (const b of own ? [this.skin] : [this.skin, this.key]) { const k = `${b}_${name}_${sfx}`; if (this.w.anims.exists(k)) { key = k; break; } }
    this.dirArt = !!key; this.dirMirror = mir;
    if (!key) {   // no directional art for this animation yet: the single east-facing sheet (mirrored by facing, as before)
      key = `${this.skin}_${name}`;
      if (!own && !this.w.anims.exists(key)) key = `${this.key}_${name}`;
      if (!this.w.anims.exists(key)) {
        if (/^attack\d$/.test(name) || name === 'lunge' || (own && /^(power|ult)/.test(name))) return this.playAnim('attack', dur, reverse, keep);   // combo hits without their own art yet reuse the basic attack
        if (own && name === 'run') return this.playAnim('walk', dur, reverse, keep);   // stand-in art (the cockroach) has no run cycle
        return;
      }
    }
    const anim = this.w.anims.get(key);
    if (this.art === 'boss_beast') this.spr.setScale(this.baseScale * (name === 'idle' ? 0.86 : name === 'walk' ? 0.81 : 1));
    const cfg = { key, repeat: held ? -1 : anim.repeat };
    if (dur) cfg.frameRate = anim.getTotalFrames() / dur;
    if (!/^attack/.test(name)) this.holdPose = false;
    if (keep === 'last') cfg.startFrame = anim.getTotalFrames() - 1;
    else if (keep) { const tot = anim.getTotalFrames(); cfg.startFrame = Math.min(tot - 1, Math.floor((this.spr.anims.getProgress() || 0) * tot)); }   // direction change mid-cycle: same phase of the step
    this.curName = name; this.curDur = dur; this.curD = d;
    reverse ? this.spr.playReverse(cfg) : this.spr.play(cfg);
  }

  flash() { this.spr.setTint(0xff5555); this.w.after(0.08, () => { this.spr.clearTint(); this.tintBot(); }); }

  // team marker: green = champion in use, blue = ally, red = enemy. A ground ring (cheap); the per-sprite WebGL glow filter it replaced
  // cost 2-4x the frame time once a few dozen units were on screen (the main cause of lag in big matches).
  outline() {
    const me = this.w.player;
    if (!me || this.outlined) return;
    this.outlined = true;
    if (this.ring) return;   // champions already have their ring (buildSprite)
    if (this.isTower && !this.isNexus) return;   // towers: only the attack-range ring of drawTowerRanges (no second blue circle)
    const col = this.team === me.baseTeam ? 0x3b82f6 : 0xff3b3b, wd = this.isTower ? towerCircle(this) * 2 : this.def.height * 0.6;
    this.ring = this.w.add.ellipse(this.x, this.y, wd, wd * (this.isTower ? 0.75 : 0.4), col, this.isTower ? 0.08 : 0.14).setStrokeStyle(this.isTower ? 3 : 2, col, this.isTower ? 0.9 : 0.75);
  }

  // blinded player: only units inside the (blurred) vision area can be seen
  recallDeform() {   // 0..1: how much the champion is stretched while returning to the base
    if (this.recall) { const k = Math.max(0, 1 - this.recall.t); return k * k * 0.5; }   // the stretch only shows in the last second
    const F = this.recallFx; if (!F) return 0;
    return F.phase === 'out' ? 0.5 + 0.5 * (1 - F.t / 0.25) : F.t / 0.4;
  }
  render(time) {
    if (this._rb) { this.spr.setScale(this._rb[0], this._rb[1]); this._rb = null; }   // undo last frame's stretch before the normal render
    this.renderInner(time);
    { const D = this.recallDeform(); if (D > 0 && this.alive) { const spr = this.spr; this._rb = [spr.scaleX, spr.scaleY]; spr.setScale(spr.scaleX * (1 - 0.55 * D), spr.scaleY * (1 + 2.2 * D)); const F = this.recallFx; spr.setAlpha(spr.alpha * (!F ? 1 : F.phase === 'out' ? Math.max(0, 1 - (D - 0.5) * 2) : 1 - D)); if (F) this.shadow.setAlpha(this.shadow.alpha * (F.phase === 'out' ? Math.max(0, 1 - (D - 0.5) * 2) : 1 - D)); } }
    if (this.drop) {   // falls from above (the sprite is lifted by the remaining height) and appears once it is released
      const d = this.drop, p = Math.max(0, Math.min(1, d.t / d.dur)), lift = d.slide ? Math.sin(p * Math.PI) * 60 + d.h * (1 - p) : d.h * (1 - p * p);
      this.spr.y -= lift; this.spr.setAlpha(d.t < 0 ? 0 : 1); this.shadow.setAlpha(d.t < 0 ? 0 : 0.15 + 0.3 * p).setScale(this.def.height / 32 * 0.8 * (0.5 + 0.5 * p), this.def.height / 32 * 0.4 * (0.5 + 0.5 * p));
    }
    const m = this.w.blindVis(this);
    if (m < 1) { this.spr.setAlpha(this.spr.alpha * m); this.shadow.setAlpha(this.shadow.alpha * m); this.ring?.setAlpha(m); if (m <= 0) this.ring?.setVisible(false); }
  }

  renderInner(time) {
    const spr = this.spr;
    if (this.key === 'xeviche') this.drawArepa();
    this.outline();
    // movement vector from the real displacement (works for local, bot and remote champions alike)
    { const ddx = this.x - (this.lx ?? this.x), ddy = this.y - (this.ly ?? this.y), dl = Math.hypot(ddx, ddy); this.lx = this.x; this.ly = this.y;
      if (dl > 0.3) { this.mvx = (this.mvx ?? 0) * 0.55 + ddx / dl * 0.45; this.mvy = (this.mvy ?? 0) * 0.55 + ddy / dl * 0.45; const m = Math.hypot(this.mvx, this.mvy) || 1; this.mvx /= m; this.mvy /= m; this.mvLen = dl; } else this.mvLen = 0; }
    if (this.hasAnims && this.alive && this.curName && spr.anims.currentAnim?.repeat === -1 && this.curDir() !== this.curD) this.playAnim(this.curName, this.curDur, false, true);
    else if (this.holdPose && this.alive && this.curName && this.curDir() !== this.curD) this.playAnim(this.curName, this.curDur, false, 'last');
    const face = this.turn && (this.state === 'walk' || this.state === 'run') ? this.turn : this.facing;   // while walking away from the aim the sprite faces its walking direction
    spr.setFlipX(this.isTower ? false : this.hasAnims && this.dirArt ? this.dirMirror : face < 0);
    if (this.key === 'junior' && this.dashV && this.dashShield && this.state === 'cast') spr.setAngle((this.stateT / (this.stateDur || 0.38)) * 360 * (face < 0 ? -1 : 1)); else if (this.key === 'junior' && spr.angle) spr.setAngle(0);
    if (this.isChamp && this.alive && this.state !== 'dead') { if (this.charmT > 0) spr.setTint(0xffe9a0); else if (this.silenceT > 0) spr.setTint(0xd9b0ff); else if (this.lure) spr.setTint(0xff9ccb); else if (this.poisoned) spr.setTint(0x9dffa0); else if (this.bloodT > 0) spr.setTint(0xff9a9a); else if (!this.flashing) spr.clearTint(); }   // poisoned: green filter
    this.drawPoison(); this.drawShield(); this.drawStun();
    spr.setDepth(this.y).setAlpha(this.alive ? 1 : this.isTower && !this.dirFrames ? 0.35 : 0.92);
    if (this.enraged && this.alive) spr.setTint(0xff4a4a);
    if (this.ring) {
      const me = this.w.player, col = this === me ? 0x3ddc84 : this.team === me.baseTeam ? 0x3b82f6 : 0xff3b3b, sel = this.w.selected === this;
      this.ring.setPosition(this.x, this.y).setDepth(this.y - 3).setVisible(this.alive && !this.hiddenFor(me));
      const rk = col * 4 + (sel ? 1 : 0) + (this.isChamp ? 2 : 0);
      if (rk !== this.ringKey) { this.ringKey = rk; this.isChamp ? this.ring.setStrokeStyle(sel ? 5 : 3, col, sel ? 1 : 0.85).setFillStyle(col, sel ? 0.22 : 0.1) : this.ring.setStrokeStyle(sel ? 3 : 2, col, sel ? 1 : 0.75).setFillStyle(col, sel ? 0.25 : 0.14); }   // restyle only when something changed
    }
    this.shadow.setPosition(this.x, this.y).setDepth(this.y - 1).setAlpha(this.alive ? 0.45 : 0.25);
    if (this.away || this.fogHidden || this.invis || (this.antivirus && this.owner?.invis)) { const hid = this.hiddenFor(this.w.player), al = hid ? 0 : 0.4; spr.setAlpha(al); this.shadow.setAlpha(al * 0.45); }
    if (this.inBush && !this.away && !this.fogHidden && !this.invis) { const pw = this.w.pc || this.w.player, hid = this.hiddenFor(pw), al = hid ? 0 : this.baseTeam === pw.baseTeam ? 0.6 : 1; spr.setAlpha(al); this.shadow.setAlpha(al * 0.45); }   // bush: invisible to the other team, see-through for allies
    if (this.isTower && !this.alive) { spr.setPosition(this.x, this.y).setAlpha(1).setDepth(this.y - 4); return; }   // wreck/rubble stays on the ground
    if (this.dirFrames) {   // tower: pick the sprite that points where it shoots
      if (!this.alive) { spr.setPosition(this.x, this.y).setAlpha(1).setDepth(this.y - 4); return; }   // wreck/rubble stays on the ground
      spr.setFrame(`aim/${((Math.round(Math.atan2(this.ay, this.ax) / (Math.PI / 4)) % 8) + 8) % 8}`).setPosition(this.x, this.y);
      return;
    }
    if (this.hasAnims && this.def.fly && this.alive) { if (this.owner?.invis) { const hid = this.hiddenFor(this.w.player); spr.setAlpha(hid ? 0 : 0.4); } else spr.setAlpha(1); const bob = Math.sin(time / 260 + this.nid * 1.7) * 5; spr.setPosition(this.x, this.y - 50 + bob); this.shadow.setPosition(this.x, this.y).setScale(this.def.height / 32 * 0.4, this.def.height / 32 * 0.2).setAlpha(0.3); return; }
    if (this.hasAnims) {
      if (!this.alive && !this.isChamp) {   // corpses: hold the last death frame, then fade out
        const hasDeath = this.w.anims.exists(`${this.key}_death`), t = this.stateT - (hasDeath ? 2.0 : 0);
        spr.setAlpha(Math.max(0, 1 - Math.max(0, t) / (hasDeath ? 0.6 : 1.0)));
      }
      spr.setPosition(this.x, this.y);
      return;
    }
    if (this.def.bot === 'wall' || this.def.static) {
      spr.setPosition(this.x, this.y);
      const W = this.w, nm = this.def.ref;
      if (this.def.bot === 'wall') {   // the fence: one long straight image laid on the ground (top-down)
        const key = this.def.vert ? 'fence_v' : 'fence_h'; if (W.textures.exists(key) && spr.texture.key !== key) spr.setTexture(key);
        if (W.textures.exists(key)) { const L = this.def.len || 300; const k = (L + 40) / (this.def.vert ? spr.height : spr.width); spr.setOrigin(0.5, 0.5).setScale(k).setPosition(this.x, this.y).setDepth(this.y - 6).setFlipX(false); if (this.def.tint) spr.setTint(this.def.tint); }
        return;
      }
      const st = this.def.anim || nm, fireKey = 'st_' + st + '_fire', idleKey = 'st_' + st + '_idle';
      if (W.textures.exists(fireKey)) {
        const n = W.textures.get(fireKey).frameTotal - 1;
        if (this.fireT > 0) { if (spr.texture.key !== fireKey) spr.setTexture(fireKey); spr.setFrame(Math.min(n - 1, Math.floor((1 - Math.min(1, this.fireT / (this.def.rapid ? 0.3 : 0.45))) * n * (this.def.rapid ? 1 : 0.999)) % n)); if (this.def.rapid) spr.setFrame(Math.floor(time / 45) % n); }
        else { const want = W.textures.exists(idleKey) ? idleKey : fireKey; if (spr.texture.key !== want) spr.setTexture(want); if (want === fireKey) spr.setFrame(0); }
        spr.setOrigin(0.5, 0.71).setScale(this.def.height / 150).setFlipX(this.ax < 0);   // 0.71 = feet row of the 192px cell: the turret stands on the ground, not above it
      } else {   // art not delivered yet: the old fire picture / flash
        const fk = nm + '_fire', want = this.fireT > 0 && W.textures.exists(fk) ? fk : nm; if (spr.texture.key !== want && W.textures.exists(want)) { const sc = spr.scaleX * spr.width; spr.setTexture(want); spr.setScale(sc / spr.width); }
      }
      return;
    }
    // fallback: procedural motion on the static reference image
    const t = time / 1000;
    let oy = 0, rot = 0, sx = this.baseScale, sy = this.baseScale, ox = 0;
    switch (this.state) {
      case 'walk': oy = -Math.abs(Math.sin(t * 9)) * 6; rot = Math.sin(t * 9) * 0.03; break;
      case 'run':  oy = -Math.abs(Math.sin(t * 14)) * 9; rot = 0.08 * this.facing; break;
      case 'idle': sy *= 1 + Math.sin(t * 3) * 0.01; break;
      case 'stun': rot = Math.sin(t * 30) * 0.06; break;
      case 'cast': {
        const p = this.stateT / this.stateDur;
        if (this.anim === 'attack') ox = Math.sin(p * Math.PI) * 18 * this.facing;
        else { sy *= 1 - Math.sin(p * Math.PI) * 0.06; sx *= 1 + Math.sin(p * Math.PI) * 0.05; oy = -Math.sin(p * Math.PI) * 10; }
        break;
      }
      case 'dead': rot = Math.min(1, this.stateT / 0.5) * 1.45 * -this.facing; oy = Math.min(1, this.stateT / 0.5) * 6; break;
    }
    spr.setScale(sx, sy).setRotation(rot).setPosition(this.x + ox, this.y + oy);
  }

  destroy() { this.w.byNid?.delete(this.nid); this.spr.destroy(); this.shadow.destroy(); this.ring?.destroy(); }
}

export { ABILITY_KEYS };

Object.assign(Fighter.prototype, JulioMixin, JosueMixin);
