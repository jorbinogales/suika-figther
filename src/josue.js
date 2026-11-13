// Josué + his Rottweiler (CHAMPIONS.josue in data.js). The champion Fighter is ALWAYS the body the player drives; the other body is a bot
// Fighter ('josue_dog', owner = the champion) that follows it with AI. Fiel compañero (R) swaps the two bodies: positions, health and
// statuses are exchanged and each one changes kit / skin, so the HUD, items, gold, XP and the network keep working on the same champion.
// Life rule: each body has its own health. If the driven one falls while the partner stands, control jumps to the partner (no death is
// counted) and the fallen one comes back after the respawn time. The champion only dies when both are down.
// Online the host owns all of it; clients get the form (jd / jf), the hunt (jh) and the bloodthirst (bt) in every snapshot (netgame.js).
import { josueDog, rk } from './data.js';
import { isWalk } from './mapdata.js';

const YR = 0.75, BR = 28;   // same as world.js / fighter.js (ground ellipse ratio, body radius): copied to keep this module free of import cycles
const eDist = (ax, ay, bx, by) => Math.hypot(ax - bx, (ay - by) / YR);
const SLOTS = ['p1', 'p2', 'p3'];
const DOG_FB = 'roach';   // stand-in for the Rottweiler until art/raw/josue_dog exists (tinted with phTint)

// the partner bot in its two forms (the champion's stats are copied onto it every frame, see josueSyncPal)
export const PAL_DOG = { name: 'Rottweiler', isBot: true, bot: 'melee', pal: true, phys: true, art: 'josue_dog', artFallback: DOG_FB, phTint: 0x6a4a3a, height: 108,
  stats: { hp: 560, mana: 0, atk: 0, ap: 0, armor: 20, mr: 18, speed: 172, run: 262, range: 70, atkCd: 0.8 } };
const PAL_ARCHER = { ...PAL_DOG, name: 'Josué', bot: 'ranged', art: 'josue', artFallback: 'eliud', phTint: null, height: 122, stats: { ...PAL_DOG.stats, range: 440, atkCd: 1.0 } };

const artOf = (w, id, fb) => (w.sprites?.[id] ? id : fb);

