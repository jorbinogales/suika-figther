def edit(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (p, a[:90]); s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)

# ---------------- fighter.js: the attack circle IS the tower's attack range ----------------
edit('src/fighter.js', [
("export const towerCircle = t => (t.isNexus ? 210 : 170);   // structures can only be hit by attackers standing inside this circle (world units)",
 "export const towerCircle = t => (t.isNexus ? 210 : (t.def?.stats?.range || 320));   // a tower's own attack circle: structures can only be hit by attackers standing inside it (world units)"),
])

# ---------------- mapdata.js: grass trails inside the forest ----------------
s = open('src/mapdata.js', encoding='utf-8').read()
a = s.index("export const cellWalk")
trails = '''// Small trails through the forest: walkable, no trees, drawn with the same grass as the forest floor (not dirt). Dead ends that wind away from a lane.
export const grass = new Uint8Array(GW * GH);
const carveGrass = (cx, cy, r) => {
  for (let j = Math.max(0, Math.floor((cy - r) / CELL)); j <= Math.min(GH - 1, Math.floor((cy + r) / CELL)); j++)
    for (let i = Math.max(0, Math.floor((cx - r) / CELL)); i <= Math.min(GW - 1, Math.floor((cx + r) / CELL)); i++)
      if (Math.hypot(i * CELL + CELL / 2 - cx, j * CELL + CELL / 2 - cy) <= r && !walk[j * GW + i]) { walk[j * GW + i] = 1; grass[j * GW + i] = 1; }
};
{
  let k = 0;
  for (const [a, b] of [[0, 1], [1, 2]]) for (const fx of [0.2, 0.34, 0.66, 0.8]) {
    const x0 = fx * WORLD_W, ya = laneYAt(a, x0), yb = laneYAt(b, x0), up = (k++ % 2) === 1, from = up ? yb - LANE_HALF + 40 : ya + LANE_HALF - 40, len = (yb - ya - 2 * LANE_HALF) * 0.62 * (up ? -1 : 1);
    const pts = []; for (let t = 0; t <= 1.001; t += 1 / 14) pts.push([x0 + Math.sin(t * Math.PI * 1.6 + k) * 150 * F * (0.4 + t), from + len * t]);
    for (let n = 1; n < pts.length; n++) { const [ax, ay] = pts[n - 1], [bx, by] = pts[n], st = Math.ceil(Math.hypot(bx - ax, by - ay) / 14); for (let q = 0; q <= st; q++) carveGrass(ax + (bx - ax) * q / st, ay + (by - ay) * q / st, 70); }
  }
}
'''
s = s[:a] + trails + s[a:]
# smoothed grass field (same blur as walkField)
s += '''
const smoothG = new Float32Array(GW * GH);
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
  let t = 0, w = 0;
  for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const wt = 1 / (1 + di * di + dj * dj), x = i + di, y = j + dj; t += (x >= 0 && y >= 0 && x < GW && y < GH && grass[y * GW + x] ? 1 : 0) * wt; w += wt; }
  smoothG[j * GW + i] = t / w;
}
const sg = (i, j) => smoothG[Math.max(0, Math.min(GH - 1, j)) * GW + Math.max(0, Math.min(GW - 1, i))];
export const grassField = (x, y) => {
  const gx = x / CELL - 0.5, gy = y / CELL - 0.5, i = Math.floor(gx), j = Math.floor(gy), fx = gx - i, fy = gy - j;
  return (sg(i, j) * (1 - fx) + sg(i + 1, j) * fx) * (1 - fy) + (sg(i, j + 1) * (1 - fx) + sg(i + 1, j + 1) * fx) * fy;
};
'''
open('src/mapdata.js', 'w', encoding='utf-8').write(s)

# ---------------- world.js ----------------
s = open('src/world.js', encoding='utf-8').read()
def sub(a, b):
    global s
    assert a in s, a[:90]; s = s.replace(a, b, 1)
