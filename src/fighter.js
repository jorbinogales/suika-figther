import { CHAMPIONS, ABILITY_KEYS, MAX_LEVEL, MAX_RANK, ULT_LEVELS, rk } from './data.js';
import { ITEM_BY_ID, SLOTS, sellValue, buyPlan } from './items.js';

// World geometry: top-down map, one horizontal lane.
import { WORLD_W, WORLD_H, CAMPS, isWalk } from './mapdata.js';
export { WORLD_W, WORLD_H, CAMPS };
export const LANE_Y0 = 630, LANE_Y1 = 870;                 // middle lane (ARAM): the only open lane, minions walk it
export const LANES = [{ id: 'mid', y0: LANE_Y0, y1: LANE_Y1 }];
export const WALK_Y0 = 70, WALK_Y1 = WORLD_H - 70;
export const BODY_R = 28;               // ground radius used for hits

// Bot definitions (Leandro's ult).
export const BOT_DEFS = {
  drone: { name: 'Dron', isBot: true, bot: 'ranged', fly: true, stats: { hp: 160, mana: 0, atk: 0, ap: 0, armor: 10, mr: 10, speed: 230, run: 230, range: 340, atkCd: 0.8 }, height: 90 },
  bot_melee:  { name: 'Bot', isBot: true, bot: 'melee',  stats: { hp: 140, mana: 0, atk: 0, ap: 0, armor: 10, mr: 10, speed: 170, run: 170, range: 70,  atkCd: 0.8 }, height: 100 },
  bot_ranged: { name: 'Bot', isBot: true, bot: 'ranged', stats: { hp: 90,  mana: 0, atk: 0, ap: 0, armor: 5,  mr: 5,  speed: 150, run: 150, range: 340, atkCd: 1.0 }, height: 100 },
};

// Lane units. Blue = modern military, red = robots. Art: art/raw/objects/<tex>.png (all face right, the game flips them).
const mkMinion = (tex, name, height, stats, attack, reward) => ({ kind: 'minion', name, ref: tex, tex, height, stats: { mana: 0, atk: 0, ap: 0, mr: 10, run: stats.speed, ...stats }, attack, reward });
const mkTower = (tex, name, proj) => ({ kind: 'tower', name, ref: tex, tex, height: 205, radius: 42,
  stats: { hp: 1800, mana: 0, atk: 0, ap: 0, armor: 50, mr: 50, speed: 0, run: 0, range: 320, atkCd: 1.1 },
  attack: { type: 'ranged', dmg: 160, dmgType: 'physical', proj }, reward: { gold: 150, xp: 120 } });