/* ===================== Fighter ===================== */
export const JosueMixin = {
  duoInit() { this.duo = true; this.defN = this.def; this.defDog = josueDog(this.def); this.dogForm = false; this.cds2 = { p1: 0, p2: 0, p3: 0 }; this.ranks.ult = 1; },
  dogSkin() { return artOf(this.w, 'josue_dog', DOG_FB); },
  // sprite / shadow size of the current body (the archer and the dog have different heights)
  fitBody() {
    if (!this.spr) return;
    if (this.hasAnims) { this.spr.setScale(this.def.height / 190); this.baseScale = this.spr.scaleX; }
    this.shadow?.setScale(this.def.height / 32 * 0.8, this.def.height / 32 * 0.4);
  },
  setDuoForm(dog) {   // the champion becomes the dog (or Josué again); Q / F / E keep a cooldown per form
    dog = !!dog; if (dog === !!this.dogForm) return;
    this.dogForm = dog; this.def = dog ? this.defDog : this.defN; this.comboStep = 0; this.cstepN = 0; this.holdPose = false;
    for (const k of SLOTS) { const t = this.cds[k]; this.cds[k] = this.cds2[k]; this.cds2[k] = t; }
    this.fitBody(); if (this.spr) this.setSkin(dog ? this.dogSkin() : this.art); else this.skin = dog ? this.dogSkin() : this.art;
  },
  setPalForm(dog) {   // the partner bot: dog or archer
    dog = !!dog; if (dog === this.palDog) return;
    const T = dog ? PAL_DOG : PAL_ARCHER; this.palDog = dog;
    this.def = { ...T, stats: { ...T.stats, hp: this.def.stats.hp } };
    const sk = artOf(this.w, T.art, T.artFallback); this.placeholder = sk !== T.art;
    this.fitBody(); if (this.spr) { this.spr.clearTint(); this.tintBot(); this.setSkin(sk); } else this.skin = sk;
  },
  josueReset() { if (this.hunt) this.invis = null; this.hunt = null; this.bloodT = 0; this.palDownT = 0; if (this.dogForm && this.spr) this.setSkin(this.dogSkin()); },
  josueRespawn() { if (this.dogForm) this.setDuoForm(false); },   // back at the base: Josué again (the partner comes back with him)

  josueTick(dt) {
    const sp = 1 + (this.it?.cdr || 0); for (const k of SLOTS) if (this.cds2[k] > 0) this.cds2[k] = Math.max(0, this.cds2[k] - dt * sp);   // the other form's cooldowns keep running
    if (this.bloodT > 0) this.bloodT -= dt;
    if (this.hunt && !this.invis) this.josueHuntEnd();
    const w = this.w;
    if (w.net?.role === 'client') { if (!this.pal?.alive || this.pal.dispose) this.pal = w.fighters.find(f => f.owner === this && f.def.pal && f.alive) || null; return; }   // the host spawns it; clients just find it
    let c = this.pal; if (c && (c.dispose || !w.fighters.includes(c))) c = this.pal = null;
    if (!c?.alive) { if (this.palDownT == null) this.palDownT = this.respawnTime; if ((this.palDownT -= dt) <= 0) { this.palDownT = null; this.spawnPal(); } return; }
    if (c.palDog === !!this.dogForm) c.setPalForm(!this.dogForm);
    c.slot = { x: -this.facing * 75, y: 30 };
    this.josueSyncPal(c);
  },
  spawnPal() {
    const w = this.w; let x = this.x - this.facing * 70, y = this.y + 28; if (!isWalk(x, y)) { x = this.x; y = this.y; }
    const c = new this.constructor(w, 'josue_dog', this.baseTeam, x, y, { ai: true, owner: this });
    c.team = this.team; c.slot = { x: -this.facing * 75, y: 30 }; c.setPalForm(!this.dogForm); this.josueSyncPal(c); c.hp = c.maxHp; c.ax = this.ax; c.ay = this.ay;
    w.fighters.push(c); this.pal = c; w.vfx('summon', x, y - 10, { scale: 2.4, below: true });
    return c;
  },
  josueSyncPal(c) {   // the partner shares the champion's health pool size, defences, speed and damage (scaled by Fiel compañero's rank)
    const P = this.defN.palAtk, b = c.palDog ? P.bite : P.arrow, F = (c.palDog ? this.defDog : this.defN).stats, T = c.palDog ? PAL_DOG : PAL_ARCHER, st = c.def.stats;
    const hp = Math.round(this.maxHp), armor = Math.round(F.armor + this.it.armor), mr = Math.round(F.mr + this.it.mr);
    if (st.hp !== hp || st.armor !== armor || st.mr !== mr || st.range !== b.range) {
      const r = st.hp ? c.hp / st.hp : 1;
      c.def = { ...c.def, stats: { ...T.stats, hp, armor, mr, range: b.range, atkCd: b.atkCd, speed: F.speed * 1.12, run: F.run * 1.12 } };
      c.hp = Math.min(hp, Math.max(1, r * hp));
    }
    c.botAp = (b.base + this.atk * b.atkScale) * rk(this.defN.abilities.ult.palDmg, this.ranks.ult || 1);
  },
  josueSwap() {   // Fiel compañero: you now drive the other body
    const c = this.pal, w = this.w; if (!c?.alive || c.away) return false;
    for (const k of ['x', 'y', 'ax', 'ay', 'hp', 'slows', 'poisons', 'rootT']) { const t = this[k]; this[k] = c[k]; c[k] = t; }
    this.setDuoForm(!this.dogForm); c.setPalForm(!this.dogForm); this.josueSyncPal(c);
    this.hp = Math.min(this.hp, this.maxHp); c.hp = Math.min(c.hp, c.maxHp);
    for (const u of [this, c]) { u.pending = null; u.dashV = null; u.lunge = null; u.state = 'idle'; u.lx = u.x; u.ly = u.y; u.playAnim('idle'); w.vfx('summon', u.x, u.y - 10, { scale: 2, below: true }); }
    if (w.player === this) { w.cancelAim?.(); w.jCharge = null; }
    w.float(this.x, this.y - this.def.height - 30, this.dogForm ? '¡Al ataque!' : '¡Aquí, chico!', '#ffd27a');
    return true;
  },
  josueSave(killer) {   // the driven body falls: if the partner stands, control jumps to it and the champion lives on
    const c = this.pal, w = this.w; if (!c?.alive) return false;
    const fall = { x: this.x, y: this.y, dog: !!this.dogForm };
    if (this.hunt) { this.hunt = null; this.invis = null; this.speedT = 0; this.speedBoost = 0; }
    c.away = false;
    Object.assign(this, { x: c.x, y: c.y, ax: c.ax, ay: c.ay, hp: Math.max(1, c.hp), stunT: 0, rootT: c.rootT || 0, slows: c.slows, poisons: c.poisons, pending: null, dashV: null, lunge: null, pullMe: null, shove: null, state: 'idle', bloodT: 0 });
    this.lx = this.x; this.ly = this.y; this.setDuoForm(!fall.dog); this.playAnim('idle');
    Object.assign(c, { x: fall.x, y: fall.y, lx: fall.x, ly: fall.y, slows: [], poisons: [] }); c.setPalForm(fall.dog); c.hp = 0; c.die(killer);
    if (w.player === this) { w.cancelAim?.(); w.jCharge = null; }
    w.float(this.x, this.y - this.def.height - 34, fall.dog ? '¡El perro cayó!' : '¡Josué cayó!', '#ff9a7a');
    return true;
  },

  /* ---- abilities ---- */
  fireJosue(k, a, rank) {
    const w = this.w;
    if (k === 'ult') { if (w.net?.role !== 'client') this.josueSwap(); return; }
    if (this.dogForm) {
      if (k === 'p1') return this.josueBite(a, rank);
      if (k === 'p2') return this.josueHunt(a, rank);
      this.bloodT = rk(a.time, rank); this.bloodPct = rk(a.steal, rank);   // Sed de sangre (the healing is in World.damage)
      w.vfx('buff', this.x, this.cy, { scale: 3, tint: 0xff3a3a }); w.vfx('shockwave', this.x, this.y - 6, { scale: 2.4, below: true, tint: 0xff3a3a });
      w.float(this.x, this.y - this.def.height - 30, '¡Sed de sangre!', '#ff6a6a');
      return;
    }
    if (k === 'p1') { const c = this.castPoint || w.aiPoint(this, a.range); this.castPoint = null; w.josueTrap(this, c, a, rank); return; }
    if (k === 'p2') return this.josueDash(a, rank);
    return this.josueArrow(a, rank);
  },
  josueTargets(r, n) {   // nearest visible enemies, champions first
    return this.w.enemiesOf(this).filter(t => !t.isTower && !t.invis && !(t.inBush && t.hiddenInBush(this.baseTeam)) && Math.hypot(t.x - this.x, t.y - this.y) <= r)
      .sort((p, q) => (q.isChamp - p.isChamp) || Math.hypot(p.x - this.x, p.y - this.y) - Math.hypot(q.x - this.x, q.y - this.y)).slice(0, n);
  },
  josueDash(a, rank) {   // Desplazamiento: a jump (castPoint = direction x100: where you move / backward / Shift = toward the cursor) shooting one arrow per nearby enemy
    const w = this.w, cp = this.castPoint; this.castPoint = null;
    let dx = -this.ax, dy = -this.ay; if (cp && (cp.x || cp.y)) { const l = Math.hypot(cp.x, cp.y); dx = cp.x / l; dy = cp.y / l; }
    const dist = rk(a.dist, rank), dur = 0.26, dmg = rk(a.dmg, rank) + this.atk * a.atkScale;
    this.state = 'cast'; this.anim = 'power2'; this.stateT = 0; this.stateDur = dur; this.fired = true; this.dashV = { x: dx * dist / dur, y: dy * dist / dur };
    w.vfx('run_dust', this.x, this.y - 6, { scale: 2.4, alpha: 0.8, below: true });
    this.josueTargets(a.range, rk(a.arrows, rank)).forEach((t, i) => w.after(0.04 + i * 0.05, () => {
      if (!this.alive || !t.alive) return; const ex = t.x - this.x, ey = t.y - this.y, l = Math.hypot(ex, ey) || 1;
      w.projectile(this, { dir: { x: ex / l, y: ey / l }, range: a.range + 100, speed: 960, dmg, type: 'physical', obj: 'arrow', face: true, scale: w.objFit('arrow', 50), vfx: 'bullet_tracer', r: 14 });
    }));
  },
  josueArrow(a, rank) {   // Flecha cargada: castPoint.x = charge in thousandths (the client measured how long E was held)
    const w = this.w, k = Math.max(0, Math.min(1, (this.castPoint?.x ?? 600) / 1000)); this.castPoint = null;
    const L = a.range[0] + (a.range[1] - a.range[0]) * k, sp = a.speed[0] + (a.speed[1] - a.speed[0]) * k, full = k >= 0.98;
    const dmg = (rk(a.dmg, rank) + this.atk * a.atkScale) * (1 + (a.full - 1) * k);
    w.projectile(this, { range: L, speed: sp, dmg, type: 'physical', obj: 'arrow_charged', face: true, scale: w.objFit('arrow_charged', 64 + 40 * k), vfx: 'bullet_tracer', tint: null, r: 16 + 8 * k, big: full, ...(full ? { pierce: true, hits: new Set() } : {}) });
    w.vfx('spark', this.x + this.ax * 50, this.cy, { scale: 2 + 2 * k, tint: 0xffb020 });
    if (k > 0.5) w.float(this.x, this.y - this.def.height - 30, full ? '¡MÁXIMA!' : `${Math.round(k * 100)} %`, '#ffc04a');
  },
  josueBite(a, rank) {   // Mordida: big leap to the first enemy on the line, bite, heal a part of the damage dealt
    const w = this.w, L = a.dist + 40, pts = [{ x: this.x, y: this.y }, { x: this.x + this.ax * L, y: this.y + this.ay * L }];
    const tgt = w.enemiesOf(this).filter(t => !t.isTower && w.nearPath(pts, t.x, t.y, a.width / 2 + BR * 0.6)).sort((p, q) => (q.isChamp - p.isChamp) || Math.hypot(p.x - this.x, p.y - this.y) - Math.hypot(q.x - this.x, q.y - this.y))[0];
    const trav = tgt ? Math.max(0, Math.min(a.dist, Math.hypot(tgt.x - this.x, tgt.y - this.y) - 55)) : a.dist, dur = 0.24;
    if (tgt) this.setAim(tgt.x - this.x, tgt.y - this.y);
    this.state = 'cast'; this.anim = 'power1'; this.stateT = 0; this.stateDur = dur; this.fired = true; this.dashV = { x: this.ax * trav / dur, y: this.ay * trav / dur };
    w.after(dur, () => {
      if (!this.alive) return; w.vfx('punch', this.x + this.ax * 40, this.y - 30, { scale: 4.5, tint: 0xff5a3a });
      if (!tgt?.alive) return; const d = w.damage(this, tgt, rk(a.dmg, rank) + this.atk * a.atkScale, 'physical');
      if (d > 0) this.heal(d * rk(a.heal, rank));
    });
  },
  josueHunt(a, rank) {   // Cacería: invisible + faster; Josué vanishes until the dog pounces
    const w = this.w, T = rk(a.time, rank), c = this.pal;
    this.invis = { t: T, trail: Infinity }; this.hunt = {}; this.speedBoost = rk(a.speed, rank); this.speedT = T;
    w.vfx('summon', this.x, this.y - 10, { scale: 2.6, tint: 0x7a6aff });
    if (c?.alive && !c.away && w.net?.role !== 'client') { w.vfx('summon', c.x, c.y - 10, { scale: 2.4 }); c.away = true; c.pending = null; c.state = 'idle'; }
    w.float(this.x, this.y - this.def.height - 30, 'Cacería...', '#b0a8ff');
  },
  josueHuntEnd() {   // the invisibility is over (pounce, any cast, time out): Josué reappears next to the dog
    this.hunt = null; this.speedT = 0; this.speedBoost = 0;
    const c = this.pal, w = this.w, at = this.land || this; this.land = null; if (!c?.alive || !c.away || w.net?.role === 'client') return;
    let x = at.x - this.facing * 60, y = at.y + 26; if (!isWalk(x, y)) { x = this.x; y = this.y; }
    Object.assign(c, { away: false, x, y, lx: x, ly: y }); w.vfx('summon', x, y - 10, { scale: 2.4 });
  },
  josuePounce() {   // a basic attack while hunting: leap on the nearest enemy (prefers the one you aim at) and bite hard
    const w = this.w, a = this.def.abilities.p2, rank = this.ranks.p2 || 1;
    const fw = t => { const dx = t.x - this.x, dy = t.y - this.y, d = Math.hypot(dx, dy) || 1; return (dx * this.ax + dy * this.ay) / d; };
    const t = w.enemiesOf(this).filter(q => !q.isTower && Math.hypot(q.x - this.x, q.y - this.y) <= a.pounce).sort((p, q) => (Math.hypot(p.x - this.x, p.y - this.y) * (1.6 - fw(p))) - (Math.hypot(q.x - this.x, q.y - this.y) * (1.6 - fw(q))))[0];
    if (!t) return false;   // nobody in reach: stay hidden
    const dx = t.x - this.x, dy = t.y - this.y, d = Math.hypot(dx, dy) || 1, trav = Math.max(0, d - 55), dur = 0.22;
    this.cds.basic = this.def.stats.atkCd; this.setAim(dx, dy); this.land = { x: this.x + dx / d * trav, y: this.y + dy / d * trav }; this.breakInvis();   // Josué reappears where the dog lands
    this.state = 'cast'; this.anim = 'power1'; this.stateT = 0; this.stateDur = dur; this.windup = 99; this.pending = null; this.fired = true; this.lunge = null;
    this.playAnim('power1', dur + 0.1); this.dashV = { x: dx / d * trav / dur, y: dy / d * trav / dur };
    w.castCtx = { f: this, k: 'p2' };
    w.after(dur, () => { if (!this.alive || !t.alive) return; w.damage(this, t, rk(a.dmg, rank) + this.atk * a.atkScale, 'physical'); w.vfx('punch', t.x, t.cy, { scale: 4.5, tint: 0xb0a8ff }); });
    w.castCtx = null;
    w.float(this.x, this.y - this.def.height - 30, '¡Al cuello!', '#b0a8ff');
    return true;
  },
  palAttack() {   // the partner's automatic basic: Josué shoots an arrow, the dog bites (damage = botAp, see josueSyncPal)
    const w = this.w, range = this.def.stats.range;
    let t = this.palT; if (!t?.alive || t.away || Math.hypot(t.x - this.x, t.y - this.y) > range + 60 + t.br) t = w.nearestEnemy(this, range + 40);
    if (!t) return;
    this.setAim(t.x - this.x, t.y - this.y);
    if (this.palDog) { w.damage(this, t, this.botAp, 'physical'); w.vfx('punch', t.x, t.cy, { scale: 2.6 }); }
    else w.projectile(this, { range: range + 80, speed: 760, dmg: this.botAp, type: 'physical', obj: 'arrow', face: true, scale: w.objFit('arrow', 50), vfx: 'bullet_tracer', r: 12 });
  },
  josueStatus(add) {
    if (this.hunt) add('hunt', 'Cacería', this.invis?.t ?? null, false, 'Invisible y más rápido; Josué se esconde. Ataca a un enemigo cercano para lanzarte sobre él.', { icon: 'icon_josue_dog_p2', name: 'Cacería', tint: 0x7a6aff });
    if (this.bloodT > 0) add('blood', 'Sed de sangre', this.bloodT, false, 'Cada golpe te cura una parte del daño que causas.', { icon: 'icon_josue_dog_p3', name: 'Sed de sangre', tint: 0xff3a3a });
    const c = this.pal; if (!c?.alive && this.palDownT > 0) add('paldown', this.dogForm ? 'Josué caído' : 'Perro caído', this.palDownT, true, 'Tu compañero vuelve a tu lado cuando termine el tiempo (o al reaparecer en la base).', { icon: 'icon_josue_ult', name: 'Fiel compañero', tint: 0xff9a7a });
  },
  // ---- online (netgame.js) ----
  josuePack(o) { if (this.dogForm) o.jd = 1; if (this.hunt) o.jh = 1; if (this.bloodT > 0) o.bt = Math.round(this.bloodT * 100) / 100; if (!this.pal?.alive && this.palDownT > 0) o.pdn = Math.round(this.palDownT); },
  josueUnpack(o) {
    const dog = !!o.jd, w = this.w;
    if (dog !== !!this.dogForm) { this.setDuoForm(dog); Object.assign(this, { x: o.x, y: o.y, lx: o.x, ly: o.y, nb: null }); if (this === w.pc && w.net) w.net.histFor = null; }   // swap: a jump, no sliding
    this.hunt = o.jh ? (this.hunt || {}) : null; if (this.hunt && this.invis) this.invis.trail = Infinity;   // the dog leaves no silhouettes
    this.bloodT = o.bt || 0; this.palDownT = o.pdn || 0;
  },
  palUnpack(o) { const dog = !o.jf; if (dog !== this.palDog) { this.setPalForm(dog); Object.assign(this, { x: o.x, y: o.y, lx: o.x, ly: o.y, nb: null }); } },
};

