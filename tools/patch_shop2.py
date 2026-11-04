import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def rep(s, old, new, count=1):
    assert old in s, old[:110]
    return s.replace(old, new, count)

def between(s, a, b, new):
    i = s.index(a); j = s.index(b, i)
    return s[:i] + new + s[j:]

# ============ world.js: combo counter as a framed box by the bars (like the invulnerability icon)
p = ROOT / 'src/world.js'; s = p.read_text(encoding='utf8')
a = s.index("        if (f === me && f.cstepN > 0) {"); b = s.index("        const gx = x - 17, gy = y + (h + mh + 2) / 2;")
s = s[:a] + """        { // basic attack combo: a framed counter box next to the bars (hit 1 / 2 / 3); it disappears when the click window runs out
          const live = f === me && f.cstepN > 0 && this.gameT - (f.comboEnd || 0) <= (f.comboStep > 0 ? COMBO_WINDOW : 0.25), ct = (f.bt.cmb ||= this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 3, resolution: 3 }).setOrigin(0.5).setDepth(100001));
          if (live) {
            const n = f.cstepN, bx = x + w + 5 + (f.arepaUp ? 26 : 0), by = y + h / 2 - 7, col = n === 3 ? 0xff9a2e : n === 2 ? 0xffb02e : 0xffd23f;
            g.fillStyle(0x000000, 0.85).fillRect(bx - 1, by - 1, 26, 26).fillStyle(0x1b1408, 1).fillRect(bx, by, 24, 24).lineStyle(2, col, 1).strokeRect(bx, by, 24, 24);
            for (let i = 0; i < 3; i++) g.fillStyle(i < n ? col : 0x3a3a46, 1).fillRect(bx + 3 + i * 7, by + 19, 5, 3);
            ct.setVisible(true).setText(`${n}`).setColor(n === 3 ? '#ffb85a' : '#ffe27a').setPosition(bx + 12, by + 9);
          } else ct.setVisible(false);
        }
""" + s[b:]
p.write_text(s, encoding='utf8')

# ============ recommend.js: only purple (level 3) items, preset builds of purple items, counters return champion keys
p = ROOT / 'src/recommend.js'; s = p.read_text(encoding='utf8')
a = s.index("export const PRESETS = {"); b = s.index("export const presetOf")
s = s[:a] + """export const PRESETS = {   // level-3 (purple) items only
  leandro:  ['nucleo_ia', 'tarjeta_grafica', 'procesador_cuantico', 'firewall_magico', 'botas_hipersonicas', 'servidor_redundante'],
  xeviche:  ['nucleo_ia', 'tarjeta_grafica', 'procesador_cuantico', 'firewall_magico', 'corazon_silicio', 'botas_hipersonicas'],
  julio:    ['procesador_cuantico', 'tarjeta_grafica', 'nucleo_ia', 'firewall_magico', 'botas_hipersonicas', 'servidor_redundante'],
  axel:     ['dron_combate', 'nucleo_ia', 'procesador_cuantico', 'firewall_magico', 'botas_hipersonicas', 'corazon_silicio'],
  yonaiker: ['bate_servidor', 'punio_acero', 'garras_vampiricas', 'botas_hipersonicas', 'chaleco_antibalas', 'filtro_spam'],
  eliud:    ['bate_servidor', 'punio_acero', 'garras_vampiricas', 'chaleco_antibalas', 'botas_hipersonicas', 'servidor_redundante'],
  luis:     ['punio_acero', 'garras_vampiricas', 'procesador_cuantico', 'botas_hipersonicas', 'chaleco_antibalas', 'filtro_spam'],
  jorbi:    ['punio_acero', 'garras_vampiricas', 'chaleco_antibalas', 'servidor_redundante', 'botas_hipersonicas', 'firewall_magico'],
  junior:   ['bate_servidor', 'chaleco_antibalas', 'corazon_silicio', 'garras_vampiricas', 'botas_hipersonicas', 'armadura_rack'],
  hector:   ['servidor_redundante', 'chaleco_antibalas', 'armadura_rack', 'firewall_magico', 'botas_hipersonicas', 'filtro_spam'],
};
""" + s[b:]
s = s.replace("const names = list => list.map(f => f.def.name);", "const names = list => list.map(f => f.key);   // champion keys (the shop draws their faces)")
s = s.replace(".slice(0, k).map(e => e.f.def.name);", ".slice(0, k).map(e => e.f.key);")
s = rep(s, "  const cands = ITEMS.filter(i => ((!i.consumable && i.cat !== 'rec') || i.consumable?.cleanse) && !owns(inv, i.id));", "  const cands = ITEMS.filter(i => i.lvl === 3 && !i.consumable && !owns(inv, i.id));   // recommendations are purple (level 3) items only")
s = rep(s, "const okc = s => s.c.names.length && !picked.has(s.it.id) && s.it.lvl >= 2;", "const okc = s => s.c.names.length && !picked.has(s.it.id);")
s = rep(s, "add('complement', scored.find(s => s.it.cat !== X.cat && ['arm', 'mr', 'hp', 'util'].includes(s.it.cat) && !picked.has(s.it.id) && s.it.lvl >= 2), { of: X.id });", "add('complement', scored.find(s => s.it.cat !== X.cat && ['arm', 'mr', 'hp', 'util'].includes(s.it.cat) && !picked.has(s.it.id)), { of: X.id });")
# every card needs champions to show: no specific counter -> all the enemies of the match
s = rep(s, "  for (const r of recs) if (!r.vs.length) {", "  for (const r of recs) if (!r.vs.length) r.vs = th.list.map(e => e.f.key);\n  for (const r of recs) if (!r.reason) {")
p.write_text(s, encoding='utf8')

