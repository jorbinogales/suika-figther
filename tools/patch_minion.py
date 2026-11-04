import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def rep(s, old, new, count=1):
    assert old in s, old[:110]
    return s.replace(old, new, count)

# ================= world.js: minion rewards (killer = gold + most of the XP; nearby allies = a little XP, no gold) + bar highlight
p = ROOT / 'src/world.js'; s = p.read_text(encoding='utf8')
s = rep(s, "    this.fighters.filter(c => c.isChamp && c.alive && c.team === team && dist(c, v) <= 700).forEach(c => {\n      c.gainXp(r.xp);\n      if (c === me) this.float(v.x + 24, v.y - v.def.height - 8, `+${r.xp}xp`, '#7ee0ff');\n    });",
"""    // minions: the champion that lands the kill gets the gold and most of the XP; allied champions near the minion only get a small share of XP (no gold).
    // Hitting a minion without killing it earns nothing. Every other kill (champions, towers...) keeps sharing the XP between the nearby team.
    const near = this.fighters.filter(c => c.isChamp && c.alive && c.team === team && dist(c, v) <= 700);
    near.forEach(c => {
      const xp = v.isMinion ? (c === kc ? r.xp : Math.round(r.xp * MINION_XP_SHARE)) : r.xp;
      if (xp <= 0) return; c.gainXp(xp);
      if (c === me) this.float(v.x + 24 + (c === kc ? 0 : 10), v.y - v.def.height - 8 + (c === kc ? 0 : 12), `+${xp}xp`, '#7ee0ff');
    });
    if (v.isMinion && kc?.isChamp && !near.includes(kc)) { kc.gainXp(r.xp); if (kc === me) this.float(v.x + 24, v.y - v.def.height - 8, `+${r.xp}xp`, '#7ee0ff'); }   // the killer always gets his XP, even from far away (ranged last hit)""")
s = rep(s, "const YR = 0.75;", "const MINION_XP_SHARE = 0.3;   // XP of an allied champion that is near a minion killed by someone else (the killer gets 100 %)\nconst YR = 0.75;")
s = rep(s, "      if (sh > 0) g.fillStyle(0xffffff).fillRect(x + w * f.hp / tot, y, w * sh / tot, h)",
"""      if (f.isMinion && f.baseTeam !== me.baseTeam && me.alive && me.isChamp && f.hp + sh <= me.nextBasicDmg(f)) {   // Wild Rift style: one basic attack kills it -> the bar flashes bright
        const pz = 0.6 + 0.4 * Math.sin(this.time.now / 110);
        g.fillStyle(0xffe14d, 1).fillRect(x, y, w * f.hp / tot, h).lineStyle(2, 0xffffff, pz).strokeRect(x - 2, y - 2, w + 4, h + 4).lineStyle(4, 0xffd23f, 0.35 * pz).strokeRect(x - 4, y - 4, w + 8, h + 8);
      }
      if (sh > 0) g.fillStyle(0xffffff).fillRect(x + w * f.hp / tot, y, w * sh / tot, h)""")
p.write_text(s, encoding='utf8')

# ================= fighter.js: damage the next basic attack would deal to a target (after armour / resistance)
p = ROOT / 'src/fighter.js'; s = p.read_text(encoding='utf8')
s = rep(s, "  _tryBasic() {", """  // damage the NEXT basic attack (the next hit of the combo) would deal to `t`, after armour / magic resistance (used by the last-hit indicator)
  nextBasicDmg(t) {
    const b = this.hen ? { ...this.def.basic, ...this.def.basic.hen } : this.def.basic, C = this.comboCfg(), w = this.w;
    const inWin = this.comboStep > 0 && this.comboStep < C.length && (w.gameT || 0) - (this.comboEnd || 0) <= COMBO_WINDOW, cs = C[inWin ? this.comboStep : 0];
    let raw;
    if (b.kind === 'melee') raw = (b.base + this.atk * b.atkScale) * cs.dmg * (this.key === 'jorbi' && cs.fin && this.ranks.p3 > 0 ? rk(this.def.abilities.p3.critMult, this.ranks.p3) : 1);
    else if (b.obj || !b.every3) raw = ((b.alt || (b.apScale != null && b.atkScale == null) ? b.base + this.ap * b.apScale : b.base + this.atk * b.atkScale) * cs.dmg) * (cs.shots || 1);
    else raw = (b.base + this.ap * b.apScale) * (cs.fin ? b.every3.mult * (cs.finMult || 1) : cs.dmg) * (cs.shots || 1);
    const res = b.type === 'physical' ? t.armor : b.type === 'magic' ? t.mr : 0;
    return Math.max(1, raw * 100 / (100 + res));
  }
  _tryBasic() {""")