/* ===================== Arena ===================== */
export const JosueWorld = {
  objFit(key, px) { const s = this.textures.exists(key) ? this.textures.get(key).getSourceImage() : null; return s?.width ? px / s.width : 1; },   // scale that makes an object image `px` wide (real art is tight-cropped, placeholders are small)
  // ---- the partner's AI: hit what the champion hits (or the nearest enemy close to him), otherwise follow him ----
  runPal(f) {
    const o = f.owner; if (!o?.alive || f.away) return;
    const range = f.def.stats.range, lt = o.lastTarget;
    let t = lt && lt.alive && !lt.away && lt.team !== f.team && this.gameT - (o.lastTargetT || 0) < 4 && Math.hypot(lt.x - o.x, lt.y - o.y) < 700 && !lt.invis ? lt : this.nearestEnemy(f, range + 140);
    if (t && (Math.hypot(t.x - o.x, t.y - o.y) > 620 || (t.isTower && t !== lt))) t = null;   // never wander away from the champion; towers only when he attacks one
    f.palT = t;
    if (!t) return this.escort(f);
    const dx = t.x - f.x, dy = t.y - f.y, ad = Math.hypot(dx, dy) - (t.br - BR);
    f.setAim(dx, dy);
    if (ad > range * 0.9) { f.in.mx = dx; f.in.my = dy; f.in.run = ad > range + 150; }
    if (ad <= range) f.tryBasic();
  },
  // ---- Trampa (Q): invisible bear trap; rides the same `traps` list as the snapshot (netgame 'tr') ----
  josueTrap(o, c, a, rank) {
    if (this.net?.role === 'client') return;
    const T = (this.traps ||= []), mine = T.filter(q => q.owner === o && q.kind === 'bear' && q.shut == null);
    while (mine.length >= rk(a.max, rank)) { const old = mine.shift(); old.img?.destroy(); T.splice(T.indexOf(old), 1); }   // one too many: the oldest goes
    T.push({ kind: 'bear', x: c.x, y: c.y, owner: o, team: o.team, r: a.radius, t: a.life, arm: a.arm, stun: rk(a.stun, rank), dmg: rk(a.dmg, rank) + o.atk * a.atkScale, ctx: this.castCtx });
    this.vfx('run_dust', c.x, c.y - 4, { scale: 2, alpha: 0.7, below: true });
  },
  bearTrapTick(tr, dt) {   // false = remove it
    if (tr.shut != null) { if ((tr.shut -= dt) > 0) return true; tr.img?.destroy(); return false; }   // the closed trap stays visible (to everybody) for a moment
    if ((tr.t -= dt) <= 0) { tr.img?.destroy(); return false; }
    if (tr.arm > 0) { tr.arm -= dt; return true; }
    const hit = this.fighters.find(e => e.alive && !e.away && !e.drop && !e.isTower && !e.def?.static && e.def?.bot !== 'crate' && e.team !== tr.team && eDist(e.x, e.y, tr.x, tr.y) <= tr.r);
    if (!hit) return true;
    this.castCtx = tr.ctx || { f: tr.owner, k: 'p1' };
    hit.stun(tr.stun); this.damage(tr.owner, hit, tr.dmg, 'physical');
    this.castCtx = null;
    this.vfx('shockwave', tr.x, tr.y - 4, { scale: 2.4, below: true, tint: 0xc9a14a }); this.vfx('spark', tr.x, tr.y - 20, { scale: 3.5, tint: 0xffd27a });
    this.audio.play('stun', { at: tr, vol: 0.9, gap: 80 }); this.float(tr.x, tr.y - 60, '¡ATRAPADO!', '#ffd27a');
    tr.shut = 1.4; tr.x = hit.x; tr.y = hit.y;
    return true;
  },
  drawBearTrap(g, tr, mine, t) {   // own team: always (faint while it arms); enemies: only once it has closed
    const shut = tr.shut != null;
    if ((!shut && tr.team !== mine) || !this.inView(tr.x, tr.y, 120)) { tr.img?.setVisible(false); return; }
    const key = shut ? 'bear_trap_shut' : 'bear_trap';
    if (!tr.img || !tr.img.active || tr.img.texture.key !== key) { tr.img?.destroy(); tr.img = this.add.image(tr.x, tr.y, key); }
    tr.img.setVisible(true).setPosition(tr.x, tr.y).setScale(this.objFit(key, 54)).setDepth(tr.y - 4).setAlpha(shut ? 1 : tr.arm > 0 ? 0.35 : 0.8);
    if (!shut) g.lineStyle(2, 0xc9a14a, 0.35 + 0.2 * Math.sin(t * 4)).strokeEllipse(tr.x, tr.y, tr.r * 2, tr.r * 2 * YR);
  },
  // ---- Flecha cargada (E held): the charge only lives on the client that holds the key; on release the cast carries it ----
  josueChargeStart() {
    const p = this.pc, a = p.def.abilities.p3, rank = p.ranks.p3;
    if (!rank || !p.free || p.cds.p3 > 0 || (p.mana < rk(a.mana, rank) && !this.debugFree)) { if (rank) this.audio.play('ui_error', { gap: 250, vol: 0.7 }); return; }
    this.cancelAim(); this.jCharge = { t: 0 };
  },
  josueChargeTick(p) {
    const C = this.jCharge, a = p.def.abilities.p3;
    if (!p.duo || p.dogForm || !p.alive || p.stunT > 0 || p.silenceT > 0 || !a?.maxT) { this.jCharge = null; return; }
    p.in.run = false;   // no running while the bow is drawn
    if (this.k.p3.isDown) { C.t = Math.min(a.maxT, C.t + this.game.loop.delta / 1000); return; }
    const m = this.mouseGround(); p.setAim(m.x - p.x, m.y - p.y);
    p.castPoint = { x: Math.round(1000 * C.t / a.maxT), y: 0 }; this.jCharge = null;
    p.tryCast('p3');
  },
  josueChargeK() { const p = this.pc, a = p?.def?.abilities?.p3; return this.jCharge && a?.maxT ? Math.min(1, this.jCharge.t / a.maxT) : 0; },
  josueDashDir() {   // Desplazamiento: Shift = toward the cursor; moving = that way; standing = backward (away from the cursor)
    const p = this.pc, n = (x, y) => { const l = Math.hypot(x, y) || 1; return { x: Math.round(x / l * 100), y: Math.round(y / l * 100) }; };
    if (this.k.run.isDown) { const m = this.mouseGround(); return n(m.x - p.x, m.y - p.y); }
    if (p.in.mx || p.in.my) return n(p.in.mx, p.in.my);
    return n(-p.ax, -p.ay);
  },
  drawJosue() {   // the charged-arrow preview (only the player who charges sees it)
    const g = (this.josG ||= this.add.graphics().setDepth(99991)); g.clear();
    const p = this.pc; if (!this.jCharge || !p?.alive) return;
    const a = p.def.abilities.p3, k = this.josueChargeK(), L = a.range[0] + (a.range[1] - a.range[0]) * k, w = 18 + 18 * k, nx = -p.ay * w / 2, ny = p.ax * w / 2, ex = p.x + p.ax * L, ey = p.y + p.ay * L;
    const col = k >= 0.98 ? 0xff5a2a : 0xffb020, pulse = 0.6 + 0.4 * Math.sin(this.time.now / (k >= 0.98 ? 60 : 140));
    g.fillStyle(col, 0.12 + 0.12 * k).fillPoints([{ x: p.x + nx, y: p.y + ny }, { x: ex + nx, y: ey + ny }, { x: ex - nx, y: ey - ny }, { x: p.x - nx, y: p.y - ny }], true);
    g.lineStyle(2, col, 0.5 + 0.4 * pulse).lineBetween(p.x + nx, p.y + ny, ex + nx, ey + ny).lineBetween(p.x - nx, p.y - ny, ex - nx, ey - ny);
    g.fillStyle(col, 0.6).fillCircle(ex, ey, w / 2);
    const bx = p.x - 40, by = p.y - p.def.height - 62;   // charge bar over the head
    g.fillStyle(0x000000, 0.75).fillRect(bx - 2, by - 2, 84, 10).fillStyle(col, 1).fillRect(bx, by, 80 * k, 6);
  },
};
