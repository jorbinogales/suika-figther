def sub(s, a, b, cnt=1):
    assert a in s, a[:80]
    return s.replace(a, b, cnt)

# ---------- world.js ----------
p = 'src/world.js'; s = open(p, encoding='utf-8').read()
s = sub(s, "import { walk, GW, GH, CELL, cellWalk, walkField, MID, CAMP_SITES, LANE_NORTH, LANE_SOUTH } from './mapdata.js';",
        "import { walk, GW, GH, CELL, cellWalk, walkField, CAMP_SITES, LANE_YS, LANE_HALF, RIVER, WALL_X, TOWER_X, FLAG_X } from './mapdata.js';")
# structures: wall + tower per lane and team
a = s.index("      [['tower_blue', 0, 560, LANE_MID - 40]"); b = s.index("    this.waveT = 4; this.waveN = 0;")
new = """      this.walls = [];
      LANE_YS.forEach((ly, li) => [0, 1].forEach(t => {   // every lane: a wall in front (towards the enemy) and the tower right behind it
        const X = x => t === 0 ? x : WORLD_W - x, tw = new Fighter(this, t === 0 ? 'tower_blue' : 'tower_red', t, X(TOWER_X), ly - 40, { ai: true });
        tw.laneI = li; tw.wallRef = this.makeLaneWall(t, X(WALL_X), ly, li); this.fighters.push(tw);
      }));
      this.fighters.filter(f => f.isTower).forEach((t, i) => this.setNid(t, 200 + i));   // structures: same id on every client
    }
"""
s = s[:a] + new + s[b:]
# helper methods (before setupCamps)
helpers = """  // lane wall: a fence across the lane that only the ENEMY cannot cross; its tower is immune until the wall falls
  makeLaneWall(team, x, y, li) {
    const f = new Fighter(this, 'fence', team, x, y, { ai: true });
    f.def = { ...f.def, name: 'Muro', lane: true, radius: 70, ref: 'fence_v', tex: 'fence_v', vert: true, len: LANE_HALF * 2, tint: team === 0 ? 0x8fc4ff : 0xff9a8a, stats: { ...f.def.stats, hp: 2600, armor: 45, mr: 45 } };
    f.hp = f.maxHp; f.ax = 1; f.ay = 0; f.laneI = li; this.setNid(f, 300 + this.walls.length); this.walls.push(f); this.fighters.push(f);
    for (let i = 0; i < 6; i++) this.obstacles.push({ x, y: y + (i - 2.5) * 40, r: 24, team, left: Infinity, s: { destroy() {} }, nx: 1, ny: 0, f, gate: true });
    return f;
  }
  // where the minions of `team` leave in lane `li`: the forward flag (just behind the tower) while the tower stands, else the rear flag
  flagPos(team, li) {
    const tw = this.fighters.find(f => f.isTower && !f.isNexus && f.team === team && f.laneI === li), x = FLAG_X[tw?.alive ? 0 : 1];
    return { x: team === 0 ? x : WORLD_W - x, y: LANE_YS[li], fwd: !!tw?.alive };
  }
  drawLaneFlags() {
    if (this.training || !this.walls) return; const g = (this.laneFlagG ||= this.add.graphics().setDepth(-868)); g.clear(); const t = this.time.now / 1000;
    LANE_YS.forEach((ly, li) => [0, 1].forEach(team => {
      const act = this.flagPos(team, li), col = team === 0 ? 0x4aa3ff : 0xff4a3a;
      FLAG_X.forEach((fx, k) => {
        const x = team === 0 ? fx : WORLD_W - fx, on = (k === 0) === act.fwd, y = ly + 34, a = on ? 1 : 0.28, w = Math.sin(t * 3 + x) * 4;
        g.fillStyle(0x000000, 0.25 * a).fillEllipse(x, y + 4, 30, 10);
        g.fillStyle(0x4b3a2a, a).fillRect(x - 2, y - 74, 4, 78);
        g.fillStyle(col, a).fillTriangle(x + 2, y - 74, x + 2, y - 44, x + (team === 0 ? 40 : -40) + w, y - 59);
        if (on) g.lineStyle(2, col, 0.5 + 0.3 * Math.sin(t * 4)).strokeCircle(x, y + 2, 20);
      });
    }));
  }
"""
s = sub(s, "  setupCamps() {", helpers + "  setupCamps() {")
s = sub(s, "lane: c.y < 750 ? 'n' : 's', owner", "ln: c.ln, lane: c.y < 750 ? 'n' : 's', owner")
s = sub(s, "`${T === 0 ? 'El equipo azul' : 'El equipo rojo'} controla ${c.lane === 'n' ? 'el camino norte' : 'el camino sur'}`",
        "`${T === 0 ? 'El equipo azul' : 'El equipo rojo'} controla ${['el carril superior', 'el carril central', 'el carril inferior'][c.ln]}`")
