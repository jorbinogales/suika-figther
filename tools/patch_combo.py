import pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent

def rep(s, old, new, count=1):
    assert old in s, old[:100]
    return s.replace(old, new, count)

def between(s, a, b, new):
    i = s.index(a); j = s.index(b, i)
    return s[:i] + new + s[j:]

# =========================== data.js: combo definitions per champion
p = ROOT / 'src/data.js'; s = p.read_text(encoding='utf8')
s = rep(s, "  fist: { hits: 4, stun: 1.0, dmg: 0.9, reset: 6 },", "  fist: { hits: 3, stun: 1.0, dmg: 0.9, reset: 6 },   // the 3rd punch of the combo stuns")
s += """

/* ---------- basic attack combos ----------
   Click up to 3 times in a row (each next click within COMBO_WINDOW seconds of the previous swing ending): 3 chained hits, each with its own animation
   (attack, attack2, attack3). Every champion's combo keeps his style: melee champions chain strikes; ranged champions chain shots.
   Step fields: anim, dmg (damage multiplier of EACH hit/shot), w / t / cd (windup, animation and cooldown multipliers), lunge (forward impulse in px when you attack
   while moving toward your aim), melee: reachAdd; ranged: shots, gap (s between shots), spread (rad between shots), scale (projectile size), speed, fin (finisher).
   The three hits average to the champion's old basic attack damage per second. */
export const COMBO_WINDOW = 0.6;
const MELEE = [
  { anim: 'attack',  dmg: 0.85, w: 0.9, t: 0.9,  cd: 0.95, lunge: 34 },
  { anim: 'attack2', dmg: 0.95, w: 0.9, t: 0.9,  cd: 0.95, lunge: 46 },
  { anim: 'attack3', dmg: 1.4,  w: 1.8, t: 1.55, cd: 1.35, lunge: 88, reachAdd: 20, fin: true },
];
const RANGED = [
  { anim: 'attack',  dmg: 0.85, w: 0.95, t: 0.95, cd: 0.95, lunge: 12 },
  { anim: 'attack2', dmg: 0.5,  w: 0.8,  t: 0.9,  cd: 0.95, lunge: 16, shots: 2, gap: 0.09, spread: 0.12 },
  { anim: 'attack3', dmg: 1.4,  w: 1.5,  t: 1.4,  cd: 1.35, lunge: 24, scale: 1.5, speed: 1.1, fin: true },
];
export const COMBOS = {
  // melee
  jorbi:    MELEE,   // jab, cross, critical finisher (with his passive the finisher is the critical hit)
  luis:     MELEE,   // jab, hook, finisher (the backstab bonus still applies to every hit)
  hector:   MELEE,   // jab, cross, kick finisher
  junior:   MELEE,   // jab, cross, fist finisher: the 3rd punch fills his fist counter and stuns
  // ranged
  leandro:  [RANGED[0], { ...RANGED[1], dmg: 0.55 }, { ...RANGED[2], dmg: 1 }],                       // missile, double missile, big missile
  xeviche:  [RANGED[0], { ...RANGED[1], dmg: 0.55 }, { ...RANGED[2], dmg: 1 }],                       // lego bolt, two small legos, big lego
  axel:     [RANGED[0], { ...RANGED[1], dmg: 0.5, shots: 2 }, RANGED[2]],                             // laptop, quick double laptop, big laptop
  julio:    [RANGED[0], { ...RANGED[1], dmg: 1, shots: 1, spread: 0 }, RANGED[2]],                    // slow drawing, fast scribble, big ink blot (his alternating slow/fast style)
  eliud:    [RANGED[0], { ...RANGED[1], dmg: 0.5 }, RANGED[2]],                                       // egg, two eggs, giant egg
  yonaiker: [RANGED[0], { ...RANGED[1], dmg: 0.5, gap: 0.07 }, { ...RANGED[2], shots: 3, dmg: 0.5, gap: 0.06, spread: 0.1, scale: 1.1, speed: 1 }],   // shot, double tap, 3-round burst
};
"""
p.write_text(s, encoding='utf8')

# =========================== fighter.js
p = ROOT / 'src/fighter.js'; s = p.read_text(encoding='utf8')
s = rep(s, "import { CHAMPIONS,", "import { COMBOS, COMBO_WINDOW, CHAMPIONS,") if "import { CHAMPIONS," in s else s
assert "COMBOS, COMBO_WINDOW" in s, 'import data.js names manually'

# animation fallback: attack2/attack3 without art yet play the plain attack sheet
s = rep(s, """    if (!key) {   // no directional art for this animation yet: the single east-facing sheet (mirrored by facing, as before)
      key = `${this.skin}_${name}`;
      if (!this.w.anims.exists(key)) key = `${this.key}_${name}`;
      if (!this.w.anims.exists(key)) return;
    }""", """    if (!key) {   // no directional art for this animation yet: the single east-facing sheet (mirrored by facing, as before)
      key = `${this.skin}_${name}`;
      if (!this.w.anims.exists(key)) key = `${this.key}_${name}`;
      if (!this.w.anims.exists(key)) { if (/^attack\\d$/.test(name)) return this.playAnim('attack', dur, reverse, keep); return; }   // combo hits without their own art yet reuse the basic attack
    }""")
