import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

def rep(s, old, new, count=1):
    assert old in s, old[:110]
    return s.replace(old, new, count)

p = ROOT / 'src/hud.js'; s = p.read_text(encoding='utf8')

# 1) tiles you cannot afford are darkened (icon tinted), not just faded
s = rep(s, "    if (this.textures.exists(tex)) this.iconImg(key, tex, q.x + q.w / 2, q.y + q.h / 2, sz, depth + 0.2).setAlpha(alpha);",
        "    if (this.textures.exists(tex)) { const im = this.iconImg(key, tex, q.x + q.w / 2, q.y + q.h / 2, sz, depth + 0.2).setAlpha(alpha < 1 ? 0.85 : 1); alpha < 1 ? im.setTint(0x4c5260) : im.clearTint(); }   // can't buy it: dark icon\n    if (alpha < 1) g.fillStyle(0x000000, 0.35).fillRect(q.x, q.y, q.w, q.h);")

# 2) crafting tree: unaffordable nodes are dark; the 'used to craft' section lists EVERYTHING the item leads to (green -> purple), wrapping into rows
s = rep(s, "    const ups = ITEMS.filter(i => i.recipe && i.recipe.includes(it.id));   // what this item can become one level up",
"""    const ups = (() => {   // everything this item can become, at any level (a green item -> the purple ones that use it), purple first
      const out = [], seen = new Set(), walk = id => { for (const i of ITEMS) if (i.recipe && i.recipe.includes(id) && !seen.has(i.id)) { seen.add(i.id); out.push(i); walk(i.id); } };
      walk(it.id); return out.sort((a, b) => b.lvl - a.lvl || a.cost - b.cost);
    })();
    const upS = Math.min(34 * u, 40 * u), upCols = Math.max(1, Math.floor((dw - 8 * u) / (upS + 5 * u))), upRows = Math.ceil(ups.length / upCols);""")
s = rep(s, "      const upH = ups.length ? 74 * u : 0,", "      const upH = ups.length ? 38 * u + upRows * (upS + 5 * u) + 6 * u : 0,")
s = rep(s, "        this.tile(g, 'tr' + k, node.id, q, D, depth <= 1 || node.owned ? 1 : 0.8);",
        "        const npl = buyPlan(p.inv, node.id), aff = node.owned || dn || (npl.ok && p.gold >= npl.gold);   // dark when you cannot get it yet\n        this.tile(g, 'tr' + k, node.id, q, D, aff ? 1 : 0.45);")
s = rep(s, "{ size: 10 * u, color: depth <= 1 ? '#ffe9a0' : '#cfe0ff', depth: D + 1, stroke: 2, origin: [0.5, 0] });", "{ size: 10 * u, color: !aff ? '#6d7890' : depth <= 1 ? '#ffe9a0' : '#cfe0ff', depth: D + 1, stroke: 2, origin: [0.5, 0] });")
s = rep(s, "{ size: 10 * u, bold: true, color: node.owned ? '#ffd23f' : '#ffffff', depth: D + 1, stroke: 2, origin: [0.5, 0] });", "{ size: 10 * u, bold: true, color: node.owned ? '#ffd23f' : aff ? '#ffffff' : '#ff6a6a', depth: D + 1, stroke: 2, origin: [0.5, 0] });")
a = s.index("        head('upH', 'SE USA PARA CREAR'"); b = s.index("      }\n    }\n    const by = y0 + ph - pad * 1.3 - 46 * u")
s = s[:a] + """        head('upH', `SE USA PARA CREAR · ${ups.length} objeto${ups.length > 1 ? 's' : ''}`, tx + 4 * u, uy + 5 * u);
        ups.forEach((ui, i) => {
          const q = { x: tx + 8 * u + (i % upCols) * (upS + 5 * u), y: uy + 28 * u + Math.floor(i / upCols) * (upS + 5 * u), w: upS, h: upS }, upl = buyPlan(p.inv, ui.id), aff = upl.ok && p.gold >= upl.gold || p.slotOf(ui.id) >= 0;
          this.tile(g, 'up' + i, ui.id, q, D, aff ? 1 : 0.45); if (aff) glow(q, 2); else g.lineStyle(2, LV_COL[ui.lvl], 0.6).strokeRect(q.x - 2, q.y - 2, q.w + 4, q.h + 4);
          if (this.shopSel === ui.id) g.lineStyle(3, 0xffffff, 1).strokeRect(q.x - 3, q.y - 3, q.w + 6, q.h + 6);
          this.shopBtns.push({ ...q, tip: ui.id, fn: () => { this.shopSel = ui.id; this.shopSlot = null; } });
        });
""" + s[b:]
p.write_text(s, encoding='utf8'); print('patched')