export const UNIT_DEFS = {
  minion_blue_melee:  mkMinion('minion_blue_melee', 'Soldado', 110, { hp: 320, armor: 15, speed: 105, range: 70, atkCd: 1.0 }, { type: 'melee', dmg: 4.8, dmgType: 'physical', reach: 80 }, { gold: 20, xp: 28 }),
  minion_blue_ranged: mkMinion('minion_blue_ranged', 'Fusilero', 110, { hp: 220, armor: 8, speed: 105, range: 300, atkCd: 1.1 }, { type: 'ranged', dmg: 4.2, dmgType: 'physical', proj: { vfx: 'bullet_tracer', speed: 560, scale: 1.3, r: 10 } }, { gold: 16, xp: 22 }),
  minion_blue_tank:   mkMinion('minion_blue_tank', 'Tanque de guerra', 124, { hp: 500, armor: 20, mr: 20, speed: 85, range: 360, atkCd: 2.0 }, { type: 'ranged', dmg: 13.5, dmgType: 'physical', proj: { vfx: 'cannonball', speed: 420, scale: 2.2, r: 16 } }, { gold: 50, xp: 70 }),
  minion_red_melee:   mkMinion('minion_red_melee', 'Robot', 110, { hp: 320, armor: 15, speed: 105, range: 70, atkCd: 1.0 }, { type: 'melee', dmg: 4.8, dmgType: 'physical', reach: 80 }, { gold: 20, xp: 28 }),
  minion_red_ranged:  mkMinion('minion_red_ranged', 'Robot artillero', 110, { hp: 220, armor: 8, speed: 105, range: 300, atkCd: 1.1 }, { type: 'ranged', dmg: 4.2, dmgType: 'magic', proj: { vfx: 'plasma_shot', speed: 520, scale: 1.3, r: 10, tint: 0xff6a5a } }, { gold: 16, xp: 22 }),
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
// per-champion motion strength for the juice layer in renderInner (1 = base).
// Tuned one champion at a time with Elis, starting with Xeviche: his idle frames are near-identical,
// so he needs a much stronger procedural layer to read as alive.
const JUICE_MUL = { xeviche: 2.3 };

export class Fighter {
  constructor(world, key, team, x, y, opts = {}) {
    this.w = world;
    this.nid = opts.nid ?? world.nidNext++; world.byNid?.set(this.nid, this); this.pid = null;   // network id (same on every client for champions and towers)
    this.key = key;
    this.def = CHAMPIONS[key] || BOT_DEFS[key] || UNIT_DEFS[key];
    this.isBot = !!this.def.isBot;
    this.isMinion = this.def.kind === 'minion'; this.isNexus = this.def.kind === 'nexus'; this.isTower = this.def.kind === 'tower' || this.isNexus;
    this.isChamp = !this.isBot && !this.isMinion && !this.isTower;
    this.xp = 0; this.gold = this.isChamp ? 500 : 0;
    this.inv = Array(SLOTS).fill(null); this.it = this.zeroStats(); this.potions = []; this.potionCd = 0; this.recall = null; this.skin = key; this.buff = null;
    this.team = team; this.baseTeam = team;
    this.x = x; this.y = y;
    this.spawn = { x, y };
    this.owner = opts.owner || null;       // bots: the champion that summoned them
    this.ai = !!opts.ai; this.antivirus = !!opts.antivirus; this.lastTarget = null; this.invis = null; this.away = false;
    this.life = opts.life ?? Infinity;
    this.botAp = opts.botAp || 0;
    this.slot = opts.slot || { x: 0, y: 0 };
    this.ax = team === 0 ? 1 : -1; this.ay = 0;   // aim (unit vector on the ground)
    this.level = 1;
    this.points = this.isChamp ? 1 : 0;
    this.ranks = { p1: 0, p2: 0, p3: 0, ult: 0 };
    this.setupStacks = 0;
    this.basicCount = 0;
    this.kills = 0;
    this.reset();
    this.buildSprite();
  }

  /* ---------- items ---------- */
  zeroStats() { return { atk: 0, ap: 0, armor: 0, mr: 0, hp: 0, mana: 0, speed: 0, aspd: 0, lifesteal: 0, cdr: 0, hpRegen: 0, manaRegen: 0 }; }
  recomputeItems() {
    const hpR = this.hp / (this.maxHp || 1), mR = this.maxMana ? this.mana / this.maxMana : 0, t = this.zeroStats();
    this.inv.forEach(sl => { if (!sl) return; const st = ITEM_BY_ID[sl.id].stats; for (const k in st) t[k] += st[k]; });
    this.it = t;
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
    if (this.key !== 'xeviche' || !this.ranks.p3 || !this.alive) return;
    const a = this.def.abilities.p3, max = rk(a.maxStacks, this.ranks.p3), w = this.w;
    if (this.setupStacks >= max) { this.setupHits = 0; return; }
    if ((this.setupHits = (this.setupHits || 0) + 1) < rk(a.interval, this.ranks.p3)) return;
    this.setupHits = 0; this.setupStacks++;
    w.audio.playAll('a_xeviche_p3', { at: this, vol: 0.8, gap: 0 }); w.vfx('buff', this.x, this.cy, { scale: 3 }); w.float(this.x, this.y - this.def.height - 40, `Setup x${this.setupStacks}`, '#7ee0ff');
  }

  /* ---------- geometry ---------- */
  hiddenFor(me) { return this.away || ((this.invis || (this.antivirus && this.owner?.invis)) && this.baseTeam !== me.baseTeam); }
  breakInvis() { if (this.invis) { this.invis = null; if (this.key === 'luis') this.stab = 2.5; this.w.float(this.x, this.y - this.def.height - 30, 'visible', '#9be37a'); } }
  tryMove(nx, ny) {   // forest (trees / bushes) is impassable: slide along walls
    if (isWalk(nx, this.y)) this.x = nx;
    if (isWalk(this.x, ny)) this.y = ny;
  }
  get br() { return this.def.radius || BODY_R; }   // body radius for hits
  get facing() { return this.ax >= 0 ? 1 : -1; }
  get cy() { return this.y - this.def.height * 0.6; }        // chest height on screen
  setAim(dx, dy) {
    const l = Math.hypot(dx, dy);
    if (l > 1e-3) { this.ax = dx / l; this.ay = dy / l; }
  }

  /* ---------- stats ---------- */
  grow(stat) {
    const g = this.def.grow?.[stat] ?? 0;
    return this.def.stats[stat] * (1 + g * (this.level - 1));
  }
  pk(type) { return this.pkBuffs?.[type]?.m || 0; }   // temporary package buffs (Eliud's R): hp / atk / aspd / def
  get maxHp() { return (this.grow('hp') + this.it.hp) * (this.buff?.hpMult || 1) * (1 + this.pk('hp')); }
  get maxMana() { return this.def.rage ? 0 : this.def.stats.mana ? this.def.stats.mana + this.it.mana : 0; }
  get atk() { return (this.grow('atk') + this.it.atk) * (this.buff?.atkMult || 1) * (1 + this.pk('atk')); }
  get ap() { return this.isBot ? this.botAp : (this.grow('ap') + this.it.ap) * (1 + this.pk('atk')); }
  get armor() { return (this.def.stats.armor + this.it.armor) * (1 + this.pk('def')) + this.pk('def') * 30 + this.setupBonus('armorPer') + (this.hen ? this.def.hen.armor : 0); }
  get mr() { return (this.def.stats.mr + this.it.mr) * (1 + this.pk('def')) + this.pk('def') * 30 + this.setupBonus('mrPer') + (this.hen ? this.def.hen.mr : 0); }
  get atkRange() { const b = this.def.basic; return this.hen ? b.hen.reach : (b?.kind === 'melee' ? b.reach : this.def.stats.range); }
  get isRage() { return !!this.def.rage; }
  setupBonus(field) {
    if (this.key !== 'xeviche' || !this.ranks.p3) return 0;
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
    return base * (1 - this.slows.reduce((m, s) => Math.max(m, s.pct), 0)) * (1 + (this.speedT > 0 ? this.speedBoost : 0) + this.it.speed) * (this.hen ? 1 + this.def.hen.speed : 1);   // the giant hen runs faster
  }

  /* ---------- lifecycle ---------- */
  reset() {
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    this.alive = true;
    this.state = 'idle';
    this.stateT = 0; this.stateDur = 0;
    this.pending = null; this.fired = false;
    this.stunT = 0; this.slows = []; this.poisons = [];
    this.running = false;
    this.deadT = 0;
    this.in = { mx: 0, my: 0, run: false };
    this.setupStacks = 0; this.setupHits = 0; this.hitT = 0; this.flashing = false;
    this.cds = { p1: 0, p2: 0, p3: 0, ult: 0, basic: 0 };
    this.ink = null; this.inkDash = null; this.silenceT = 0; this.blindT = 0; this.shieldHp = 0; this.shieldT = 0; this.speedBoost = 0; this.speedT = 0; this.charmT = 0; this.team = this.baseTeam; this.malware = null;
    this.rage = 0; this.hen = false;
    this.dashCharges = this.key === 'jorbi' && this.ranks.p2 > 0 ? 3 : 0; this.dashTimers = []; this.dashV = null; this.castPoint = null;
    if (this.buff) { this.buff = null; this.setSkin(this.key); }
    this.hen = false; this.rage = 0; this.pkBuffs = {}; this.protein = null; this.pullTo = null; this.bike = null;
    if (this.skin !== this.key) this.setSkin(this.key);
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
  get xpNeed() { return Math.round(80 * Math.pow(1.28, this.level - 1)); }   // each level needs ~28% more XP than the last
  gainXp(n) {
    if (!this.isChamp || this.level >= MAX_LEVEL) return;
    this.xp += n;
    while (this.level < MAX_LEVEL && this.xp >= this.xpNeed) { this.xp -= this.xpNeed; this.levelUp(); }
    if (this.level >= MAX_LEVEL) this.xp = 0;
  }

  levelUp() {
    if (this.level >= MAX_LEVEL) return false;
    const ratio = this.hp / this.maxHp;
    this.level++; this.points++;
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

  spend(k) {
    if (this.w.net?.role === 'client') return this.canSpend(k) && this.w.net.op('spend', k);
    if (!this.canSpend(k)) return false;
    this.ranks[k]++; this.points--;
    this.w.audio.play('ui_upgrade', { gap: 0 });
    if (this.key === 'jorbi' && k === 'p2' && this.ranks.p2 === 1) this.dashCharges = 3;
    return true;
  }

  /* ---------- actions ---------- */
  get free() { return this.alive && this.stunT <= 0 && this.state !== 'cast'; }

  startAction(anim, windup, dur, fn) {
    this.state = 'cast'; this.anim = anim;
    this.stateT = 0; this.stateDur = dur; this.windup = windup;
    this.pending = fn; this.fired = false;
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
    const ok = this._tryCast(k); if (ok) { this.setupHit(); if (n?.role === 'host') n.sendCast(this, k); } return ok;
  }
  _tryBasic() {
    if (!this.free || this.cds.basic > 0) return false;
    this.cds.basic = this.def.stats.atkCd / (1 + this.pk('aspd') + this.it.aspd);
    if (this.invis) this.breakInvis();
    if (this.isBot) { this.startAction('attack', 0.2, 0.4, () => this.basicDo(() => this.botAttack())); return true; }
    if (this.isMinion || this.isTower) { this.startAction('attack', 0.15, 0.35, () => this.basicDo(() => this.unitAttack())); return true; }
    const b = this.hen ? { ...this.def.basic, ...this.def.basic.hen } : this.def.basic;
    this.basicCount++;
    // jorbi's passive: every 3rd basic attack is a heavy critical hit (own animation)
    const heavy = this.key === 'jorbi' && this.ranks.p3 > 0 && this.basicCount % 3 === 0;
    if (b.alt) {   // julio: odd = slow drawing, even = fast scribble
      const fast = this.basicCount % 2 === 0, m = fast ? b.fast : b.slow;
      this.cds.basic = m.cd; this.basicSpeed = m.speed;
      this.startAction(fast ? 'attack2' : 'attack', m.windup, m.dur, () => this.basicDo(() => this.fireBasic()));
      return true;
    }
    this.startAction(heavy ? 'attack3' : 'attack', heavy ? 0.4 : b.windup, heavy ? 0.7 : b.dur, () => this.basicDo(() => this.fireBasic(heavy)));
    return true;
  }

  _tryCast(k) {
    const a = this.def.abilities?.[k], rank = this.ranks[k];
    if (!a || !rank || a.passive || this.silenceT > 0 || this.charmT > 0) return false;
    if (this.key === 'jorbi' && k === 'p2') {   // instant dash, uses one charge
      if (!this.free || this.dashCharges <= 0) return false;
      const cost = rk(a.mana, rank);
      if (this.mana < cost && !this.w.debugFree) return false;
      if (!this.w.debugFree) this.mana -= cost;
      if (location.hash) console.log('dbg cast', k, rank);
      this.startDash(); return true;
    }
    if (!this.free || this.cds[k] > 0) return false;
    const cost = rk(a.mana, rank);
    if (this.mana < cost && !this.w.debugFree) return false;
    if (!this.w.debugFree) this.mana -= cost;
    this.cds[k] = this.w.debugFree ? 0.5 : rk(a.cd, rank);
    if (location.hash) console.log('dbg cast', k, rank);
    if (this.invis && !(this.key === 'luis' && k === 'p2')) this.breakInvis();
    const map = { p1: 'power1', p2: 'power2', p3: 'power3', ult: 'ult' };
    if (this.key === 'axel' && k === 'p1') { this.malware = ['virus', 'trojan', 'worm'][Math.random() * 3 | 0]; map.p1 = 'power1_' + this.malware; }
    this.startAction(map[k], a.windup, a.dur, () => { this.w.castCtx = { f: this, k }; this.fireAbility(k, a, rank); this.w.castCtx = null; });
    return true;
  }

  /* ---------- effects (champion specific) ---------- */
  fireBasic(heavy = false) {
    const b = this.hen ? { ...this.def.basic, ...this.def.basic.hen } : this.def.basic, w = this.w;
    w.audio.basic(this, heavy);
    if (b.kind === 'melee') {
      let dmg = b.base + this.atk * b.atkScale;
      if (heavy) dmg *= rk(this.def.abilities.p3.critMult, this.ranks.p3);
      w.meleeHits(this, b.reach + (heavy ? 15 : 0)).forEach(t => {
        w.damage(this, t, dmg, b.type); this.addRage(this.def.hen?.rageHit || 0);
        if (this.key === 'luis' && this.stab > 0 && t.isChamp && (t.ax * (this.x - t.x) + t.ay * (this.y - t.y)) < 0) {   // backstab after leaving invisibility: critical AI damage
          this.stab = 0; w.damage(this, t, 60 + this.ap * 2.2, 'magic'); w.float(t.x, t.y - t.def.height - 46, '¡APUÑALADA!', '#33ff88');  w.vfx('spark', t.x, t.cy, { scale: 5, tint: 0x33ff88 });
        }
        w.vfx(b.vfx, t.x, t.cy, { scale: heavy ? 5.5 : 3 });
        if (heavy) w.float(t.x, t.y - t.def.height - 28, '¡CRÍTICO!', '#ff9a2e');
      });
      return;
    }
    if (b.obj) {   // generic ranged physical attack that throws a sprite (axel's white laptop)
      w.projectile(this, { range: this.def.stats.range, onHit: this.key === 'eliud' ? () => this.addRage(this.def.hen.rageHit) : null, speed: this.basicSpeed || b.speed, dmg: b.alt ? b.base + this.ap * b.apScale : b.base + this.atk * b.atkScale, type: b.type, obj: b.obj, spin: !b.alt, scale: b.alt ? 0.2 : this.key === 'eliud' ? 0.12 : 0.17, r: 14 });
      return;
    }
    const big = this.basicCount % 3 === 0;
    let dmg = b.base + this.ap * b.apScale;
    if (big) dmg *= b.every3.mult;
    w.projectile(this, { range: this.def.stats.range, speed: b.speed, dmg, type: b.type, vfx: b.vfx, scale: big ? b.every3.scale * 2.4 : 2.2,
      tint: big ? 0x9ad7ff : null, big, r: big ? 22 : 14 });
  }

  fireAbility(k, a, rank) {
    const w = this.w;
    w.audio.ability(this, k);
    switch (this.key + ':' + k) {
      case 'leandro:p1': {
        const dmg = rk(a.dmg, rank) + this.ap * a.apScale, stun = rk(a.stun, rank);
        const c = this.castPoint || w.aiPoint(this, a.range); this.castPoint = null;
        w.zoneDecal(c.x, c.y, a.radius, 0x7dff5a, 1.6);
        w.cacti(c.x, c.y, a.radius);
        w.after(0.25, () => w.enemiesNear(this.team, c.x, c.y, a.radius).forEach(t => { w.damage(this, t, dmg, 'magic'); t.stun(stun); }));
        break;
      }
      case 'leandro:p2': {
        const total = rk(a.poisonApScale, rank) * this.ap, slow = rk(a.slow, rank);
        w.projectile(this, {
          speed: a.speed, dmg: rk(a.dmg, rank) + this.ap * a.apScale, type: 'magic', vfx: 'poison_dart', scale: 4.5, tint: 0xb0ff60, r: 18,
          onHit: t => { t.slow(slow, a.slowTime); t.poison(total / a.poisonTime, a.poisonTime, this); },
        });
        break;
      }
      case 'leandro:p3':
        {
        const c = this.castPoint || { x: this.x + this.ax * a.offset, y: this.y + this.ay * a.offset };
        this.castPoint = null;
        w.tires(this, c.x, c.y, rk(a.life, rank));
      }
        break;
      case 'leandro:ult': {
        w.vfx('summon', this.x, this.y - 10, { scale: 4 });
        w.summonBots(this, { melee: rk(a.melee, rank), ranged: rk(a.ranged, rank) }, a.life, a.botApScale * this.ap);
        break;
      }
      case 'julio:p1': {   // S-shaped ink laser: pierces everyone on the stroke
        const dmg = rk(a.dmg, rank) + this.ap * a.apScale, pts = w.sPath(this, a.length, a.amp, 40);
        w.inkTrail(pts, a.width, 2.4);
        w.enemiesOf(this).forEach(t => { if (w.nearPath(pts, t.x, t.y, a.width / 2 + BODY_R * 0.6)) { w.damage(this, t, dmg, 'magic'); w.applyInk(this, t); } });
        break;
      }
      case 'julio:p2': {   // ink-wave dash: hits everything crossed, marks
        const dist2 = rk(a.dashDist, rank), dur = 0.24;
        this.state = 'cast'; this.anim = 'power2'; this.stateT = 0.15; this.stateDur = dur + 0.15; this.fired = true;
        this.dashV = { x: this.ax * dist2 / dur, y: this.ay * dist2 / dur };
        this.inkDash = { hit: new Set(), dmg: rk(a.dmg, rank) + this.ap * a.apScale, ox: this.x, oy: this.y };
        break;
      }
      case 'julio:p3': {   // ink puddle
        const c = this.castPoint || w.aiPoint(this, a.range); this.castPoint = null;
        const r = rk(a.radius, rank);
        w.zones.push({ ctx: w.castCtx, kind: 'puddle', owner: this, x: c.x, y: c.y, r, t: rk(a.life, rank), slow: rk(a.slow, rank), stunAfter: rk(a.stunAfter, rank), stun: rk(a.stun, rank), inside: new Map(), decal: null });
        w.vfx('poison_hit', c.x, c.y - 10, { scale: 4, tint: 0x6a3cff, below: true });
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
      case 'hector:ult': {   // fiery bike dash through units
        const dist2 = rk(a.dist, rank), dur = 0.75;
        this.setSkin('hector_bike'); this.playAnim('run');
        this.state = 'cast'; this.anim = 'run'; this.stateT = 0; this.stateDur = dur; this.windup = 99; this.fired = true;
        this.dashV = { x: this.ax * dist2 / dur, y: this.ay * dist2 / dur };
        this.bike = { hit: new Set(), dmg: rk(a.dmg, rank) + this.atk * a.atkScale, stun: rk(a.stun, rank), fire: rk(a.fireDmg, rank) + this.atk * 0.25, fireTime: a.fireTime, lx: this.x, ly: this.y };
        
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
              } else { if (first) w.float(t.x, t.y - t.def.height - 28, 'CEGADO', '#9be37a'); w.markSrc(t, 'blind'); t.blindT = Math.max(t.blindT, rk(a.blind, rank) * (first ? 1 : 0.6)); }
            };
            w.zones.push({ ctx: w.castCtx, kind: 'malware', owner: this, x, y, r: a.radius, t: life, type, col, apply, first: new Set(), cd: new Map(), decal: null, icon: null });
          } });
        break;
      }
      case 'axel:p2': {   // healing zone that follows him
        w.zones.push({ ctx: w.castCtx, owner: this, t: rk(a.life, rank), r: rk(a.radius, rank), hps: rk(a.hps, rank) + this.ap * a.apScale, tick: 0, decal: null });
        w.vfx('heal', this.x, this.cy, { scale: 5 });
        break;
      }
      case 'axel:p3': {   // shield + speed for him and nearby allies
        w.fighters.filter(f => f.isChamp && f.alive && f.team === this.team && dist(f, this) <= a.radius).forEach(f => {
          w.markSrc(f, 'shield'); w.markSrc(f, 'speed');
          f.shieldHp = rk(a.shield, rank) + this.ap * a.apScale; f.shieldT = rk(a.time, rank);
          f.speedBoost = rk(a.speedBoost, rank); f.speedT = rk(a.time, rank);
        });
        w.float(this.x, this.y - this.def.height - 34, '¡Escudo!', '#7ee0ff');
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
      case 'jorbi:ult': {   // Peneflexionada: stronger form, faster cooldowns
        const hpBefore = this.maxHp;
        w.markSrc(this, 'buff');
        this.buff = { t: rk(a.duration, rank), hpMult: rk(a.hpMult, rank), atkMult: rk(a.atkMult, rank), cdSpeed: rk(a.cdSpeed, rank) };
        this.hp += this.maxHp - hpBefore;
        if (this.w.hasAnims(this.key + '_buff')) this.setSkin(this.key + '_buff');
        else this.setSkin(this.key + '_buff');
        w.zoneDecal(this.x, this.y - 6, 110, 0xff5a4a, 1.4);
        w.vfx('buff', this.x, this.cy, { scale: 4 });
        
        w.float(this.x, this.y - this.def.height - 34, '¡PENEFLEXIONADA!', '#ff6a4a');
        break;
      }
      case 'xeviche:p1': {
        const dmg = rk(a.dmg, rank) + this.atk * a.atkScale, stun = rk(a.stun, rank);
        // throw the actual LEGO brick (the ability icon art) spinning, not a red-tinted rock
        w.projectile(this, { speed: a.speed, dmg, type: 'physical', obj: 'icon_xeviche_p1', scale: 0.72, spin: true, spinSpeed: 3.8, r: 26,
          onHit: t => t.stun(stun) });
        break;
      }
      case 'xeviche:p2':
        this.heal(rk(a.heal, rank) + rk(a.healHpPct, rank) * this.maxHp);
        w.vfx('heal', this.x, this.cy, { scale: 5 });
        break;
      case 'xeviche:p3':
        this.setupStacks = Math.min(rk(a.maxStacks, rank), this.setupStacks + 1);
        w.vfx('buff', this.x, this.cy, { scale: 5 });
        w.float(this.x, this.y - this.def.height - 40, `Setup x${this.setupStacks}`, '#7ee0ff');
        break;
      case 'xeviche:ult': {
        const r = rk(a.radius, rank), dmg = rk(a.dmg, rank) + this.atk * a.atkScale, stun = rk(a.stun, rank);
        w.vfx('shockwave', this.x, this.y - 10, { scale: r / 32 * 1.3, below: true });
        w.zoneDecal(this.x, this.y - 10, r, 0xff7a4a, 1.2);
        w.shake();
        w.enemiesWithin(this, r).forEach(t => { w.damage(this, t, dmg, 'physical'); t.stun(stun); });
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
    if (a.type === 'melee') { w.damage(this, t, a.dmg, a.dmgType); w.vfx('spark', t.x, t.cy, { scale: 2.2 }); }
    else w.projectile(this, { range: this.def.stats.range + 60, speed: a.proj.speed, dmg: a.dmg, type: a.dmgType, vfx: a.proj.vfx, scale: a.proj.scale, tint: a.proj.tint, r: a.proj.r });
  }

  botAttack() {
    this.w.audio.attack(this);
    if (this.antivirus) { if (this.owner?.invis) return; const lt = this.owner?.lastTarget, t = lt?.alive && !lt.away && Math.hypot(lt.x - this.x, lt.y - this.y) < 750 ? lt : this.w.nearestEnemy(this, 400); if (t?.alive && !t.away) { this.setAim(t.x - this.x, t.y - this.y); this.w.laser(this, t, this.botAp); } return; }
    const t = this.w.nearestEnemy(this, this.def.stats.range + 40);
    if (!t) return;
    this.setAim(t.x - this.x, t.y - this.y);
    if (this.def.bot === 'melee') {
      this.w.damage(this, t, this.botAp, 'magic');
      this.w.vfx('spark', t.x, t.cy, { scale: 2.5 });
    } else {
      this.w.projectile(this, { range: this.def.stats.range + 60, speed: 420, dmg: this.botAp, type: 'magic', vfx: 'energy_bolt', scale: 1.6, tint: 0x66ffcc, r: 12 });
    }
  }

  /* ---------- status ---------- */
  stun(t) {
    if (!this.alive || this.isTower) return;
    this.stunT = Math.max(this.stunT, t); this.state = 'stun'; this.pending = null; this.w.markSrc(this, 'stun');
    this.w.float(this.x, this.y - this.def.height - 30, 'STUN', '#ffd23f');
    this.w.audio.play('stun', { at: this, vol: 0.8 });
  }
  slow(pct, t) {
    if (this.isTower) return; this.slows.push({ pct, t }); this.w.markSrc(this, 'slow'); }
  poison(dps, t, src) {
    if (this.isTower) return; this.poisons.push({ dps, t, src, tick: 0 }); this.w.markSrc(this, 'poison'); }
  // active effects for the HUD status bar: [{id, name, sub, icon, t (seconds, null = no timer), bad, desc}]
  statusList() {
    const L = [], me = this, add = (id, label, t, bad, desc, extra = {}) => {
      const sr = me.srcs?.[id] || null;
      L.push({ id, label, t, bad, icon: sr?.icon || extra.icon || null, name: sr ? sr.name : (extra.name || label), by: sr ? sr.champ : (extra.by || null), desc: sr ? sr.desc : (extra.desc || desc), tint: extra.tint || (bad ? 0xff5a5a : 0x5dff8a) });
    };
    if (this.stunT > 0) add('stun', 'Aturdido', this.stunT, true, 'No puedes moverte, atacar ni usar poderes.');
    if (this.silenceT > 0) add('silence', 'Silenciado', this.silenceT, true, 'No puedes usar poderes.');
    if (this.blindT > 0) add('blind', 'Cegado', this.blindT, true, 'Tu visión se reduce a una zona pequeña a tu alrededor.');
    if (this.charmT > 0) add('charm', 'Controlado', this.charmT, true, 'Luchas para el enemigo y no puedes usar poderes.');
    if (this.slows.length) add('slow', 'Ralentizado', Math.max(...this.slows.map(s => s.t)), true, 'Te mueves más lento.');
    if (this.poisons.length) add('poison', 'Envenenado', Math.max(...this.poisons.map(p => p.t)), true, 'Recibes daño cada medio segundo.');
    if (this.ink && this.ink.t > 0) add('ink', 'Marcado con tinta', this.ink.t, true, 'Tu siguiente daño de Julio hace explotar la tinta.');
    if (this.shieldHp > 0) add('shield', `Escudo ${Math.round(this.shieldHp)}`, this.shieldT, false, 'Absorbe daño.');
    if (this.speedT > 0) add('speed', 'Velocidad extra', this.speedT, false, 'Te mueves más rápido.');
    if (this.recall) add('recall', 'Teletransporte', this.recall.t, false, 'Volverás a tu base. Se cancela si recibes daño.', { icon: 'item_teleport_base', name: 'Teleport a la base' });
    if (this.potions.length) add('potion', 'Poción', Math.max(...this.potions.map(p => p.t)), false, 'Recuperas vida y maná con el tiempo.', { icon: 'item_pocion_vida_peq', name: 'Poción' });
    if (this.protein) add('protein', 'Curación (proteína)', this.protein.t, false, 'Te curas con el tiempo hasta recibir daño.');
    if (this.invis) add('invis', 'Invisible', null, false, 'Los enemigos no te ven (solo las torretas).');
    if (this.hen) add('hen', `Gallina ${Math.ceil(this.henHp)}`, null, false, 'Montas una gallina gigante: más ataque, defensa y velocidad. Absorbe daño hasta agotarse.', { icon: 'icon_eliud_p1', name: 'Gallina gigante', by: this.def.name });
    if (this.buff && !this.hen) add('buff', 'Transformación', this.buff.t, false, 'Más vida y ataque, poderes más rápidos.');
    if (this.pkBuffs) for (const k in this.pkBuffs) { const N = { hp: 'Vida extra', atk: 'Daño +', aspd: 'Vel. ataque +', def: 'Defensa +' }[k]; add('pk_' + k, N, this.pkBuffs[k].t, false, 'Mejora temporal de un paquete.', { icon: 'icon_eliud_ult', name: 'Paquete sorpresa', by: 'Eliud' }); }
    if (this.key === 'xeviche' && this.setupStacks > 0) add('setup', `Setup x${this.setupStacks}`, null, false, 'Piezas de setup: más armadura y resistencia a IA.', { icon: 'icon_xeviche_p3', name: 'Setup', by: this.def.name });
    return L;
  }

  heal(n) {
    if (this.isTower) return;
    const h = Math.min(n, this.maxHp - this.hp);
    this.hp += h;
    if (h > 0) this.w.float(this.x, this.y - this.def.height - 10, `+${Math.round(h)}`, '#5dff8a');
  }

  die(killer) {
    this.alive = false; this.state = 'dead';
    this.stateT = 0; this.deadT = 0; this.pending = null; this.stunT = 0;
    this.slows = []; this.poisons = [];
    this.playAnim('death', 0.9);
    {
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
    const k = `${this.key}_destroy`, showRubble = () => { if (this.w.textures.exists(`${this.key}_rubble`)) this.spr.stop().setTexture(`${this.key}_rubble`, 0); else this.spr.setTint(0x333333); };
    try { this.spr.renderFilters = false; } catch (e) { /* no filters */ }   // drop the team glow
    this.shadow.setVisible(false);
    if (this.w.anims.exists(k)) { this.spr.play({ key: k, repeat: 0 }); this.spr.once('animationcomplete', showRubble); } else showRubble();
  }

  /* ---------- per-frame ---------- */
  update(dt) {
    const w = this.w;
    if (!this.alive) {
      this.deadT += dt; this.stateT += dt;
      if (this.isBot || this.isMinion) { if (this.deadT > 2.6) this.dispose = true; }   // corpse stays ~2s, then fades
      else if (!this.isTower && this.deadT > this.respawnTime && this.w.net?.role !== 'client') {
        const keep = { ...this.cds };   // cooldowns freeze while dead and resume where they were
        this.x = this.spawn.x; this.y = this.spawn.y; this.reset(); this.cds = keep; this.playAnim('idle');
      }
      return;
    }
    if (this.isBot) {
      this.life -= dt;
      if (this.life <= 0 || (this.owner && !this.owner.alive)) { this.dispose = true; return; }
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
    if (this.isChamp) {   // item regen, passive income and the base fountain
      this.hp = Math.min(this.maxHp, this.hp + this.it.hpRegen * dt);
      if (this.maxMana) this.mana = Math.min(this.maxMana, this.mana + this.it.manaRegen * dt);
      this.gold += dt * 3.2;
      if (w.inBase(this)) { this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.10 * dt); if (this.maxMana) this.mana = Math.min(this.maxMana, this.mana + this.maxMana * 0.10 * dt); }
    }
    if (this.recall) { if ((this.recall.t -= dt) <= 0) { this.recall = null; w.vfx('summon', this.x, this.y - 10, { scale: 4 }); this.x = this.spawn.x; this.y = this.spawn.y; w.vfx('summon', this.x, this.y - 10, { scale: 4 }); w.audio.play('ui_open', { at: this, gap: 0 }); } else if (this.stunT > 0) this.recall = null; }
    if (this.protein) {   // healing over time; any damage breaks it (see world.damage)
      this.protein.t -= dt; this.protein.tick += dt;
      if (this.protein.t <= 0) this.protein = null;
      else if (this.protein.tick >= 0.5) { this.protein.tick -= 0.5; this.heal(this.protein.hps * 0.5); if (Math.random() < 0.6) w.vfx('heal', this.x + (Math.random() - 0.5) * 40, this.cy + (Math.random() - 0.5) * 30, { scale: 2, tint: 0x66ff99, alpha: 0.9 }); }
    }
    if (this.stab > 0) this.stab -= dt;
    if (this.isRage && !this.hen && this.rage > 0) { this.rageIdle = (this.rageIdle || 0) + dt; if (this.rageIdle > 2) this.rage = Math.max(0, this.rage - dt * 6); }   // no fighting for 2 s: rage drains
    if (this.hunted && (this.hunted.t -= dt) <= 0) this.hunted = null;
    if (this.silenceT > 0) this.silenceT -= dt;
    if (this.blindT > 0) this.blindT -= dt;
    if (this.speedT > 0 && (this.speedT -= dt) <= 0) this.speedBoost = 0;
    if (this.shieldT > 0 && (this.shieldT -= dt) <= 0) this.shieldHp = 0;
    if (this.charmT > 0 && (this.charmT -= dt) <= 0) { this.team = this.baseTeam; this.w.float(this.x, this.y - this.def.height - 28, 'libre', '#ffffff'); }
    if (this.key === 'jorbi' && this.dashTimers.length) {   // per-charge recharge (faster while transformed)
      const sp = this.buff ? this.buff.cdSpeed : 1;
      this.dashTimers = this.dashTimers.map(t => t - dt * sp).filter(t => { if (t <= 0) { this.dashCharges++; return false; } return true; });
    }
    if (this.key === 'jorbi') this.cds.p2 = this.dashCharges > 0 || !this.dashTimers.length ? 0 : Math.min(...this.dashTimers);
    if (this.buff && (this.buff.t -= dt) <= 0) this.endBuff();
    if (this.maxMana) this.mana = Math.min(this.maxMana, this.mana + dt * (w.debugFree ? 99 : 0.5));
    if (!this.isTower) this.hp = Math.min(this.maxHp, this.hp + dt * this.maxHp * 0.004);   // structures never regenerate
    if (this.isChamp && this.ai && this.retreat && Math.hypot(this.x - this.spawn.x, this.y - this.spawn.y) < 260) { this.hp = Math.min(this.maxHp, this.hp + dt * this.maxHp * 0.07); this.mana = Math.min(this.maxMana, this.mana + dt * this.maxMana * 0.05); }   // base fountain for retreating AI
    this.slows = this.slows.filter(s => (s.t -= dt) > 0);
    this.poisons = this.poisons.filter(p => {
      p.t -= dt; p.tick += dt;
      if (p.tick >= 0.5) { p.tick -= 0.5; w.damage(p.src, this, p.dps * 0.5, 'true', true); }
      return p.t > 0 && this.alive;
    });
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
        this.tryMove(clamp(this.x + this.dashV.x * dt, 60, WORLD_W - 60), clamp(this.y + this.dashV.y * dt, WALK_Y0, WALK_Y1));
        if (Math.random() < 0.5) w.vfx('run_dust', this.x, this.y - 6, { scale: 1.6, alpha: 0.6, below: true });
        if (this.stateT >= this.stateDur) { this.dashV = null; if (this.inkDash) this.inkDash = null; if (this.bike) { this.bike = null; this.setSkin(this.key); } }
      }
      if (!this.fired && this.stateT >= this.windup) { this.fired = true; this.pending?.(); }
      if (this.stateT >= this.stateDur) { this.state = 'idle'; this.playAnim('idle'); }
      return;
    }

    const { mx, my, run } = this.in, len = Math.hypot(mx, my);
    this.running = run && len > 0;
    if (len > 0) {
      // walking against where you aim: the character turns to face where it walks (no backpedaling, no slowdown); attacks and powers still aim at the cursor
      const nx = mx / len, ny = my / len, dot = nx * this.ax + ny * this.ay;
      this.turn = dot < -0.2 && Math.abs(nx) > 0.2 ? (nx >= 0 ? 1 : -1) : 0;
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
    this.dirFrames = this.isTower && s.textures.exists(`${this.key}_aim`);       // tower: 8 aim directions (E,SE,S,SW,W,NW,N,NE)
    this.hasAnims = !this.dirFrames && s.hasAnims(this.key);
    const tex = this.dirFrames ? `${this.key}_aim` : this.hasAnims ? (s.textures.exists(`${this.key}_idle`) ? `${this.key}_idle` : `${this.key}_walk`) : (this.def.ref || this.key);
    this.shadow = s.add.image(this.x, this.y, 'shadow').setAlpha(0.45).setScale(this.def.height / 32 * 0.8, this.def.height / 32 * 0.4);
    this.spr = s.add.sprite(this.x, this.y, tex);
    if (this.dirFrames) {
      this.spr.setOrigin(0.5, 0.89).setScale(this.def.height / 190);
    } else if (this.hasAnims) {
      this.spr.setOrigin(0.5, 0.89).setScale(this.def.height / 190);
      this.spr.play(`${this.key}_idle`);
    } else if (this.isBot || this.isMinion || this.isTower) {
      this.spr.setOrigin(0.5, 0.95).setScale(this.def.height / this.spr.height);
    } else {
      this.spr.setOrigin(0.5, 0.97).setScale(this.def.height / 1330);
    }
    this.baseScale = this.spr.scaleX;
    this.tintBot();
    // ground ring under every champion: green = in use, blue = ally, red = enemy (always below the sprite)
    if (this.isChamp) this.ring = s.add.ellipse(this.x, this.y, this.def.height * 0.85, this.def.height * 0.34, 0xffffff, 0.1).setStrokeStyle(3, 0xffffff, 0.85);
  }

  tintBot() { if (this.antivirus && this.hasAnims) return; if (this.antivirus) { this.spr.setTint(0xa0ffc0); return; } if (this.isBot && !this.hasAnims) this.spr.setTint(this.team === 0 ? 0xb8fff0 : 0xffb8a8); }

  playAnim(name, dur, reverse = false) {
    if (!this.hasAnims) return;
    let key = `${this.skin}_${name}`;
    if (!this.w.anims.exists(key)) key = `${this.key}_${name}`;
    if (!this.w.anims.exists(key)) return;
    const anim = this.w.anims.get(key);
    const cfg = { key, repeat: anim.repeat };
    if (dur) cfg.frameRate = anim.getTotalFrames() / dur;
    reverse ? this.spr.playReverse(cfg) : this.spr.play(cfg);
  }

  flash() { this.flashing = true; this.hitT = 1; this.spr.setTint(0xff5555); this.w.after(0.09, () => { this.flashing = false; this.spr.clearTint(); this.tintBot(); }); }

  // team marker: green = champion in use, blue = ally, red = enemy. A ground ring (cheap); the per-sprite WebGL glow filter it replaced
  // cost 2-4x the frame time once a few dozen units were on screen (the main cause of lag in big matches).
  outline() {
    const me = this.w.player;
    if (!me || this.outlined) return;
    this.outlined = true;
    if (this.ring) return;   // champions already have their ring (buildSprite)
    const col = this.team === me.baseTeam ? 0x3b82f6 : 0xff3b3b, wd = this.isTower ? (this.def.radius || 40) * 2.1 : this.def.height * 0.6;
    this.ring = this.w.add.ellipse(this.x, this.y, wd, wd * (this.isTower ? 0.5 : 0.4), col, 0.14).setStrokeStyle(2, col, 0.75);
  }

  // blinded player: only units inside the (blurred) vision area can be seen
  render(time) {
    this.renderInner(time);
    const m = this.w.blindVis(this);
    if (m < 1) { this.spr.setAlpha(this.spr.alpha * m); this.shadow.setAlpha(this.shadow.alpha * m); this.ring?.setAlpha(m); if (m <= 0) this.ring?.setVisible(false); }
  }

  renderInner(time) {
    const spr = this.spr;
    this.outline();
    const face = this.turn && (this.state === 'walk' || this.state === 'run') ? this.turn : this.facing;   // while walking away from the aim the sprite faces its walking direction
    spr.setFlipX(this.isTower ? false : face < 0);
    if (this.isChamp && this.alive && this.state !== 'dead') { if (this.charmT > 0) spr.setTint(0xffe9a0); else if (this.silenceT > 0) spr.setTint(0xd9b0ff); else if (!this.flashing) spr.clearTint(); }
    spr.setDepth(this.y).setAlpha(this.alive ? 1 : this.isTower && !this.dirFrames ? 0.35 : 0.92);
    if (this.ring) {
      const me = this.w.player, col = this === me ? 0x3ddc84 : this.team === me.baseTeam ? 0x3b82f6 : 0xff3b3b, sel = this.w.selected === this;
      this.ring.setPosition(this.x, this.y).setDepth(this.y - 3).setVisible(this.alive && !this.hiddenFor(me));
      const rk = col * 4 + (sel ? 1 : 0) + (this.isChamp ? 2 : 0);
      if (rk !== this.ringKey) { this.ringKey = rk; this.isChamp ? this.ring.setStrokeStyle(sel ? 5 : 3, col, sel ? 1 : 0.85).setFillStyle(col, sel ? 0.22 : 0.1) : this.ring.setStrokeStyle(sel ? 3 : 2, col, sel ? 1 : 0.75).setFillStyle(col, sel ? 0.25 : 0.14); }   // restyle only when something changed
    }
    this.shadow.setPosition(this.x, this.y).setDepth(this.y - 1).setAlpha(this.alive ? 0.45 : 0.25);
    if (this.away || this.invis || (this.antivirus && this.owner?.invis)) { const hid = this.hiddenFor(this.w.player), al = hid ? 0 : 0.4; spr.setAlpha(al); this.shadow.setAlpha(al * 0.45); }
    if (this.isTower && !this.alive) { spr.setPosition(this.x, this.y).setAlpha(1).setDepth(this.y - 4); return; }   // wreck/rubble stays on the ground
    if (this.dirFrames) {   // tower: pick the sprite that points where it shoots
      if (!this.alive) { spr.setPosition(this.x, this.y).setAlpha(1).setDepth(this.y - 4); return; }   // wreck/rubble stays on the ground
      spr.setFrame(((Math.round(Math.atan2(this.ay, this.ax) / (Math.PI / 4)) % 8) + 8) % 8).setPosition(this.x, this.y);
      return;
    }
    if (this.hasAnims && this.def.fly && this.alive) { if (this.owner?.invis) { const hid = this.hiddenFor(this.w.player); spr.setAlpha(hid ? 0 : 0.4); } else spr.setAlpha(1); const bob = Math.sin(time / 260 + this.nid * 1.7) * 5; spr.setPosition(this.x, this.y - 50 + bob); this.shadow.setPosition(this.x, this.y).setScale(this.def.height / 32 * 0.4, this.def.height / 32 * 0.2).setAlpha(0.3); return; }
    if (this.hasAnims) {
      if (!this.alive && !this.isChamp) {   // corpses: hold the last death frame, then fade out
        const hasDeath = this.w.anims.exists(`${this.key}_death`), t = this.stateT - (hasDeath ? 2.0 : 0);
        spr.setAlpha(Math.max(0, 1 - Math.max(0, t) / (hasDeath ? 0.6 : 1.0)));
      }
      // juice: procedural motion layered over the sprite frames (purely visual; never touches position/logic).
      // Animated units used to render at the raw x/y with no weight at all, which is why they felt like gliding cutouts.
      const tt = time / 1000, ph = this.nid * 1.37;   // per-unit phase so a crowd doesn't bob in sync
      const jm = JUICE_MUL[this.key] || 1;   // per-champion motion strength
      const wj = 1 + (jm - 1) * 0.3;   // locomotion stays gentler: the walk/run frames already sway, a strong layer on top reads as wobbling
      let oy = 0, rot = 0, sx = this.baseScale, sy = this.baseScale, ox = 0;
      if (this.alive) {
        if (this.state === 'idle') { const b = Math.sin(tt * 2.6 + ph); sy *= 1 + b * 0.015 * jm; sx *= 1 - b * 0.007 * jm; oy = -Math.abs(b) * 1.4 * jm; rot = Math.sin(tt * 1.3 + ph) * 0.012 * jm; }   // breathing + sway (carries champions whose idle frames barely change)
        else if (this.state === 'walk') { oy = -Math.abs(Math.sin(tt * 10.5 + ph)) * 3.2 * wj; }
        else if (this.state === 'run') { oy = -Math.abs(Math.sin(tt * 14.7 + ph)) * 4.5 * wj; rot = 0.055 * this.facing; }
        else if (this.state === 'stun') { rot = Math.sin(tt * 26) * 0.05 * Math.min(jm, 1.8); }
        else if (this.state === 'cast' && this.stateDur > 0) {
          const p = Math.min(1, Math.max(0, this.stateT / this.stateDur)), s = Math.sin(p * Math.PI);
          if (this.anim === 'attack' || this.anim === 'attack2' || this.anim === 'attack3') ox = s * 13 * Math.min(jm, 2) * this.facing;   // lunge into the hit
          else if (this.anim === 'dash') rot = 0.12 * this.facing;
          else if (this.anim === 'run') { oy = -Math.abs(Math.sin(tt * 14.7 + ph)) * 4.5 * wj; rot = 0.055 * this.facing; }   // bike form keeps its run motion
          else { sy *= 1 - s * 0.05 * jm; sx *= 1 + s * 0.04 * jm; oy = -s * 7 * jm; }   // power wind-up squash
        }
        if (this.hitT > 0) {   // impact squash when hit (flash() arms hitT)
          const dtR = this._rt == null ? 0 : Math.min(0.05, (time - this._rt) / 1000);
          this.hitT = Math.max(0, this.hitT - dtR * 7);
          const e = this.hitT * this.hitT; sx *= 1 + e * 0.09 * Math.min(jm, 1.7); sy *= 1 - e * 0.09 * Math.min(jm, 1.7);
        }
        // keep the walk/run cycle in step with the real speed (slows, boosts, items)
        if (spr.anims) { const nom = this.state === 'run' ? this.def.stats.run : this.def.stats.speed; spr.anims.timeScale = (this.state === 'walk' || this.state === 'run') && nom > 0 ? clamp(this.speed / nom, 0.55, 1.7) : 1; }
      } else if (this.isChamp) {   // death: settle into the ground as the death frames play
        const k = Math.min(1, this.stateT / 0.8); oy = k * 5; rot = k * 0.1 * -this.facing;
      }
      this._rt = time;
      spr.setScale(sx, sy).setRotation(rot).setPosition(this.x + ox, this.y + oy);
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
