import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def rep(s, old, new, count=1):
    assert old in s, old[:110]
    return s.replace(old, new, count)

# ---------- recommend.js: follow-ups for level-3 items (no parent): next preset item + a complementary defensive/utility pick
p = ROOT / 'src/recommend.js'; s = p.read_text(encoding='utf8')
s = rep(s, "      add('next', ps, { of: X.id });\n    }\n  }", """      add('next', ps, { of: X.id });
    } else {   // a finished item has no parent: the next item of the build + something that complements it (a defence or utility item of another kind)
      const nx = preset.map(id => get(id)).filter(Boolean).filter(s => !picked.has(s.it.id)).sort((a, b) => b.score - a.score)[0];
      add('next', nx, { of: X.id });
      add('complement', scored.find(s => s.it.cat !== X.cat && ['arm', 'mr', 'hp', 'util'].includes(s.it.cat) && !picked.has(s.it.id) && s.it.lvl >= 2), { of: X.id });
    }
  }""")
p.write_text(s, encoding='utf8')

# ---------- hud.js
p = ROOT / 'src/hud.js'; s = p.read_text(encoding='utf8')
s = rep(s, "import { ITEMS, ITEM_BY_ID,", "import { recommend, presetOf } from './recommend.js';\nimport { ITEMS, ITEM_BY_ID,")
s = rep(s, "this.shopCat = sv.cat || 'all';", "this.shopCat = sv.cat === 'all' ? 'all' : 'rec';")
s = rep(s, "    const fcw = 50 * u, gw =", "    const recTab = this.shopCat === 'rec', fcw = recTab ? 0 : 50 * u, gw =")
s = rep(s, "SH = { all: 'TODOS', basic: 'BÁSICOS', ad: 'ATAQUE', ap: 'PODER IA', arm: 'ARMADURA', mr: 'RESIST. IA', hp: 'VIDA', util: 'UTILIDAD', rec: 'RECUP.', perm: 'MEJORAS' };", "SH = { rec: 'RECOMENDADO', all: 'TODOS' };")
s = rep(s, "c === 'all' ? '#fff' : c === 'basic' ? '#dfe8ff' : c === 'perm' ? '#ff8a8a' : CAT_COL[c]));", "c === 'rec' ? '#ffd23f' : '#fff'));")
s = rep(s, "    {   // filter by advantage: vertical column on the left;", "    if (!recTab) {   // filter by advantage: vertical column on the left;")
s = rep(s, "const list = ITEMS.filter(i => this.shopCat !== 'perm' &&", "const list = recTab ? [] : ITEMS.filter(i => this.shopCat !== 'perm' &&")
s = rep(s, "const pl2 = (this.shopCat === 'all' || this.shopCat === 'perm') ?", "const pl2 = (!recTab && (this.shopCat === 'all' || this.shopCat === 'perm')) ?")
s = rep(s, "    if (!rows.length) this.T('shNone'", "    if (!rows.length && !recTab) this.T('shNone'")
s = rep(s, "    // inventory strip\n", "    if (recTab) this.recPanel(g, p, A, u, gx, gy, gw, gh, D, bev, head, over);\n\n    // inventory strip\n")
s = rep(s, "    if (fl || this.fltHover) {", "    if (!recTab && (fl || this.fltHover)) {")
s = rep(s, "() => p.buyItem(it.id), 0x14583a);", "() => { const rec = this.recIds?.includes(it.id); if (p.buyItem(it.id) !== false) p.recChain = rec ? { from: it.id } : null; }, 0x14583a);   // buying a recommended item unlocks its complement + next item")
s = rep(s, "  drawShop(A, p, u, W, H) {", """  // ---- shop tab RECOMENDADO: 3 picks for your champion vs the enemy team (each says who it is effective against) + the champion's 6-item preset build ----
  recPanel(g, p, A, u, gx, gy, gw, gh, D, bev, head, over) {
    const enemies = A.champs.filter(c => c.baseTeam !== p.baseTeam), R = recommend(p, enemies, p.inv, p.gold, p.recChain);
    this.recIds = R.recs.map(r => r.id);
    const th = R.threat, nA = th.list.filter(e => e.apShare >= 0.5).length, nP = th.list.length - nA;
    head('rcH', 'RECOMENDADOS PARA TI', gx, gy);
    this.T('rcS', th.n ? `Rivales: ${nA} de poder de IA · ${nP} físicos` : 'Sin rivales todavía', gx + gw, gy + 1 * u, { size: 11 * u, color: '#9fe8ff', origin: [1, 0], depth: D + 1, stroke: 2 });
    const TAG = { counter: ['CONTRA RIVALES', 0x7ee0ff], build: ['TU BUILD', 0xffd23f], next: ['SIGUIENTE', 0x5dff8a], complement: ['COMPLEMENTO', 0xc77dff], flex: ['RECOMENDADO', 0xaab8d0] };
    const gap = 10 * u, cw = (gw - gap * 2) / 3, ch = 178 * u, cy = gy + 26 * u;
    R.recs.forEach((r, i) => {
      const it = ITEM_BY_ID[r.id], q = { x: gx + i * (cw + gap), y: cy, w: cw, h: ch }, tg = TAG[r.tag] || TAG.flex, pl = buyPlan(p.inv, r.id), afford = pl.ok && p.gold >= pl.gold, sel = this.shopSel === r.id;
      bev(q.x, q.y, q.w, q.h, 8 * u, 0x0d1830, 1, tg[1], sel ? 1 : 0.65, sel ? 3 : 1.5);
      g.fillStyle(tg[1], 0.92).fillRect(q.x + 3 * u, q.y + 3 * u, q.w - 6 * u, 17 * u);
      this.T('rcT' + i, r.of && ITEM_BY_ID[r.of] ? `${tg[0]} · ${ITEM_BY_ID[r.of].name}` : tg[0], q.x + q.w / 2, q.y + 5 * u, { size: 9.5 * u, bold: true, color: '#04101c', origin: [0.5, 0], depth: D + 1, stroke: 0 }).setWordWrapWidth(q.w - 8 * u, true);
      const ts = 56 * u, tq = { x: q.x + 8 * u, y: q.y + 28 * u, w: ts, h: ts };
      this.tile(g, 'rc' + i, r.id, tq, D, afford ? 1 : 0.55);
      this.T('rcN' + i, it.name.toUpperCase(), tq.x + ts + 8 * u, tq.y - 1 * u, { size: 12 * u, bold: true, color: '#ffffff', depth: D + 1, stroke: 2 }).setWordWrapWidth(q.w - ts - 24 * u, true);
      this.T('rcP' + i, pl.gold === 0 && !pl.ok ? pl.reason : `${pl.gold} oro`, tq.x + ts + 8 * u, tq.y + ts - 14 * u, { size: 12 * u, bold: true, color: afford ? '#ffd23f' : '#ff6a6a', depth: D + 1, stroke: 2 });
      g.fillStyle(tg[1], 0.25).fillRect(q.x + 8 * u, q.y + 28 * u + ts + 8 * u, q.w - 16 * u, 1);
      const vy = q.y + 28 * u + ts + 14 * u;
      this.T('rcV' + i, 'EFECTIVO CONTRA', q.x + 8 * u, vy, { size: 9 * u, bold: true, color: '#7a8db3', depth: D + 1, stroke: 2 });
      this.T('rcW' + i, r.vs.length ? r.vs.join(', ') : 'Cualquier rival', q.x + 8 * u, vy + 13 * u, { size: 12 * u, bold: true, color: '#ffffff', depth: D + 1, stroke: 2 }).setWordWrapWidth(q.w - 16 * u, true);
      this.T('rcR' + i, r.reason ? `(${r.reason})` : '', q.x + 8 * u, vy + 41 * u, { size: 10 * u, color: '#9fe8ff', depth: D + 1, stroke: 2 }).setWordWrapWidth(q.w - 16 * u, true);
      this.shopBtns.push({ ...q, tip: r.id, fn: () => { this.shopSel = r.id; this.shopSlot = null; } });
    });
    // the champion's preset build: 6 items in purchase order; the next one to get is outlined in gold
    const py = cy + ch + 20 * u, ids = presetOf(p.key), nextI = ids.findIndex(id => p.slotOf(id) < 0), sz = Math.min(60 * u, (gw - 5 * 8 * u) / 6), sg = (gw - sz * 6) / 5;
    head('rcB', `BUILD DE ${p.def.name.toUpperCase()} · 6 OBJETOS`, gx, py);
    this.T('rcBs', 'orden de compra 1 → 6', gx + gw, py + 1 * u, { size: 11 * u, color: '#9fe8ff', origin: [1, 0], depth: D + 1, stroke: 2 });
    ids.forEach((id, i) => {
      const q = { x: gx + i * (sz + sg), y: py + 24 * u, w: sz, h: sz }, si = p.slotOf(id), pl = buyPlan(p.inv, id), afford = pl.ok && p.gold >= pl.gold;
      this.tile(g, 'rb' + i, id, q, D, afford || si >= 0 ? 1 : 0.55);
      if (this.shopSel === id) g.lineStyle(3, 0xffffff, 1).strokeRect(q.x - 2, q.y - 2, q.w + 4, q.h + 4); else if (i === nextI) g.lineStyle(3, 0xffd23f, 1).strokeRect(q.x - 2, q.y - 2, q.w + 4, q.h + 4);
      this.T('rbI' + i, `${i + 1}`, q.x + 4 * u, q.y + 2 * u, { size: 11 * u, bold: true, color: '#ffe27a', depth: D + 1, stroke: 3 });
      this.T('rbP' + i, si >= 0 ? 'TIENES' : `${pl.gold}`, q.x + q.w / 2, q.y + q.h + 2 * u, { size: 11 * u, bold: true, origin: [0.5, 0], color: si >= 0 ? '#7dff9a' : afford ? '#ffd23f' : '#ff6a6a', stroke: 2, depth: D + 1 });
      this.shopBtns.push({ x: q.x, y: q.y, w: q.w, h: q.h + 16 * u, tip: id, fn: () => { this.shopSel = id; this.shopSlot = null; } });
    });
  }

  drawShop(A, p, u, W, H) {""")
p.write_text(s, encoding='utf8'); print('patched')
