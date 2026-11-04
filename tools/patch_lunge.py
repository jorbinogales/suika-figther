import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def rep(s, old, new, count=1):
    assert old in s, old[:110]
    return s.replace(old, new, count)

def between(s, a, b, new):
    i = s.index(a); j = s.index(b, i)
    return s[:i] + new + s[j:]

# ================= data.js: the forward-impulse attack (attack + move toward the aim) is ONE single attack, not part of the combo
p = ROOT / 'src/data.js'; s = p.read_text(encoding='utf8')
s = s.replace(", lunge: 34 }", " }").replace(", lunge: 46 }", " }").replace(", lunge: 88, reachAdd: 20, fin: true }", ", reachAdd: 20, fin: true }").replace(", lunge: 12 }", " }").replace(", lunge: 16, shots: 2", ", shots: 2").replace(", lunge: 24, scale: 1.5", ", scale: 1.5")
s += """

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
"""
p.write_text(s, encoding='utf8')

# ================= fighter.js
p = ROOT / 'src/fighter.js'; s = p.read_text(encoding='utf8')
s = rep(s, "import { COMBOS, COMBO_WINDOW,", "import { COMBOS, LUNGES, COMBO_WINDOW,")
new_block = """    const b = this.hen ? { ...this.def.basic, ...this.def.basic.hen } : this.def.basic, C = this.comboCfg();
    this.basicCount++;
    const t = w.gameT || 0, baseCd = this.cds.basic, fs = this.forceStep; this.forceStep = 0;
    // attack + move toward the aim = a single attack with a forward impulse and its own animation (not a combo hit)
    const mv = Math.hypot(this.in?.mx || 0, this.in?.my || 0), LG = LUNGES[this.key] || (b.kind === 'melee' ? LUNGES.jorbi : LUNGES.axel);
    if (fs === -1 || (!fs && mv > 0 && this.rootT <= 0 && (this.in.mx * this.ax + this.in.my * this.ay) / mv > 0.35)) {
      let wind = (b.windup || 0.2) * LG.w, dur = (b.dur || 0.45) * LG.t; if (b.alt) { this.basicSpeed = b.slow.speed; wind = b.slow.windup * LG.w; dur = b.slow.dur * LG.t; }
      const cd = Math.max(baseCd * LG.cd, wind + 0.06), td = Math.max(0.14, wind + 0.04), cs = { anim: 'lunge', dmg: LG.dmg, reachAdd: LG.reachAdd || 0, obj: LG.obj, scale: LG.scale || 1, speed: LG.speed || 1, lungeAtk: true };
      this.cds.basic = cd; this.comboStep = 0; this.cstepN = -1; this.comboEnd = t; this.holdPose = false; this.cstep = cs;
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

"""
s = between(s, "    const b = this.hen ? { ...this.def.basic, ...this.def.basic.hen } : this.def.basic, C = this.comboCfg();", "  _tryCast(k) {", new_block)
# lunge animation without art yet plays the basic attack
s = rep(s, "if (/^attack\\d$/.test(name)) return this.playAnim('attack', dur, reverse, keep);", "if (/^attack\\d$/.test(name) || name === 'lunge') return this.playAnim('attack', dur, reverse, keep);")
p.write_text(s, encoding='utf8')

# ================= netgame.js: the clients replay the same kind of attack (-1 = forward-impulse attack)
p = ROOT / 'src/netgame.js'; s = p.read_text(encoding='utf8')
s = rep(s, "f.cstepN || 1]); }", "f.cstepN || 1]); }") if "f.cstepN || 1]); }" in s else s
p.write_text(s, encoding='utf8')

# ================= world.js: no combo pips for the forward-impulse attack
p = ROOT / 'src/world.js'; s = p.read_text(encoding='utf8')
s = rep(s, "if (f === me && f.cstepN) {", "if (f === me && f.cstepN > 0) {")
p.write_text(s, encoding='utf8')

# ================= process_sprites.py: 'lunge' is a known animation
p = ROOT / 'tools/process_sprites.py'; s = p.read_text(encoding='utf8')
s = rep(s, "attack2=4, transform=8)", "attack2=4, transform=8, lunge=6)")
p.write_text(s, encoding='utf8'); print('patched')
