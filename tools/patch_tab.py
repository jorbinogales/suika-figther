import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def rep(s, old, new, count=1):
    assert old in s, old[:110]
    return s.replace(old, new, count)

# world.js: TAB is a real key (hold to show the scoreboard)
p = ROOT / 'src/world.js'; s = p.read_text(encoding='utf8')
s = rep(s, "shop: 'B', lvl: 'L',", "shop: 'B', tab: 'TAB', lvl: 'L',")
p.write_text(s, encoding='utf8')

# hud.js: scoreboard while TAB is held
p = ROOT / 'src/hud.js'; s = p.read_text(encoding='utf8')
s = rep(s, "    this.drawShop(A, p, u, W, H);\n", "    this.drawShop(A, p, u, W, H);\n    this.drawScoreboard(A, p, u, W, H, !!A.k?.tab?.isDown && !this.shopOpen && !A.paused);\n")
s = rep(s, "  // death recap: the killer (big)", """  /* ---------- scoreboard (hold TAB): both teams, champion faces, names, K/D/A, level, gold and their 6 items ---------- */
  drawScoreboard(A, p, u, W, H, on) {
    if (!this.sbG) this.sbG = this.add.graphics().setDepth(26);
    const g = this.sbG; g.clear(); if (!on) { this.sbOn = false; return; }
    const D = 27, rows = A.champs.filter(c => c.isChamp), mine = A.player.baseTeam;
    const teams = [mine, 1 - mine].map(t => rows.filter(c => c.baseTeam === t).sort((a, b) => b.kills - a.kills || a.deaths - b.deaths));
    const maxN = Math.max(1, ...teams.map(t => t.length)), pw = Math.min(W - 20, 880 * u), rh = Math.min(62 * u, (H - 150 * u) / (maxN * 2 + 1.2)), hh = 30 * u, th = 26 * u;
    const ph = th * 2 + hh * 1 + (teams[0].length + teams[1].length) * rh + 36 * u, x0 = (W - pw) / 2, y0 = Math.max(8, (H - ph) / 2 - 20 * u);
    this.boxes.push({ x: 0, y: 0, w: W, h: H });
    g.fillStyle(0x000000, 0.5).fillRect(0, 0, W, H);
    g.fillStyle(0x060b16, 0.96).fillRect(x0, y0, pw, ph).lineStyle(3, 0x3fd0ff, 0.95).strokeRect(x0, y0, pw, ph);
    const cX = { face: x0 + 14 * u, name: x0 + 14 * u + rh + 10 * u, lvl: x0 + pw * 0.36, kda: x0 + pw * 0.43, gold: x0 + pw * 0.56, items: x0 + pw * 0.64 };
    const hdr = (id, str, x, y, col = '#7ee0ff', al = [0, 0.5]) => this.T('sb' + id, str, x, y, { size: 11 * u, bold: true, color: col, origin: al, depth: D + 1, stroke: 2 });
    hdr('H0', 'CAMPEÓN', cX.name, y0 + 17 * u); hdr('H1', 'NIV', cX.lvl, y0 + 17 * u); hdr('H2', 'K / D / A', cX.kda, y0 + 17 * u); hdr('H3', 'ORO', cX.gold, y0 + 17 * u); hdr('H4', 'OBJETOS', cX.items, y0 + 17 * u);
    const tot = [0, 1].map(i => teams[i].reduce((a, c) => a + c.kills, 0));
    let y = y0 + 34 * u, n = 0, ci = 0;
    teams.forEach((list, ti) => {
      const col = ti === 0 ? 0x3b8cff : 0xff5252, tc = ti === 0 ? '#8ab4ff' : '#ff8a8a';
      g.fillStyle(col, 0.25).fillRect(x0 + 6 * u, y, pw - 12 * u, th).fillStyle(col, 1).fillRect(x0 + 6 * u, y, 5 * u, th);
      this.T('sbT' + ti, `${ti === 0 ? 'TU EQUIPO' : 'EQUIPO RIVAL'}  ·  ${tot[ti]} bajas`, x0 + 18 * u, y + th / 2, { size: 13 * u, bold: true, color: tc, origin: [0, 0.5], depth: D + 1, stroke: 2 });
      y += th + 2 * u;
      list.forEach(c => {
        const q = { x: x0 + 6 * u, y, w: pw - 12 * u, h: rh - 3 * u }, me = c === A.player, dead = !c.alive;
        g.fillStyle(me ? 0x1d3a1d : 0x0e1628, 1).fillRect(q.x, q.y, q.w, q.h).lineStyle(me ? 2 : 1, me ? 0x7dff9a : 0x2a3650, 1).strokeRect(q.x, q.y, q.w, q.h);
        const fs = q.h - 6 * u, fx = cX.face, fy = q.y + 3 * u;
        g.fillStyle(0x000000, 1).fillRect(fx - 1, fy - 1, fs + 2, fs + 2).lineStyle(2, col, 1).strokeRect(fx - 1, fy - 1, fs + 2, fs + 2);
        if (this.textures.exists('face_' + c.key)) this.iconImg('sbF' + ci, 'face_' + c.key, fx + fs / 2, fy + fs / 2, fs, D + 0.4).setAlpha(dead ? 0.4 : 1);
        const my = q.y + q.h / 2;
        this.T('sbN' + ci, c.def.name, cX.name, my - 8 * u, { size: 14 * u, bold: true, color: me ? '#7dff9a' : dead ? '#7a8394' : '#ffffff', origin: [0, 0.5], depth: D + 1, stroke: 3 });
        this.T('sbC' + ci, dead ? 'MUERTO' : CLASS_LABEL(c), cX.name, my + 9 * u, { size: 10 * u, color: dead ? '#ff7a7a' : '#8aa0c8', origin: [0, 0.5], depth: D + 1, stroke: 2 });
        this.T('sbL' + ci, `${c.level}`, cX.lvl, my, { size: 16 * u, bold: true, color: '#ffe27a', origin: [0, 0.5], depth: D + 1, stroke: 3 });
        this.T('sbK' + ci, `${c.kills} / ${c.deaths} / ${c.assists}`, cX.kda, my, { size: 16 * u, bold: true, color: '#ffffff', origin: [0, 0.5], depth: D + 1, stroke: 3 });
        this.T('sbG' + ci, `${Math.floor(c.gold)}`, cX.gold, my, { size: 14 * u, bold: true, color: '#ffd23f', origin: [0, 0.5], depth: D + 1, stroke: 3 });
        const sz = Math.min(q.h - 8 * u, (x0 + pw - 14 * u - cX.items - 5 * 4 * u) / 6);
        for (let i = 0; i < 6; i++) {
          const iq = { x: cX.items + i * (sz + 4 * u), y: my - sz / 2, w: sz, h: sz }, sl = c.inv[i];
          if (!sl) { g.fillStyle(0x0d1422, 1).fillRect(iq.x, iq.y, iq.w, iq.h).lineStyle(1, 0x2a3650, 1).strokeRect(iq.x, iq.y, iq.w, iq.h); continue; }
          this.tile(g, 'sbI' + ci + '_' + i, sl.id, iq, D + 0.3, dead ? 0.55 : 1);
          if (ITEM_BY_ID[sl.id].consumable && sl.charges > 1) this.T('sbX' + ci + '_' + i, `x${sl.charges}`, iq.x + iq.w - 1, iq.y + iq.h, { size: 9 * u, bold: true, origin: [1, 1], color: '#ffe066', depth: D + 1.5, stroke: 2 });
        }
        y += rh; ci++;
      });
      y += 4 * u;
    });
    this.T('sbHint', 'Mantén TAB para ver el marcador', x0 + pw / 2, y0 + ph - 11 * u, { size: 10 * u, color: '#6d7d9c', origin: [0.5, 0.5], depth: D + 1, stroke: 2 });
  }

  // death recap: the killer (big)""")
s = rep(s, "export class Hud", "const CLASS_LABEL = c => ({ ai: 'Poder de IA', programador: 'Programador', soporte: 'Soporte', hacker: 'Hacker', cyber: 'Ciber' }[c.def.cls] || c.def.cls || '');\n\nexport class Hud")
p.write_text(s, encoding='utf8'); print('patched')
