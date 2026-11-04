import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def rep(s, old, new, count=1):
    assert old in s, old[:100]
    return s.replace(old, new, count)

# ================= data.js: hits are chained by clicks (animation cancel) -> cd = fraction of the base cooldown until the NEXT click can act
p = ROOT / 'src/data.js'; s = p.read_text(encoding='utf8')
i = s.index("const MELEE = ["); j = s.index("export const COMBOS = {")
s = s[:i] + """// cd = fraction of the champion's basic-attack cooldown until the next click can start the next hit (the swing is cancelled into it once the hit has landed).
// Chaining hits is therefore faster than the old single attack, so the damage of each hit is lower: a full combo keeps about the old damage per second (+10 %).
const MELEE = [
  { anim: 'attack',  dmg: 0.65, w: 0.9, t: 0.9,  cd: 0.5, lunge: 34 },
  { anim: 'attack2', dmg: 0.65, w: 0.9, t: 0.9,  cd: 0.5, lunge: 46 },
  { anim: 'attack3', dmg: 1.0,  w: 1.8, t: 1.55, cd: 1.1, lunge: 88, reachAdd: 20, fin: true },
];
const RANGED = [
  { anim: 'attack',  dmg: 0.65, w: 0.95, t: 0.95, cd: 0.5, lunge: 12 },
  { anim: 'attack2', dmg: 0.35, w: 0.8,  t: 0.9,  cd: 0.5, lunge: 16, shots: 2, gap: 0.09, spread: 0.12 },
  { anim: 'attack3', dmg: 1.0,  w: 1.5,  t: 1.4,  cd: 1.1, lunge: 24, scale: 1.5, speed: 1.1, fin: true },
];
""" + s[j:]
s = rep(s, "  leandro:  [RANGED[0], { ...RANGED[1], dmg: 0.55 }, { ...RANGED[2], dmg: 1 }],", "  leandro:  [{ ...RANGED[0], dmg: 0.6 }, { ...RANGED[1], dmg: 0.3 }, { ...RANGED[2], finMult: 0.8 }],")
s = rep(s, "  xeviche:  [RANGED[0], { ...RANGED[1], dmg: 0.55 }, { ...RANGED[2], dmg: 1 }],", "  xeviche:  [{ ...RANGED[0], dmg: 0.6 }, { ...RANGED[1], dmg: 0.3 }, { ...RANGED[2], finMult: 0.85 }],")
s = rep(s, "  axel:     [RANGED[0], { ...RANGED[1], dmg: 0.5, shots: 2 }, RANGED[2]],", "  axel:     [RANGED[0], RANGED[1], RANGED[2]],")
s = rep(s, "  julio:    [RANGED[0], { ...RANGED[1], dmg: 1, shots: 1, spread: 0 }, RANGED[2]],", "  julio:    [RANGED[0], { ...RANGED[1], dmg: 0.7, shots: 1, spread: 0 }, RANGED[2]],")
s = rep(s, "  eliud:    [RANGED[0], { ...RANGED[1], dmg: 0.5 }, RANGED[2]],", "  eliud:    [RANGED[0], RANGED[1], RANGED[2]],")
s = rep(s, "{ ...RANGED[1], dmg: 0.5, gap: 0.07 }, { ...RANGED[2], shots: 3, dmg: 0.5, gap: 0.06, spread: 0.1, scale: 1.1, speed: 1 }],", "{ ...RANGED[1], gap: 0.07 }, { ...RANGED[2], shots: 3, dmg: 0.4, gap: 0.06, spread: 0.1, scale: 1.1, speed: 1 }],")
p.write_text(s, encoding='utf8')

# ================= fighter.js
p = ROOT / 'src/fighter.js'; s = p.read_text(encoding='utf8')
s = rep(s, "  comboCfg() {", """  // a basic attack may be started in the middle of the previous swing once that hit has landed (animation cancel): every click throws the next hit
  chaining() { return this.alive && this.stunT <= 0 && !this.rw && this.state === 'cast' && /^attack/.test(this.anim || '') && this.fired && !this.dashV; }
  comboCfg() {""")
s = rep(s, "    if (!this.free || this.cds.basic > 0 || this.flame || this.ride || this.lure || this.bomber) {   // no basic attacks while the flamethrower is active\n      if (this === w.pc && this.alive && !this.flame && !this.ride && !this.lure && !this.bomber) this.bufferT = 0.25;",
    "    if (!(this.free || this.chaining()) || this.cds.basic > 0 || this.flame || this.ride || this.lure || this.bomber) {   // no basic attacks while the flamethrower is active\n      if (this === w.pc && this.alive && !this.flame && !this.ride && !this.lure && !this.bomber) this.bufferT = 0.4;")
s = rep(s, "    let wind = b.windup * cs.w, dur = b.dur * cs.t, cd = this.cds.basic * cs.cd;", "    let wind = b.windup * cs.w, dur = b.dur * cs.t, cd = this.cds.basic * cs.cd;   // cd = time until the next click can act")
s = rep(s, "    this.cds.basic = cd; this.comboEnd = t + Math.max(dur, cd);   // the window starts when the next hit becomes possible",
    "    cd = Math.max(cd, wind + 0.06); this.cds.basic = cd; this.comboEnd = t + cd;   // the hit has to land before the next one can cancel the swing; the click window starts when the next hit becomes possible")
s = rep(s, "dmg = big ? dmg * b.every3.mult : dmg * cs.dmg;", "dmg = big ? dmg * b.every3.mult * (cs.finMult || 1) : dmg * cs.dmg;")
s = rep(s, "if (this.bufferT > 0) { this.bufferT -= dt; if (this.free && this.cds.basic <= 0) { this.bufferT = 0; this.tryBasic(); } }", "if (this.bufferT > 0) { this.bufferT -= dt; if ((this.free || this.chaining()) && this.cds.basic <= 0) { this.bufferT = 0; this.tryBasic(); } }")
p.write_text(s, encoding='utf8')

# ================= world.js: every click is captured (a tap shorter than a frame is not lost)
p = ROOT / 'src/world.js'; s = p.read_text(encoding='utf8')
s = rep(s, "    else if ((left && !overUi) || k.basic.isDown || k.basic2.isDown) p.tryBasic();", """    else {
      const queued = this.clickQ > 0 && this.time.now - this.clickQT < 400; this.clickQ = 0;   // every click is remembered, even a tap shorter than one frame
      if ((queued && !overUi) || (left && !overUi) || k.basic.isDown || k.basic2.isDown || J(k.basic) || J(k.basic2)) p.tryBasic();
    }""")
p.write_text(s, encoding='utf8')
print('patched')