s = rep(s, "    this.pending = fn; this.fired = false;\n    this.playAnim(anim, dur);", "    this.pending = fn; this.fired = false; this.lunge = null;\n    this.playAnim(anim, dur);")

new_try = """  // basic attack combo: up to 3 chained hits (see COMBOS in data.js). Bots/minions/towers keep the single swing.
  comboCfg() { const b = this.def.basic, c = COMBOS[this.key] || (b.kind === 'melee' ? COMBOS.jorbi : COMBOS.axel); return c; }
  _tryBasic() {
    const w = this.w;
    if (!this.free || this.cds.basic > 0 || this.flame || this.ride || this.lure || this.bomber) {   // no basic attacks while the flamethrower is active
      if (this === w.pc && this.alive && !this.flame && !this.ride && !this.lure && !this.bomber) this.bufferT = 0.25;   // a click a hair too early is not lost: it fires the moment the swing ends
      return false;
    }
    this.bufferT = 0;
    const aspd = (1 + this.pk('aspd') + this.it.aspd) / (this.atkSlowT > 0 ? 1 - this.atkSlow : 1) ** -1;
    this.cds.basic = this.def.stats.atkCd / (1 + this.pk('aspd') + this.it.aspd) / (this.atkSlowT > 0 ? 1 - this.atkSlow : 1);
    if (this.invis) this.breakInvis();
    if (this.isBot) { this.startAction('attack', 0.2, 0.4, () => this.basicDo(() => this.botAttack())); return true; }
    if (this.isMinion || this.isTower) { this.startAction('attack', 0.15, 0.35, () => this.basicDo(() => this.unitAttack())); return true; }
    const b = this.hen ? { ...this.def.basic, ...this.def.basic.hen } : this.def.basic, C = this.comboCfg();
    this.basicCount++;
    // which hit of the combo: the next one if the previous swing ended less than COMBO_WINDOW ago, otherwise back to the first
    const t = w.gameT || 0; let step = this.forceStep || ((this.comboStep > 0 && this.comboStep < C.length && t - (this.comboEnd || 0) <= COMBO_WINDOW) ? this.comboStep + 1 : 1); this.forceStep = 0;
    const cs = C[step - 1]; this.comboStep = step >= C.length ? 0 : step; this.cstep = cs; this.cstepN = step;
    let wind = b.windup * cs.w, dur = b.dur * cs.t, cd = this.cds.basic * cs.cd;
    if (b.alt) {   // julio: slow drawing, fast scribble, slow big blot
      const m = step === 2 ? b.fast : b.slow; this.basicSpeed = m.speed; wind = m.windup * cs.w; dur = m.dur * cs.t; cd = m.cd * cs.cd;
    }
    this.cds.basic = cd; this.comboEnd = t + dur;
    // attack + forward = a short impulse toward the aim (melee closes the gap, ranged only steps in)
    const mv = Math.hypot(this.in?.mx || 0, this.in?.my || 0);
    if (mv > 0 && this.rootT <= 0 && (this.in.mx * this.ax + this.in.my * this.ay) / mv > 0.35 && cs.lunge) {
      const T = Math.max(0.12, wind); this.lunge = { vx: this.ax * cs.lunge / T, vy: this.ay * cs.lunge / T, t: T };
    }
    this.startAction(cs.anim, wind, dur, () => this.basicDo(() => this.fireBasic(!!cs.fin, cs)));
    if (cs.lunge && mv > 0 && this.lunge === null) { /* lunge was cleared by startAction: set it again */ }
    return true;
  }

"""
# startAction clears the lunge, so (re)apply it after startAction: simplest is to compute it, then assign after the call
new_try = new_try.replace("""      const T = Math.max(0.12, wind); this.lunge = { vx: this.ax * cs.lunge / T, vy: this.ay * cs.lunge / T, t: T };
    }
    this.startAction(cs.anim, wind, dur, () => this.basicDo(() => this.fireBasic(!!cs.fin, cs)));
    if (cs.lunge && mv > 0 && this.lunge === null) { /* lunge was cleared by startAction: set it again */ }
    return true;""", """      const T = Math.max(0.12, wind); lunge = { vx: this.ax * cs.lunge / T, vy: this.ay * cs.lunge / T, t: T };
    }
    this.startAction(cs.anim, wind, dur, () => this.basicDo(() => this.fireBasic(!!cs.fin, cs)));
    this.lunge = lunge;
    return true;""").replace("    const mv = Math.hypot(this.in?.mx || 0, this.in?.my || 0);\n", "    const mv = Math.hypot(this.in?.mx || 0, this.in?.my || 0); let lunge = null;\n").replace("    const aspd = (1 + this.pk('aspd') + this.it.aspd) / (this.atkSlowT > 0 ? 1 - this.atkSlow : 1) ** -1;\n", "")
