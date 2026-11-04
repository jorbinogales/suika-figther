import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def rep(s, old, new, count=1):
    assert old in s, old[:110]
    return s.replace(old, new, count)

# ================= fighter.js: hold the combat pose between hits (never back to idle inside a combo); lego projectile support
p = ROOT / 'src/fighter.js'; s = p.read_text(encoding='utf8')
# 1) when a combo hit ends with more hits possible, keep the last frame (the combat pose) instead of going to idle
s = rep(s, "      if (this.stateT >= this.stateDur) { this.state = 'idle'; this.playAnim('idle'); }\n      return;",
"""      if (this.stateT >= this.stateDur) {
        this.state = 'idle';
        if (this.isChamp && /^attack/.test(this.anim || '') && this.comboStep > 0) this.holdPose = true;   // combo in progress: stay in the final pose of this hit (it is the first pose of the next one)
        else this.playAnim('idle');
      }
      return;""")
# 2) leave the held pose when the click window runs out or the champion does something else
s = rep(s, "    if (this.bufferT > 0) {", """    if (this.holdPose && (this.state !== 'idle' || (w2g(this) - (this.comboEnd || 0) > COMBO_WINDOW))) { this.holdPose = false; if (this.state === 'idle' && this.alive) this.playAnim('idle'); }
    if (this.bufferT > 0) {""")
s = rep(s, "export const UNIT_DEFS = {", "const w2g = f => f.w.gameT || 0;\n\nexport const UNIT_DEFS = {")
# 3) playAnim: 'last' = show the final frame of the (directional) sheet; non-attack animations end the hold
s = rep(s, "    if (keep) { const tot = anim.getTotalFrames();", "    if (!/^attack/.test(name)) this.holdPose = false;\n    if (keep === 'last') cfg.startFrame = anim.getTotalFrames() - 1;\n    else if (keep) { const tot = anim.getTotalFrames();")
# 4) direction change while holding the pose: same final frame, other direction's sheet
s = rep(s, "    if (this.hasAnims && this.alive && this.curName && spr.anims.currentAnim?.repeat === -1 && this.curDir() !== this.curD) this.playAnim(this.curName, this.curDur, false, true);",
"    if (this.hasAnims && this.alive && this.curName && spr.anims.currentAnim?.repeat === -1 && this.curDir() !== this.curD) this.playAnim(this.curName, this.curDur, false, true);\n    else if (this.holdPose && this.alive && this.curName && this.curDir() !== this.curD) this.playAnim(this.curName, this.curDur, false, 'last');")
# 5) generic ranged branch: per-step projectile object (xeviche's legos), magic damage from AI power, finisher multiplier
s = rep(s, "dmg: (b.alt ? b.base + this.ap * b.apScale : b.base + this.atk * b.atkScale) * cs.dmg, type: b.type, obj: b.obj, vfx: b.vfx, spin: !!b.obj && !b.alt,",
        "dmg: (b.alt || (b.apScale != null && b.atkScale == null) ? b.base + this.ap * b.apScale : b.base + this.atk * b.atkScale) * cs.dmg, type: b.type, obj: cs.obj || b.obj, vfx: b.vfx, spin: !!b.obj && !b.alt,")
p.write_text(s, encoding='utf8')

# ================= data.js: xeviche throws a lego per click (a different lego each hit); leandro keeps his magic prompt
p = ROOT / 'src/data.js'; s = p.read_text(encoding='utf8')
s = rep(s, "    basic: { kind: 'projectile', apScale: 0.5, base: 12, type: 'magic', speed: 620, vfx: 'magic_missile',\n             every3: { mult: 1.5, scale: 1.2 }, windup: 0.2, dur: 0.45 },",
           "    basic: { kind: 'projectile', apScale: 0.5, base: 12, type: 'magic', speed: 620, obj: 'lego_1', scale: 0.3,   // every click throws a lego (a different colour each hit of the combo)\n             windup: 0.2, dur: 0.45 },")
s = rep(s, "  xeviche:  [{ ...RANGED[0], dmg: 0.6 }, { ...RANGED[1], dmg: 0.3 }, { ...RANGED[2], finMult: 0.85 }],",
           "  xeviche:  [{ ...RANGED[0], dmg: 0.7, obj: 'lego_1' }, { ...RANGED[0], anim: 'attack2', dmg: 0.75, w: 0.85, obj: 'lego_2' }, { ...RANGED[2], shots: 1, dmg: 1.15, scale: 1.4, obj: 'lego_3' }],   // red, blue and a bigger yellow lego: one lego per click, no volleys")
p.write_text(s, encoding='utf8')

# ================= process_sprites.py: the three hits are one chain (first frame of a hit = last frame of the previous one)
p = ROOT / 'tools/process_sprites.py'; s = p.read_text(encoding='utf8')
s = rep(s, "    # one texture atlas per character", """    # combo chain: attack -> attack2 -> attack3 must continue each other, so the first frame of a hit is the last frame of the previous hit (pixel identical, no pop between hits)
    for ch, anims in atlas_frames.items():
        for d in DIRS:
            for a, b in (("attack", "attack2"), ("attack2", "attack3")):
                if f"{a}_{d}" in anims and f"{b}_{d}" in anims: anims[f"{b}_{d}"][0] = anims[f"{a}_{d}"][-1].copy()
    # one texture atlas per character""")
p.write_text(s, encoding='utf8'); print('patched')