# lanePath
a = s.index("  lanePath(c, team) {"); b = s.index("  // a giant ship descends")
s = s[:a] + """  lanePath(c, team) {   // out of the clearing, onto the lane it flanks, then straight to the enemy base
    const dir = team === 0 ? 1 : -1, ly = LANE_YS[c.ln], S = CAMP_SITES[c.i];
    const raw = [{ x: c.x, y: c.y }, { x: S.entryX, y: S.entryY }, { x: c.x + dir * 50, y: ly }, { x: team === 0 ? WORLD_W - 330 : 330, y: ly }];
    const pts = [raw[0]]; for (let i = 1; i < raw.length; i++) { const a = raw[i - 1], b = raw[i], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 70); for (let k = 1; k <= n; k++) pts.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n }); }
    return pts;
  }
""" + s[b:]
s = sub(s, "m.ax = team === 0 ? 1 : -1; m.path = this.lanePath(c, team);", "m.ax = team === 0 ? 1 : -1; m.path = this.lanePath(c, team); m.laneY = LANE_YS[c.ln];")
# waves: one group per lane from the forward flag
a = s.index("    comp.forEach((c, i) => {\n      const slot = { x: 0, y: (i - 2) * 24 }, back"); b = s.index("  // gold to the champion that landed the kill")
s = s[:a] + """    LANE_YS.forEach((ly, li) => {
      const fp = this.flagPos(team, li), dir = team === 0 ? 1 : -1;
      comp.forEach((c, i) => {
        const slot = { x: 0, y: (i - 2) * 24 }, ahead = (comp.length - i) * 40;
        const m = new Fighter(this, names[c], team, fp.x + dir * ahead, ly + slot.y, { ai: true, slot });
        m.ax = dir; m.laneY = ly;
        this.fighters.push(m);
      });
    });
  }

""" + s[b:]
# minion walking
s = sub(s, "f.in.mx = f.team === 0 ? 1 : -1; f.in.my = (LANE_MID + (f.slot.y || 0) - f.y) * 0.03;", "f.in.mx = f.team === 0 ? 1 : -1; f.in.my = ((f.laneY ?? LANE_MID) + (f.slot.y || 0) - f.y) * 0.03;")
# gates: only the enemy is stopped
s = sub(s, "  solidAt(x, y) { return this.obstacles.some(o => Math.hypot(x - o.x, y - o.y) < o.r + BODY_R * 0.7)",
        "  solidAt(x, y, team) { return this.obstacles.some(o => !(o.gate && o.team === team) && Math.hypot(x - o.x, y - o.y) < o.r + BODY_R * 0.7)")
