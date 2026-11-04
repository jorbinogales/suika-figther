import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def rep(s, old, new, count=1):
    assert old in s, old[:110]
    return s.replace(old, new, count)

# ================= fighter.js
p = ROOT / 'src/fighter.js'; s = p.read_text(encoding='utf8')
# no separate buffer any more: every click is queued in world.js (clickQ) and consumed by a successful attack
s = rep(s, "      if (this === w.pc && this.alive && !this.flame && !this.ride && !this.lure && !this.bomber) this.bufferT = 0.4;   // a click a hair too early is not lost: it fires the moment the swing ends\n", "")
# the swing animation always fits inside the time until the next click can act: the final (held) pose of a hit is reached right when the next hit may start
s = rep(s, "    cd = Math.max(cd, wind + 0.06); this.cds.basic = cd;", "    { const k = Math.min(1, cd * 1.05 / dur); wind *= k; dur *= k; }   // faster playback instead of a cut swing: the hit still lands at the same frame\n    cd = Math.max(cd, wind + 0.06); this.cds.basic = cd;")
p.write_text(s, encoding='utf8')

# ================= data.js: non-blocking cadence for every champion (hits every ~0.25-0.3 s), damage per hit recalibrated so a full combo keeps ~the old DPS (+10 %)
p = ROOT / 'src/data.js'; s = p.read_text(encoding='utf8')
s = rep(s, "export const COMBO_WINDOW = 0.6;", "export const COMBO_WINDOW = 0.7;   // seconds you can pause between clicks without losing the combo")
i = s.index("const MELEE = ["); j = s.index("export const COMBOS = {")
s = s[:i] + """const MELEE = [
  { anim: 'attack',  dmg: 0.42, w: 0.9, t: 0.9,  cd: 0.35, lunge: 34 },
  { anim: 'attack2', dmg: 0.45, w: 0.9, t: 0.9,  cd: 0.35, lunge: 46 },
  { anim: 'attack3', dmg: 0.68, w: 1.5, t: 1.3,  cd: 0.7,  lunge: 88, reachAdd: 20, fin: true },
];
const RANGED = [
  { anim: 'attack',  dmg: 0.42, w: 0.95, t: 0.95, cd: 0.35, lunge: 12 },
  { anim: 'attack2', dmg: 0.22, w: 0.8,  t: 0.9,  cd: 0.35, lunge: 16, shots: 2, gap: 0.07, spread: 0.12 },
  { anim: 'attack3', dmg: 0.68, w: 1.4,  t: 1.3,  cd: 0.7,  lunge: 24, scale: 1.5, speed: 1.1, fin: true },
];
""" + s[j:]
s = rep(s, "  leandro:  [{ ...RANGED[0], dmg: 0.6 }, { ...RANGED[1], dmg: 0.3 }, { ...RANGED[2], finMult: 0.8 }],", "  leandro:  [RANGED[0], RANGED[1], { ...RANGED[2], finMult: 0.5 }],")
k = s.index("  xeviche:  ["); e2 = s.index("\n", k)
s = s[:k] + "  xeviche:  [{ ...RANGED[0], obj: 'lego_1' }, { ...RANGED[0], anim: 'attack2', dmg: 0.45, w: 0.85, obj: 'lego_2' }, { ...RANGED[2], shots: 1, dmg: 0.7, scale: 1.35, obj: 'lego_3' }],   // red, blue and a bigger yellow lego: one lego per click, no volleys" + s[e2:]
s = rep(s, "{ ...RANGED[1], gap: 0.07 }, { ...RANGED[2], shots: 3, dmg: 0.4, gap: 0.06, spread: 0.1, scale: 1.1, speed: 1 }],", "RANGED[1], { ...RANGED[2], shots: 3, dmg: 0.25, gap: 0.06, spread: 0.1, scale: 1.1, speed: 1 }],")
s = rep(s, "  julio:    [RANGED[0], { ...RANGED[1], dmg: 0.7, shots: 1, spread: 0 }, RANGED[2]],", "  julio:    [RANGED[0], { ...RANGED[1], dmg: 0.45, shots: 1, spread: 0 }, RANGED[2]],")
p.write_text(s, encoding='utf8')

# ================= world.js: every click is counted (up to 3 pending, 0.6 s) and spent by an attack that actually starts
p = ROOT / 'src/world.js'; s = p.read_text(encoding='utf8')
s = rep(s, "this.clickQ = 1; this.clickQT = this.time.now; } });", "this.clickQ = Math.min(3, (this.time.now - this.clickQT < 600 ? this.clickQ : 0) + 1); this.clickQT = this.time.now; } });")
s = rep(s, """      const queued = this.clickQ > 0 && this.time.now - this.clickQT < 400; this.clickQ = 0;   // every click is remembered, even a tap shorter than one frame
      if ((queued && !overUi) || (left && !overUi) || k.basic.isDown || k.basic2.isDown || J(k.basic) || J(k.basic2)) p.tryBasic();""",
"""      if (this.clickQ > 0 && this.time.now - this.clickQT >= 600) this.clickQ = 0;   // clicks not used within 0.6 s are forgotten
      const queued = this.clickQ > 0;   // every click is remembered (even a tap shorter than one frame) and each one throws exactly one hit as soon as the previous hit allows it
      if ((queued && !overUi) || (left && !overUi) || k.basic.isDown || k.basic2.isDown || J(k.basic) || J(k.basic2)) { if (p.tryBasic() && this.clickQ > 0) this.clickQ--; }""")
p.write_text(s, encoding='utf8'); print('patched')