# ============ hud.js: vertical cards, faces instead of names
p = ROOT / 'src/hud.js'; s = p.read_text(encoding='utf8')
a = s.index("    const gap = 10 * u, cw = (gw - gap * 2) / 3, ch = 178 * u, cy = gy + 26 * u;"); b = s.index("    // the champion's preset build: 6 items in purchase order")
s = s[:a] + """    const gap = 12 * u, cw = (gw - gap * 2) / 3, ch = 262 * u, cy = gy + 26 * u;
    R.recs.forEach((r, i) => {
      const it = ITEM_BY_ID[r.id], q = { x: gx + i * (cw + gap), y: cy, w: cw, h: ch }, tg = TAG[r.tag] || TAG.flex, pl = buyPlan(p.inv, r.id), afford = pl.ok && p.gold >= pl.gold, sel = this.shopSel === r.id;   // vertical card
      bev(q.x, q.y, q.w, q.h, 8 * u, 0x0d1830, 1, tg[1], sel ? 1 : 0.65, sel ? 3 : 1.5);
      g.fillStyle(tg[1], 0.92).fillRect(q.x + 3 * u, q.y + 3 * u, q.w - 6 * u, 17 * u);
      this.T('rcT' + i, r.of && ITEM_BY_ID[r.of] ? `${tg[0]} · ${ITEM_BY_ID[r.of].name}` : tg[0], q.x + q.w / 2, q.y + 5 * u, { size: 9.5 * u, bold: true, color: '#04101c', origin: [0.5, 0], depth: D + 1, stroke: 0 }).setWordWrapWidth(q.w - 8 * u, true);
      const ts = Math.min(76 * u, q.w - 28 * u), tq = { x: q.x + (q.w - ts) / 2, y: q.y + 30 * u, w: ts, h: ts };
      this.tile(g, 'rc' + i, r.id, tq, D, afford ? 1 : 0.55);
      this.T('rcN' + i, it.name.toUpperCase(), q.x + q.w / 2, tq.y + ts + 8 * u, { size: 12 * u, bold: true, color: '#ffffff', origin: [0.5, 0], depth: D + 1, stroke: 2 }).setWordWrapWidth(q.w - 12 * u, true).setAlign('center');
      this.T('rcP' + i, pl.gold === 0 && !pl.ok ? pl.reason : `${pl.gold} oro`, q.x + q.w / 2, tq.y + ts + 40 * u, { size: 13 * u, bold: true, color: afford ? '#ffd23f' : '#ff6a6a', origin: [0.5, 0], depth: D + 1, stroke: 2 });
      const sy = q.y + q.h - 78 * u;
      g.fillStyle(tg[1], 0.3).fillRect(q.x + 8 * u, sy, q.w - 16 * u, 1);
      this.T('rcV' + i, 'EFECTIVO CONTRA', q.x + q.w / 2, sy + 6 * u, { size: 9 * u, bold: true, color: '#7a8db3', origin: [0.5, 0], depth: D + 1, stroke: 2 });
      // only the faces of the ENEMY champions in this match
      const fz = Math.min(38 * u, (q.w - 16 * u - (r.vs.length - 1) * 5 * u) / Math.max(1, r.vs.length)), fw = r.vs.length * fz + (r.vs.length - 1) * 5 * u, fy = sy + 24 * u;
      r.vs.forEach((k, j) => {
        const fx = q.x + (q.w - fw) / 2 + j * (fz + 5 * u);
        g.fillStyle(0x000000, 1).fillRect(fx - 2, fy - 2, fz + 4, fz + 4).lineStyle(2, 0xff5a5a, 1).strokeRect(fx - 2, fy - 2, fz + 4, fz + 4);
        if (this.textures.exists('face_' + k)) this.iconImg('rcF' + i + '_' + j, 'face_' + k, fx + fz / 2, fy + fz / 2, fz, D + 0.5);
      });
      this.shopBtns.push({ ...q, tip: r.id, fn: () => { this.shopSel = r.id; this.shopSlot = null; } });
    });
""" + s[b:]
s = rep(s, "const py = cy + ch + 20 * u,", "const py = cy + ch + 16 * u,")
p.write_text(s, encoding='utf8'); print('patched')