p.write_text(s, encoding='utf8')

# ================= hud.js: scoreboard in two coloured sections (blue allies / red rivals) and a bright box for the player
p = ROOT / 'src/hud.js'; s = p.read_text(encoding='utf8')
s = rep(s, "      const col = ti === 0 ? 0x3b8cff : 0xff5252, tc = ti === 0 ? '#8ab4ff' : '#ff8a8a';\n      g.fillStyle(col, 0.25).fillRect(x0 + 6 * u, y, pw - 12 * u, th).fillStyle(col, 1).fillRect(x0 + 6 * u, y, 5 * u, th);",
"""      const col = ti === 0 ? 0x3b8cff : 0xff5252, tc = ti === 0 ? '#8ab4ff' : '#ff8a8a', secH = th + 2 * u + list.length * rh + 4 * u;
      g.fillStyle(ti === 0 ? 0x0a1c3d : 0x3a0c12, 1).fillRect(x0 + 4 * u, y - 2 * u, pw - 8 * u, secH + 2 * u).lineStyle(2.5, col, 1).strokeRect(x0 + 4 * u, y - 2 * u, pw - 8 * u, secH + 2 * u);   // the whole section is tinted: blue = your team, red = the rivals
      g.fillStyle(col, 0.55).fillRect(x0 + 6 * u, y, pw - 12 * u, th).fillStyle(col, 1).fillRect(x0 + 6 * u, y, 5 * u, th);""")
s = rep(s, "{ size: 13 * u, bold: true, color: tc, origin: [0, 0.5], depth: D + 1, stroke: 2 });\n      y += th + 2 * u;", "{ size: 14 * u, bold: true, color: '#ffffff', origin: [0, 0.5], depth: D + 1, stroke: 3 });\n      y += th + 2 * u;")
s = rep(s, "        g.fillStyle(me ? 0x1d3a1d : 0x0e1628, 1).fillRect(q.x, q.y, q.w, q.h).lineStyle(me ? 2 : 1, me ? 0x7dff9a : 0x2a3650, 1).strokeRect(q.x, q.y, q.w, q.h);",
"""        g.fillStyle(ti === 0 ? 0x10284f : 0x4a1218, 1).fillRect(q.x, q.y, q.w, q.h).lineStyle(1, col, 0.55).strokeRect(q.x, q.y, q.w, q.h);
        if (me) {   // your own box shines: bright fill, pulsing white glow and a white border
          const pz = 0.6 + 0.4 * Math.sin(this.time.now / 220);
          g.fillStyle(0xffffff, 0.14 + 0.08 * pz).fillRect(q.x, q.y, q.w, q.h);
          g.lineStyle(10, 0xffffff, 0.12 * pz).strokeRect(q.x - 4, q.y - 4, q.w + 8, q.h + 8).lineStyle(5, col, 0.4 * pz).strokeRect(q.x - 2, q.y - 2, q.w + 4, q.h + 4).lineStyle(3, 0xffffff, 1).strokeRect(q.x, q.y, q.w, q.h);
          g.fillStyle(0xffd23f, 1).fillRect(q.x, q.y, 6 * u, q.h);
        }""")
s = rep(s, "color: me ? '#7dff9a' : dead ? '#7a8394' : '#ffffff', origin: [0, 0.5], depth: D + 1, stroke: 3 });", "color: me ? '#ffe27a' : dead ? '#7a8394' : '#ffffff', origin: [0, 0.5], depth: D + 1, stroke: 3 });")
s = rep(s, "      y += 4 * u;\n    });", "      y += 10 * u;   // gap between the two sections\n    });")
s = rep(s, "const ph = th * 2 + hh * 1 + (teams[0].length + teams[1].length) * rh + 36 * u,", "const ph = th * 2 + hh * 1 + (teams[0].length + teams[1].length) * rh + 54 * u,")
p.write_text(s, encoding='utf8'); print('patched')