s = sub(s, "      for (const o of this.obstacles) {\n        const min = o.r + BODY_R * 0.7;", "      for (const o of this.obstacles) {\n        if (o.gate && o.team === f.team) continue;   // lane walls let their own team through\n        const min = o.r + BODY_R * 0.7;")
s = sub(s, "this.solidAt(nx, ny)) break; d = nd; }", "this.solidAt(nx, ny, f.team)) break; d = nd; }")
# tower immune while its wall stands
s = sub(s, "    if (target.isTower && !this.basicDmg) return 0;", "    if (target.isTower && target.wallRef?.alive) return 0;   // the wall in front of a tower protects it\n    if (target.isTower && !this.basicDmg) return 0;")
# drawing
s = sub(s, "    this.updateShips(dt); this.drawTimers();", "    this.updateShips(dt); this.drawTimers(); this.drawLaneFlags(); this.drawRiver();")
river = """  buildRiver() {   // a wavy river across the whole map; units walk on it freely (see mapdata RIVER)
    const cx = (RIVER.x0 + RIVER.x1) / 2, wob = y => Math.sin(y / 110) * 14 + Math.sin(y / 47) * 5;
    const g = this.add.graphics().setDepth(-995); this.riverG = this.add.graphics().setDepth(-994);
    const band = (hw, col, al) => { g.fillStyle(col, al); const L = [], R = []; for (let y = RIVER.y0 - 20; y <= RIVER.y1 + 20; y += 16) { L.push([cx + wob(y) - hw, y]); R.push([cx + wob(y) + hw, y]); } g.fillPoints([...L, ...R.reverse()].map(([x, y]) => ({ x, y })), true); };
    band(84, 0xb9a36a, 0.9); band(74, 0x8fb4c8, 1); band(62, 0x3f86b5, 1); band(36, 0x2f74a6, 1);
    this.riverWob = wob; this.riverCx = cx;
  }
  drawRiver() {
    if (!this.riverG) return; const v = this.cameras.main.worldView; if (v.right < RIVER.x0 - 120 || v.x > RIVER.x1 + 120) { this.riverG.clear(); return; }
    const g = this.riverG, t = this.time.now / 1000; g.clear(); g.lineStyle(2, 0xcfe9f7, 0.55);
    for (let y = Math.max(RIVER.y0, v.y - 40); y < Math.min(RIVER.y1, v.bottom + 40); y += 46) {
      const k = Math.floor(y / 46), off = ((k * 37) % 7 - 3) * 12, x = this.riverCx + this.riverWob(y) + off, sh = Math.sin(t * 1.6 + k) * 6;
      g.beginPath(); g.moveTo(x - 14 + sh, y); g.lineTo(x + sh, y - 3); g.lineTo(x + 14 + sh, y); g.strokePath();
    }
  }
"""
s = sub(s, "  drawCamps(dt) {", river + "  drawCamps(dt) {")
s = sub(s, "    this.bakeGround();\n", "    this.bakeGround(); this.buildRiver();\n")
open(p, 'w', encoding='utf-8').write(s)

# ---------- fighter.js ----------
p = 'src/fighter.js'; s = open(p, encoding='utf-8').read()
s = sub(s, "if (this.w.solidAt(this.x, this.y) ||", "if (this.w.solidAt(this.x, this.y, this.team) ||")
s = sub(s, "    if (!this.isTower) this.hp = Math.min(this.maxHp, this.hp + dt * this.maxHp * 0.004);", "    if (!this.isTower && !this.def.lane) this.hp = Math.min(this.maxHp, this.hp + dt * this.maxHp * 0.004);")
s = sub(s, "setOrigin(0.5, 0.5).setScale(k).setPosition(this.x, this.y).setDepth(this.y - 6).setFlipX(false); }", "setOrigin(0.5, 0.5).setScale(k).setPosition(this.x, this.y).setDepth(this.y - 6).setFlipX(false); if (this.def.tint) spr.setTint(this.def.tint); }")
open(p, 'w', encoding='utf-8').write(s)

# ---------- ai.js ----------
p = 'src/ai.js'; s = open(p, encoding='utf-8').read()
s = sub(s, "wantY = (w.laneY + ((f.aiLane || 0) * 40) - f.y) * 0.05;", "wantY = (LANE_YS[(f.aiLane || 0) + 1] - f.y) * 0.05;   // each bot champion keeps to its own lane")
s = sub(s, "const front = mates.filter(m => m.isMinion).reduce(", "const ly = LANE_YS[(f.aiLane || 0) + 1], front = mates.filter(m => m.isMinion && Math.abs((m.laneY ?? 750) - ly) < 60).reduce(")
if "LANE_YS" not in s.split("export")[0] and "import { LANE_YS" not in s:
    s = "import { LANE_YS } from './mapdata.js';\n" + s
open(p, 'w', encoding='utf-8').write(s)
print('ok')
