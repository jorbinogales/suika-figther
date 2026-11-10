import re
def edit(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (p, a[:90]); s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)

# ---------------- fighter.js ----------------
edit('src/fighter.js', [
("export const LANE_Y0 = 630, LANE_Y1 = 870;", "export const LANE_Y0 = 780, LANE_Y1 = 1020;"),
("export const BODY_R = 28;", "export const towerCircle = t => (t.isNexus ? 210 : 170);   // structures can only be hit by attackers standing inside this circle (world units)\nexport const BODY_R = 28;"),
("wd = this.isTower ? (this.def.radius || 40) * 2.1 : this.def.height * 0.6;", "wd = this.isTower ? towerCircle(this) * 2 : this.def.height * 0.6;"),
("this.ring = this.w.add.ellipse(this.x, this.y, wd, wd * (this.isTower ? 0.5 : 0.4), col, 0.14).setStrokeStyle(2, col, 0.75);", "this.ring = this.w.add.ellipse(this.x, this.y, wd, wd * (this.isTower ? 0.75 : 0.4), col, this.isTower ? 0.08 : 0.14).setStrokeStyle(this.isTower ? 3 : 2, col, this.isTower ? 0.9 : 0.75);"),
])

# ---------------- ai.js ----------------
edit('src/ai.js', [
("import { LANE_YS } from './mapdata.js';", "import { laneYAt, WORLD_W } from './mapdata.js';"),
("import { dist, BODY_R } from './fighter.js';", "import { dist, BODY_R, towerCircle } from './fighter.js';"),
("x: f.team === 0 ? 420 : 3200 - 420, y: w.laneY }", "x: f.team === 0 ? 420 : WORLD_W - 420, y: w.laneY }"),
("const ly = LANE_YS[(f.aiLane || 0) + 1], front = mates.filter(m => m.isMinion && Math.abs((m.laneY ?? 750) - ly) < 60)", "const li = (f.aiLane || 0) + 1, front = mates.filter(m => m.isMinion && (m.laneI ?? 1) === li)"),
("wantY = (LANE_YS[(f.aiLane || 0) + 1] - f.y) * 0.05;", "wantY = (laneYAt((f.aiLane || 0) + 1, f.x) - f.y) * 0.05;"),
("    const ranged = range > 150, hold = ranged ? range * 0.72 : range * 0.85;", "    const reff = target.isTower ? Math.min(range, towerCircle(target) * 0.8) : range;   // structures can only be hit from inside their circle\n    const ranged = reff > 150, hold = ranged ? reff * 0.72 : reff * 0.85;"),
("    else if (d <= range && f.free) f.tryBasic();\n  } else {", "    else if (d <= reff && f.free) f.tryBasic();\n  } else {"),
])
s = open('src/ai.js', encoding='utf-8').read()
s = s.replace("target.isTower && !minionCover && d > range * 0.9", "target.isTower && !minionCover && d > reff * 0.9", 1)
s = s.replace("else if (ranged && d < range * 0.45)", "else if (ranged && d < reff * 0.45)", 1)
open('src/ai.js', 'w', encoding='utf-8').write(s)

# ---------------- hud.js ----------------
edit('src/hud.js', [
("import { walk, GW, GH, CELL, RIVER, LANE_HALF, LANE_YS, riverOffset } from './mapdata.js';", "import { walk, GW, GH, CELL, RIVER, riverOffset, BASE_Y } from './mapdata.js';"),
("      if (ft.def?.lane) { g.fillRect(cx - 1.5, cy - LANE_HALF * fy, 3, LANE_HALF * 2 * fy); return; }   // lane walls\n", ""),
("g.fillStyle(0x3b82f6, 0.45).fillRect(q.x, q.y + 520 * fy, 340 * fx, 460 * fy);\n    g.fillStyle(0xef4444, 0.45).fillRect(q.x + q.w - 340 * fx, q.y + 520 * fy, 340 * fx, 460 * fy);", "g.fillStyle(0x3b82f6, 0.45).fillRect(q.x, q.y + (BASE_Y - 300) * fy, 340 * fx, 600 * fy);\n    g.fillStyle(0xef4444, 0.45).fillRect(q.x + q.w - 340 * fx, q.y + (BASE_Y - 300) * fy, 340 * fx, 600 * fy);"),
])
s = open('src/hud.js', encoding='utf-8').read()
s = s.replace("if (LANE_YS.some", "if (false && LANE_YS.some") if "LANE_YS.some" in s else s
s = s.replace("g.fillStyle(0x5f9f94).fillRect(q.x + (WORLD_W / 2 + riverOffset(y) - 56) * fx", "g.fillStyle(0x5f9f94).fillRect(q.x + (WORLD_W / 2 + riverOffset(y) - 56) * fx")
open('src/hud.js', 'w', encoding='utf-8').write(s)