s = between(s, "  _tryBasic() {", "  _tryCast(k) {", new_try)

new_fire = """  fireBasic(heavy = false, cs = null) {
    const b = this.hen ? { ...this.def.basic, ...this.def.basic.hen } : this.def.basic, w = this.w; cs ||= { dmg: 1 };
    w.audio.basic(this, heavy);
    if (b.kind === 'melee') {
      let dmg = (b.base + this.atk * b.atkScale) * cs.dmg;
      const crit = heavy && this.key === 'jorbi' && this.ranks.p3 > 0;
      if (crit) dmg *= rk(this.def.abilities.p3.critMult, this.ranks.p3);   // jorbi's passive turns the finisher into a critical hit; junior's 3rd punch gets its stun from the fist counter
      w.meleeHits(this, b.reach + (cs.reachAdd || 0)).forEach(t => {
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
        w.projectile(this, { ang, range: this.def.stats.range, onHit: this.key === 'eliud' ? () => this.addRage(this.def.hen.rageHit) : null, speed: (this.basicSpeed || b.speed) * (cs.speed || 1), dmg: (b.alt ? b.base + this.ap * b.apScale : b.base + this.atk * b.atkScale) * cs.dmg, type: b.type, obj: b.obj, vfx: b.vfx, spin: !!b.obj && !b.alt, scale: (b.scale ? b.scale : b.alt ? 0.2 : this.key === 'eliud' ? 0.12 : 0.17) * (cs.scale || 1), r: 14 * (cs.scale > 1 ? 1.3 : 1) });
        return;
      }
      const big = !!cs.fin;   // leandro / xeviche: the finisher is their big magic missile
      let dmg = b.base + this.ap * b.apScale;
      dmg = big ? dmg * b.every3.mult : dmg * cs.dmg;
      w.projectile(this, { ang, range: this.def.stats.range, speed: b.speed, dmg, type: b.type, vfx: b.vfx, scale: big ? b.every3.scale * 2.4 : 2.2 * (n > 1 ? 0.85 : 1),
        tint: big ? 0x9ad7ff : null, big, r: big ? 22 : 14 });
    };
    for (let i = 0; i < n; i++) {
      const ang = n > 1 ? (i - (n - 1) / 2) * spread : 0;
      if (i === 0) shoot(ang); else w.after(i * gap, () => { if (this.alive && !this.stunT) shoot(ang); });
    }
  }

"""
s = between(s, "  fireBasic(heavy = false) {", "  fireAbility(k, a, rank) {", new_fire)

# lunge movement while the action plays
s = rep(s, "      if (!this.fired && this.stateT >= this.windup) { this.fired = true; this.pending?.(); }", """      if (this.lunge) { const L = this.lunge; L.t -= dt; if (this.rootT <= 0) this.tryMove(clamp(this.x + L.vx * dt, 60, WORLD_W - 60), clamp(this.y + L.vy * dt, WALK_Y0, WALK_Y1)); if (Math.random() < 0.6) w.vfx('run_dust', this.x - this.ax * 14, this.y - 6, { scale: 1.2, alpha: 0.5, below: true }); if (L.t <= 0) this.lunge = null; }
      if (!this.fired && this.stateT >= this.windup) { this.fired = true; this.pending?.(); }""")
# buffered click: fire the next hit the moment the swing ends
s = rep(s, "    if (this.arepaGrace > 0) this.arepaGrace -= dt;", "    if (this.bufferT > 0) { this.bufferT -= dt; if (this.free && this.cds.basic <= 0) { this.bufferT = 0; this.tryBasic(); } }\n    if (this.arepaGrace > 0) this.arepaGrace -= dt;")
p.write_text(s, encoding='utf8')

# =========================== netgame.js: the remote clients replay the same hit of the combo
p = ROOT / 'src/netgame.js'; s = p.read_text(encoding='utf8')
s = rep(s, "sendBasic(f) { this.ev.push(['b', f.nid, r2(f.ax), r2(f.ay)]); }", "sendBasic(f) { this.ev.push(['b', f.nid, r2(f.ax), r2(f.ay), f.cstepN || 1]); }")
s = rep(s, "f.ax = e[2]; f.ay = e[3]; f.cds.basic = 0; this.replay(f, () => f._tryBasic());", "f.ax = e[2]; f.ay = e[3]; f.cds.basic = 0; f.forceStep = e[4] || 0; this.replay(f, () => f._tryBasic());")
p.write_text(s, encoding='utf8')

# =========================== world.js: combo pips next to the player's bars
p = ROOT / 'src/world.js'; s = p.read_text(encoding='utf8')
print('patched data/fighter/netgame; world.js pips next')
p.write_text(s, encoding='utf8')
