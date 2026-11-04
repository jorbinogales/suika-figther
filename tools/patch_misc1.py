import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def rep(s, old, new, count=1):
    assert old in s, old[:110]
    return s.replace(old, new, count)

# ================= fighter.js: slower levelling
p = ROOT / 'src/fighter.js'; s = p.read_text(encoding='utf8')
s = rep(s, "get xpNeed() { return Math.round(80 * Math.pow(1.28, this.level - 1)); }   // each level needs ~28% more XP than the last",
           "get xpNeed() { return Math.round(110 * Math.pow(1.3, this.level - 1)); }   // each level needs ~30% more XP than the last (about 55 % more XP in total than before: levelling is slower)")
p.write_text(s, encoding='utf8')

# ================= world.js: champion kill = 300 gold; assists share 100 gold between everyone who assisted; shopping while dead
p = ROOT / 'src/world.js'; s = p.read_text(encoding='utf8')
s = rep(s, "      if (v.isChamp && v.hitBy) for (const [c, t] of v.hitBy) if (c !== kc && c.baseTeam === kc.baseTeam && this.gameT - t <= 10) c.assists++;   // assists: allies who hit the victim in the last 10 s",
"""      if (v.isChamp && v.hitBy) {   // assists: allies who hit the victim in the last 10 s; the 100 gold of the assist is split between all of them
        const as = [...v.hitBy].filter(([c, t]) => c !== kc && c.isChamp && c.baseTeam === kc.baseTeam && this.gameT - t <= 10).map(([c]) => c), share = as.length ? Math.round(100 / as.length) : 0;
        as.forEach(c => { c.assists++; c.gold += share; if (c === me) this.float(v.x, v.y - v.def.height - 46, `+${share}g (asistencia)`, '#ffe27a'); });
      }""")
s = rep(s, "  canShop(f) { return f.alive && (this.training || this.inBase(f)); }", "  canShop(f) { return !!f.isChamp && (!f.alive || this.training || this.inBase(f)); }   // a dead champion can shop from anywhere while waiting to respawn")
p.write_text(s, encoding='utf8')

# ================= hud.js: faces on the minimap + allies' status row above it
p = ROOT / 'src/hud.js'; s = p.read_text(encoding='utf8')
s = rep(s, "    this.drawMinimap(A, g, o, Rm('minimap'));", "    this.drawMinimap(A, g, o, Rm('minimap'));\n    this.drawAllies(A, g, o, Rm('minimap'), u);")
s = rep(s, "  drawMinimap(A, g, o, q) {", """  // round portrait of a champion (colour or grey), cached as a canvas texture
  roundFace(key, gray) {
    const id = (gray ? 'faceG_' : 'faceR_') + key; if (this.textures.exists(id)) return id;
    if (!this.textures.exists('face_' + key)) return null;
    const src = this.textures.get('face_' + key).getSourceImage(), S = 96, ct = this.textures.createCanvas(id, S, S), c = ct.getContext('2d');
    c.beginPath(); c.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); c.clip();
    if (gray) c.filter = 'grayscale(1) brightness(0.6)';
    const k = Math.max(S / src.width, S / src.height); c.drawImage(src, (S - src.width * k) / 2, (S - src.height * k) / 2, src.width * k, src.height * k);
    ct.refresh(); return id;
  }
  // allies above the minimap: round face with a health ring around it; dead allies are grey with the seconds left to respawn on their face
  drawAllies(A, g, o, q, u) {
    const me = A.player, list = A.champs.filter(c => c.isChamp && c !== me && c.baseTeam === me.baseTeam);
    const sz = 46 * u, gap = 8 * u, y = q.y - 16 * u - sz / 2;
    list.forEach((c, i) => {
      const cx = q.x + q.w - sz / 2 - 4 * u - (list.length - 1 - i) * (sz + gap), r = sz / 2, dead = !c.alive, f = dead ? 0 : Phaser.Math.Clamp(c.hp / c.maxHp, 0, 1);
      o.fillStyle(0x000000, 0.7).fillCircle(cx, y, r + 5 * u);
      o.lineStyle(4 * u, 0x2a1414, 1).beginPath().arc(cx, y, r + 2.5 * u, 0, Math.PI * 2).strokePath();
      if (f > 0.005) o.lineStyle(4 * u, f > 0.5 ? 0x4cd964 : f > 0.25 ? 0xffd23f : 0xff4a4a, 1).beginPath().arc(cx, y, r + 2.5 * u, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f, false).strokePath();
      const id = this.roundFace(c.key, dead); if (id) this.iconImg('allyF' + i, id, cx, y, sz, 4.5);
      if (dead) {
        o.fillStyle(0x000000, 0.35).fillCircle(cx, y, r);
        this.T('allyD' + i, `${Math.max(0, Math.ceil(c.respawnTime - c.deadT))}`, cx, y, { size: sz * 0.5, bold: true, color: '#ffffff', origin: [0.5, 0.5], depth: 5, stroke: 4 });
      }
      o.fillStyle(0x000000, 0.85).fillCircle(cx + r * 0.72, y + r * 0.72, 9 * u).lineStyle(1.5, dead ? 0x6a6a72 : 0xffd23f, 1).strokeCircle(cx + r * 0.72, y + r * 0.72, 9 * u);
      this.T('allyL' + i, `${c.level}`, cx + r * 0.72, y + r * 0.72, { size: 11 * u, bold: true, color: dead ? '#9a9aa4' : '#ffe27a', origin: [0.5, 0.5], depth: 5, stroke: 2 });
      this.T('allyN' + i, c.def.name, cx, y + r + 11 * u, { size: 9 * u, color: dead ? '#8a8a94' : '#cfe3ff', origin: [0.5, 0], depth: 5, stroke: 2 });
    });
  }
  drawMinimap(A, g, o, q) {""")
s = rep(s, "      g.fillStyle(ft.isNexus && !ft.alive ? 0x444444 : ft === me ? 0x3ddc84 : ft.team === me.baseTeam ? 0x3b82f6 : 0xff3b3b);\n      if (ft.isNexus)",
"""      const tc = ft.isNexus && !ft.alive ? 0x444444 : ft === me ? 0x3ddc84 : ft.team === me.baseTeam ? 0x3b82f6 : 0xff3b3b;
      if (ft.isChamp) {   // champions are drawn as their round face with a team-coloured ring (green = you, blue = ally, red = enemy)
        const rr = 11 * (q.w / 330), id = this.roundFace(ft.key, false);
        o.fillStyle(0x000000, 0.8).fillCircle(cx, cy, rr + 2.5).lineStyle(2.5, tc, 1).strokeCircle(cx, cy, rr + 1);
        if (id) this.iconImg('mmF' + ft.nid, id, cx, cy, rr * 2, 4.2);
        if (ft === A.selected) o.lineStyle(2, 0xffffff).strokeCircle(cx, cy, rr + 5);
        return;
      }
      g.fillStyle(tc);
      if (ft.isNexus)""")
p.write_text(s, encoding='utf8'); print('patched')