# ---------------- world.js ----------------
s = open('src/world.js', encoding='utf-8').read()
def sub(a, b, cnt=1):
    global s
    assert a in s, a[:90]; s = s.replace(a, b, cnt)
sub("CAMP_SITES, LANE_YS, LANE_HALF, RIVER, riverOffset, WALL_X, TOWER_X, FLAG_X } from './mapdata.js';", "CAMP_SITES, laneYAt, LANE_HALF, RIVER, riverOffset, TOWER_XS, BASE_X, BASE_Y } from './mapdata.js';")
sub("import { Fighter, UNIT_DEFS, BODY_R,", "import { Fighter, UNIT_DEFS, BODY_R, towerCircle,")
sub("const LANE_MID = (LANE_Y0 + LANE_Y1) / 2;", "const LANE_MID = BASE_Y;")
# towers: two per lane and team, no walls
a = s.index("      this.walls = [];\n      LANE_YS.forEach"); b = s.index("      this.fighters.filter(f => f.isTower).forEach((t, i) => this.setNid(t, 200 + i));")
s = s[:a] + """      LANE_YS_N.forEach(li => [0, 1].forEach(t => {   // every lane: two towers per team; the inner (last) one heals allies and is immune while the outer one stands
        const X = x => t === 0 ? x : WORLD_W - x, key = t === 0 ? 'tower_blue' : 'tower_red';
        const outer = new Fighter(this, key, t, X(TOWER_XS[0]), laneYAt(li, TOWER_XS[0]) - 40, { ai: true }), inner = new Fighter(this, key, t, X(TOWER_XS[1]), laneYAt(li, TOWER_XS[1]) - 40, { ai: true });
        outer.laneI = inner.laneI = li; inner.inner = true; inner.wallRef = outer; this.fighters.push(outer, inner);
      }));
""" + s[b:]
sub("const CHAMP_ORDER =", "const LANE_YS_N = [0, 1, 2];\nconst CHAMP_ORDER =")
# remove wall / flag code, add tower flags
a = s.index("  // lane wall: a fence across the lane"); b = s.index("  setupCamps() {")
s = s[:a] + """  // where the minions of `team` leave in lane `li`: from the lane just in front of the base
  flagPos(team, li) { const x = 520; return { x: team === 0 ? x : WORLD_W - x, y: laneYAt(li, x) }; }
  drawTowerFlags() {   // every tower carries the same waving flag that marks a captured camp (its team's colour)
    if (this.training || this.bot) return;
    for (const t of this.fighters) {
      if (!t.isTower || t.isNexus) continue;
      const fk = 'flag_' + (t.team === 0 ? 'blue' : 'red');
      if (!t.alive || !this.textures.exists(fk)) { t.flagSpr?.destroy(); t.flagSpr = null; continue; }
      if (!t.flagSpr) { t.flagSpr = this.add.sprite(t.x + 46, t.y + 46, fk).setOrigin(0.5, 0.92).setScale(1.2); if (this.anims.exists(fk)) t.flagSpr.play(fk); }
      t.flagSpr.setVisible(!t.hiddenFor?.(this.pc) && !t.fogHidden).setDepth(t.y + 50);
    }
  }
  healAura(dt) {   // allied champions standing at the last (inner) tower of a lane heal there
    if (this.net?.role === 'client' || this.over) return;
    for (const t of this.fighters) if (t.inner && t.alive) for (const c of this.fighters) {
      if (!c.isChamp || !c.alive || c.away || c.baseTeam !== t.baseTeam) continue;
      const dx = c.x - t.x, dy = (c.y - t.y) / YR; if (dx * dx + dy * dy > 230 * 230) continue;
      c.hp = Math.min(c.maxHp, c.hp + c.maxHp * 0.06 * dt); if (c.maxMana) c.mana = Math.min(c.maxMana, c.mana + c.maxMana * 0.04 * dt);
    }
  }
""" + s[b:]
sub("lane: c.y < 750 ? 'n' : 's'", "lane: c.y < WORLD_H / 2 ? 'n' : 's'")
sub("this.drawTimers(); this.drawLaneFlags(); this.drawRiver(dt);", "this.drawTimers(); this.drawTowerFlags(); this.drawRiver(dt);")
# lane path / waves / minion walking
sub("const dir = team === 0 ? 1 : -1, ly = LANE_YS[c.ln], S = CAMP_SITES[c.i];", "const dir = team === 0 ? 1 : -1, S = CAMP_SITES[c.i];")
sub("{ x: c.x + dir * 50, y: ly }, { x: team === 0 ? WORLD_W - 330 : 330, y: ly }];", "{ x: c.x + dir * 50, y: laneYAt(c.ln, c.x + dir * 50) }, { x: team === 0 ? WORLD_W - 330 : 330, y: laneYAt(c.ln, team === 0 ? WORLD_W - 330 : 330) }];")
sub("m.path = this.lanePath(c, team); m.laneY = LANE_YS[c.ln];", "m.path = this.lanePath(c, team); m.laneI = c.ln;")
a = s.index("    LANE_YS.forEach((ly, li) => {\n      const fp = this.flagPos(team, li)"); b = s.index("  // gold to the champion that landed the kill")
s = s[:a] + """    LANE_YS_N.forEach(li => {
      const fp = this.flagPos(team, li), dir = team === 0 ? 1 : -1;
      comp.forEach((c, i) => {
        const slot = { x: 0, y: (i - 2) * 24 }, ahead = (comp.length - i) * 40, x = fp.x + dir * ahead;
        const m = new Fighter(this, names[c], team, x, laneYAt(li, x) + slot.y, { ai: true, slot });
        m.ax = dir; m.laneI = li;
        this.fighters.push(m);
      });
    });
  }

""" + s[b:]
sub("f.in.my = ((f.laneY ?? LANE_MID) + (f.slot.y || 0) - f.y) * 0.03;", "f.in.my = (laneYAt(f.laneI ?? 1, f.x) + (f.slot.y || 0) - f.y) * 0.05;")
# structures can only be hit from inside their circle
sub("    if (target.isTower && target.wallRef?.alive) return 0;   // the wall in front of a tower protects it", """    if (target.isTower && target.wallRef?.alive) return 0;   // the outer tower protects the inner one
    if (target.isTower && src) { const at = src.owner || src, R = towerCircle(target), dx = at.x - target.x, dy = (at.y - target.y) / YR; if (dx * dx + dy * dy > R * R) return 0; }   // nobody can hit a structure from outside its circle""")
sub("this.updateTireShots(dt); this.updateFireZones(dt);", "this.healAura(dt); this.updateTireShots(dt); this.updateFireZones(dt);")
# minions closing in on a structure go inside its circle
sub("      if (d > range * 0.9) { f.in.mx = dx; f.in.my = dy; }\n      if (d <= range) f.tryBasic();\n    } else {", "      const reff = t.isTower ? Math.min(range, towerCircle(t) * 0.8) : range;   // structures can only be hit from inside their circle\n      if (d > reff * 0.9) { f.in.mx = dx; f.in.my = dy; }\n      if (d <= reff) f.tryBasic();\n    } else {")
open('src/world.js', 'w', encoding='utf-8').write(s)
print('ok')
