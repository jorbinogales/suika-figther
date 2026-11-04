import re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def rep(s, old, new, count=1):
    assert old in s, old[:90]
    return s.replace(old, new, count)

# ---------------- world.js: animations for direction sheets (<anim>_<dir>)
p = ROOT / 'src/world.js'; s = p.read_text(encoding='utf8')
s = rep(s, "const LOOPS = new Set(['idle', 'walk', 'run']);",
"""const LOOPS = new Set(['idle', 'walk', 'run']);
// 8-direction sprites: sheets named <anim>_<dir> with dir in s/se/e/ne/n (sw/w/nw are the mirror of se/e/ne); looping cycles run at a fixed cycle time whatever their frame count
const DIR_SUFFIX = new Set(['s', 'se', 'e', 'ne', 'n']);
const CYCLE_SEC = { idle: 1.0, walk: 0.62, run: 0.46 };
const splitDir = a => { const i = a.lastIndexOf('_'); return i > 0 && DIR_SUFFIX.has(a.slice(i + 1)) ? [a.slice(0, i), a.slice(i + 1)] : [a, null]; };""")
s = rep(s, """    for (const ch in sprites) for (const a in sprites[ch])
      this.anims.create({ key: `${ch}_${a}`, frames: this.anims.generateFrameNumbers(`${ch}_${a}`), frameRate: ANIM_FPS[a] || 10, repeat: LOOPS.has(a) ? -1 : 0 });""",
"""    for (const ch in sprites) for (const a in sprites[ch]) {
      const [base, dir] = splitDir(a), frames = this.anims.generateFrameNumbers(`${ch}_${a}`);
      this.anims.create({ key: `${ch}_${a}`, frames, frameRate: dir && CYCLE_SEC[base] ? frames.length / CYCLE_SEC[base] : ANIM_FPS[base] || 10, repeat: LOOPS.has(base) ? -1 : 0 });
    }""")
p.write_text(s, encoding='utf8')

# ---------------- fighter.js: pick the sheet by direction, mirror the left side, switch direction mid-cycle
p = ROOT / 'src/fighter.js'; s = p.read_text(encoding='utf8')
s = rep(s, "export const UNIT_DEFS = {", """// 8-direction sprites: screen directions in clockwise order from east (y points down). Only s/se/e/ne/n are drawn; the left side mirrors se/e/ne.
const DIR8 = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
const DIR_SRC = { e: ['e', false], se: ['se', false], s: ['s', false], ne: ['ne', false], n: ['n', false], w: ['e', true], sw: ['se', true], nw: ['ne', true] };

export const UNIT_DEFS = {""")
s = rep(s, """  playAnim(name, dur, reverse = false) {
    if (!this.hasAnims) return;
    const held = this.flame && (name === 'idle' || name === 'walk' || name === 'run');   // flamethrower stays in his hands while it is active
    if (held) name = 'power3';
    let key = `${this.skin}_${name}`;
    if (!this.w.anims.exists(key)) key = `${this.key}_${name}`;
    if (!this.w.anims.exists(key)) return;
    const anim = this.w.anims.get(key);
    const cfg = { key, repeat: held ? -1 : anim.repeat };
    if (dur) cfg.frameRate = anim.getTotalFrames() / dur;
    reverse ? this.spr.playReverse(cfg) : this.spr.play(cfg);
  }""", """  // direction the sprite faces: where it walks while moving, else where it aims. Sector changes need to pass the sector edge by a margin (no flicker on the diagonals).
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
    const held = this.flame && (name === 'idle' || name === 'walk' || name === 'run');   // flamethrower stays in his hands while it is active
    if (held) name = 'power3';
    const d = this.curDir(), [sfx, mir] = DIR_SRC[d];
    let key = null;
    for (const b of [this.skin, this.key]) { const k = `${b}_${name}_${sfx}`; if (this.w.anims.exists(k)) { key = k; break; } }
    this.dirArt = !!key; this.dirMirror = mir;
    if (!key) {   // no directional art for this animation yet: the single east-facing sheet (mirrored by facing, as before)
      key = `${this.skin}_${name}`;
      if (!this.w.anims.exists(key)) key = `${this.key}_${name}`;
      if (!this.w.anims.exists(key)) return;
    }
    const anim = this.w.anims.get(key);
    const cfg = { key, repeat: held ? -1 : anim.repeat };
    if (dur) cfg.frameRate = anim.getTotalFrames() / dur;
    if (keep) { const tot = anim.getTotalFrames(); cfg.startFrame = Math.min(tot - 1, Math.floor((this.spr.anims.getProgress() || 0) * tot)); }   // direction change mid-cycle: same phase of the step
    this.curName = name; this.curDur = dur; this.curD = d;
    reverse ? this.spr.playReverse(cfg) : this.spr.play(cfg);
  }""")
s = rep(s, """    const face = this.turn && (this.state === 'walk' || this.state === 'run') ? this.turn : this.facing;   // while walking away from the aim the sprite faces its walking direction
    spr.setFlipX(this.isTower ? false : face < 0);""", """    // movement vector from the real displacement (works for local, bot and remote champions alike)
    { const ddx = this.x - (this.lx ?? this.x), ddy = this.y - (this.ly ?? this.y), dl = Math.hypot(ddx, ddy); this.lx = this.x; this.ly = this.y;
      if (dl > 0.3) { this.mvx = (this.mvx ?? 0) * 0.55 + ddx / dl * 0.45; this.mvy = (this.mvy ?? 0) * 0.55 + ddy / dl * 0.45; const m = Math.hypot(this.mvx, this.mvy) || 1; this.mvx /= m; this.mvy /= m; this.mvLen = dl; } else this.mvLen = 0; }
    if (this.hasAnims && this.alive && this.curName && spr.anims.currentAnim?.repeat === -1 && this.curDir() !== this.curD) this.playAnim(this.curName, this.curDur, false, true);
    const face = this.turn && (this.state === 'walk' || this.state === 'run') ? this.turn : this.facing;   // while walking away from the aim the sprite faces its walking direction
    spr.setFlipX(this.isTower ? false : this.hasAnims && this.dirArt ? this.dirMirror : face < 0);""")
p.write_text(s, encoding='utf8')

# ---------------- process_sprites.py: also slice <anim>_<dir> strips
p = ROOT / 'tools/process_sprites.py'; s = p.read_text(encoding='utf8')
s = rep(s, "CELL = 256", "CELL = 256\nDIRS = ('s', 'se', 'e', 'ne', 'n')   # drawn directions of the 8-direction sprites (sw/w/nw are mirrored by the engine)")
s = rep(s, "        for anim, n in FRAMES.items():", "        for anim, n in [*FRAMES.items(), *[(f\"{a}_{d}\", 0) for a in FRAMES for d in DIRS]]:")
p.write_text(s, encoding='utf8'); print('patched')