sub("import { walk, GW, GH, CELL, cellWalk, walkField, CAMP_SITES,", "import { walk, GW, GH, CELL, cellWalk, walkField, grassField, isWalk as isWalkM, CAMP_SITES,")
# dirt only where it is not a grass trail
sub("dm[j * cols + i] = walkField((i + 0.5) * T * K, (j + 0.5) * T * K) >= 0.5 ? 1 : 0;", "dm[j * cols + i] = walkField((i + 0.5) * T * K, (j + 0.5) * T * K) >= 0.5 && grassField((i + 0.5) * T * K, (j + 0.5) * T * K) < 0.3 ? 1 : 0;")
# camps: 2 neutral flags on the river + one flag per tower
a = s.index("  setupCamps() {"); b = s.index("  campOwnerColor(o) {")
s = s[:a] + """  setupCamps() {
    this.camps = []; this.ships = []; this.campG = this.add.graphics().setDepth(-870); this.campR = 118;
    if (this.training) return;
    const mk = (x, y, ln, owner, tower = null) => { const c = { i: this.camps.length, x, y, ln, lane: y < WORLD_H / 2 ? 'n' : 's', owner, prog: owner === 0 ? [1, 0] : owner === 1 ? [0, 1] : [0, 0], spawnT: 0, contested: false, flag: null, fx: 0, tower }; this.camps.push(c); return c; };
    [RIVER.y0 + 280 * F, RIVER.y1 - 280 * F].forEach((y, k) => mk(WORLD_W / 2 + riverOffset(y), y, k ? 2 : 0, null));   // neutral flags in the middle of the river, at both ends of the map
    for (const t of this.fighters) if (t.isTower && !t.isNexus) mk(t.x + 46, t.y + 46, t.laneI, t.team, t);   // every tower carries a flag; once the tower falls the enemy can capture it
  }
""" + s[b:]
# camp logic: locked while the tower stands
sub("    for (const c of this.camps) {\n      const n = [0, 0]; for (const f of this.fighters) if (f.isChamp", "    for (const c of this.camps) {\n      if (c.tower?.alive) { c.contested = false; continue; }   // a tower flag cannot be captured while its tower stands\n      const n = [0, 0]; for (const f of this.fighters) if (f.isChamp")
sub("      if (c.owner != null) { c.spawnT -= dt; if (c.spawnT <= 0) { c.spawnT = 30; this.dropShip(c, c.owner); } }", "      if (c.owner != null && !(c.tower && c.owner === c.tower.team)) { c.spawnT -= dt; if (c.spawnT <= 0) { c.spawnT = 30; this.dropShip(c, c.owner); } }   // reinforcements only for whoever took a flag from its builder")
# lane path from any flag
a = s.index("  lanePath(c, team) {"); b = s.index("  // a giant ship descends")
s = s[:a] + """  lanePath(c, team) {   // from the flag onto its lane, then straight to the enemy base
    const endX = team === 0 ? WORLD_W - 495 * F : 495 * F, raw = [{ x: c.x, y: c.y }, { x: c.x, y: laneYAt(c.ln, c.x) }, { x: endX, y: laneYAt(c.ln, endX) }];
    const pts = [raw[0]]; for (let i = 1; i < raw.length; i++) { const a = raw[i - 1], b = raw[i], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 70); for (let k = 1; k <= n; k++) pts.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n }); }
    return pts;
  }
""" + s[b:]
sub("this.drawTimers(); this.drawTowerFlags(); this.drawRiver(dt);", "this.drawTimers(); this.drawRiver(dt);")
# drawing: tower flags keep only the flag while locked
sub("      const a = this.campR, b = a * YR, col = (o) => this.campOwnerColor(o);\n      g.fillStyle(0x0a0f1a, 0.38).fillEllipse(c.x, c.y, a * 2, b * 2);", "      const a = this.campR, b = a * YR, col = (o) => this.campOwnerColor(o), lock = !!c.tower?.alive;\n      if (!lock) g.fillStyle(0x0a0f1a, 0.38).fillEllipse(c.x, c.y, a * 2, b * 2);")
sub("      pie(c.prog[0], col(0), 0.55); pie(c.prog[1], col(1), 0.55);\n      g.lineStyle(3, c.contested ? 0xffffff : col(c.owner), c.contested ? 0.5 + 0.5 * Math.sin(t * 10) : 0.9).strokeEllipse(c.x, c.y, a * 2, b * 2);\n      g.lineStyle(1, 0xffffff, 0.35).strokeEllipse(c.x, c.y, a * 1.7, b * 1.7);", "      if (!lock) { pie(c.prog[0], col(0), 0.55); pie(c.prog[1], col(1), 0.55);\n      g.lineStyle(3, c.contested ? 0xffffff : col(c.owner), c.contested ? 0.5 + 0.5 * Math.sin(t * 10) : 0.9).strokeEllipse(c.x, c.y, a * 2, b * 2);\n      g.lineStyle(1, 0xffffff, 0.35).strokeEllipse(c.x, c.y, a * 1.7, b * 1.7); }")
sub("const own = c.owner != null; this.timerLabel('c' + c.i,", "const own = c.owner != null && !(c.tower && (c.tower.alive || c.owner === c.tower.team)); this.timerLabel('c' + c.i,")
# line of sight: non-walkable terrain blocks vision
sub("  sightOf(f) {", """  sees(a, b) {   // line of sight: nobody sees through the non-walkable terrain (forest)
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), n = Math.ceil(d / 48);
    for (let k = 1; k < n; k++) if (!isWalkM(a.x + dx * k / n, a.y + dy * k / n)) return false;
    return true;
  }
  sightOf(f) {""")
sub("      f.fogHidden = !src.some(s => Math.hypot(s.x - f.x, s.y - f.y) <= this.sightOf(s));", "      f.fogHidden = !src.some(s => Math.hypot(s.x - f.x, s.y - f.y) <= this.sightOf(s) && this.sees(s, f));")
open('src/world.js', 'w', encoding='utf-8').write(s)

# ---------------- ai.js: bots do not walk to a flag whose tower still stands ----------------
edit('src/ai.js', [("    if (c.owner === f.team && c.prog[f.team] > 0.95) continue;", "    if (c.tower?.alive) continue;\n    if (c.owner === f.team && c.prog[f.team] > 0.95) continue;")])

# ---------------- hud.js minimap: grass trails are green ----------------
edit('src/hud.js', [
("import { walk, GW, GH, CELL, RIVER, riverOffset, BASE_Y, F } from './mapdata.js';", "import { walk, grass, GW, GH, CELL, RIVER, riverOffset, BASE_Y, F } from './mapdata.js';"),
("if (walk[j * GW + i]) g.fillStyle(dirt)", "if (walk[j * GW + i] && !grass[j * GW + i]) g.fillStyle(dirt)"),
])
print('ok')
