def sub(s, a, b, cnt=1):
    assert a in s, a[:90]
    return s.replace(a, b, cnt)

p = 'src/hud.js'; s = open(p, encoding='utf-8').read()
s = sub(s, "import { CLASSES, ABILITY_KEYS,", "import { CLASSES, CHAMPIONS, ABILITY_KEYS,")
s = sub(s, "    this.shopOpen = false; this.shopStat = sv.stat || null;", "    this.branchSel = null;   // ability slot whose two-version choice window is open\n    this.shopOpen = false; this.shopStat = sv.stat || null;")
s = sub(s, "if (up >= 0) A.player.spend(ABILITY_KEYS[up]);", "if (up >= 0) A.askSpend(ABILITY_KEYS[up]);")
block = """    // ---- branch choice window: learning a slot that has two versions (Leandro) ----
    if (this.branchSel && p.def.alt?.[this.branchSel] && !p.ranks[this.branchSel] && p.canSpend(this.branchSel)) {
      const k = this.branchSel, opts = [CHAMPIONS[p.key].abilities[k], p.def.alt[k]], KEY = { p1: 'Q', p2: 'F', p3: 'E', ult: 'R' }[k];
      const bw = Math.min(W - 24, 940 * u), bh = Math.min(H - 24, 500 * u), bx = W / 2 - bw / 2, by = H / 2 - bh / 2, gap = 18 * u;
      this.boxes.push({ x: 0, y: 0, w: W, h: H });
      ov.fillStyle(0x020812, 0.74).fillRect(0, 0, W, H);
      ov.lineStyle(2, 0x3fd0ff, 0.22).strokeRoundedRect(bx - 3 * u, by - 3 * u, bw + 6 * u, bh + 6 * u, 14 * u);
      ov.fillStyle(0x0a1a30, 0.97).fillRoundedRect(bx, by, bw, bh, 12 * u).lineStyle(2, 0x3fd0ff, 0.65).strokeRoundedRect(bx, by, bw, bh, 12 * u);
      ov.lineStyle(1, 0x8ae2ff, 0.35).lineBetween(bx + 14 * u, by + 2.5 * u, bx + bw - 14 * u, by + 2.5 * u);
      this.T('brT', `ELIGE EL PODER DE LA ${KEY}`, W / 2, by + 30 * u, { size: 26 * u, bold: true, color: '#eaf7ff', origin: [0.5, 0.5], stroke: 5, depth: 22 });
      this.T('brS', 'La elección es para toda la partida; después lo mejoras con normalidad.', W / 2, by + 58 * u, { size: 12 * u, color: '#9fc4e8', origin: [0.5, 0.5], stroke: 2, depth: 22 });
      const cw = (bw - 3 * gap) / 2, cy0 = by + 82 * u, ch = bh - 82 * u - 66 * u, ptr = this.input.activePointer;
      opts.forEach((a, i) => {
        const cx = bx + gap + i * (cw + gap), over = ptr.x >= cx && ptr.x <= cx + cw && ptr.y >= cy0 && ptr.y <= cy0 + ch, pick = () => { A.audio.play('ui_upgrade', { gap: 0 }); this.branchSel = null; A.player.spend(k, i); };
        ov.fillStyle(over ? 0x13365a : 0x0c2240, 0.98).fillRoundedRect(cx, cy0, cw, ch, 10 * u).lineStyle(2, over ? 0x8ae2ff : 0x3fd0ff, over ? 1 : 0.55).strokeRoundedRect(cx, cy0, cw, ch, 10 * u);
        this.T('brTag' + i, i ? 'OPCIÓN B' : 'OPCIÓN A', cx + 16 * u, cy0 + 12 * u, { size: 11 * u, bold: true, color: i ? '#ffd23f' : '#7dff9a', stroke: 3, depth: 22 });
        const ic = this.iconImg('brI' + i, 'icon_' + a.icon, cx + 62 * u, cy0 + 86 * u, 84 * u, 23);
        ov.lineStyle(2, 0x3fd0ff, 0.8).strokeRoundedRect(cx + 62 * u - 44 * u, cy0 + 86 * u - 44 * u, 88 * u, 88 * u, 8 * u);
        this.T('brN' + i, a.name, cx + 118 * u, cy0 + 70 * u, { size: 20 * u, bold: true, color: '#fff', origin: [0, 0.5], stroke: 4, depth: 22 }).setWordWrapWidth(cw - 118 * u - 130 * u, true);
        this.T('brK' + i, `ENFRIAMIENTO ${a.cd[0]} s  ·  MANÁ ${a.mana[0]}`, cx + 118 * u, cy0 + 100 * u, { size: 11 * u, color: '#9fe8ff', origin: [0, 0.5], stroke: 3, depth: 22 });
        if (a.preview && this.textures.exists(a.preview)) {   // the object / sprite the ability throws or summons
          ov.fillStyle(0x070a12, 1).fillRoundedRect(cx + cw - 118 * u, cy0 + 22 * u, 104 * u, 104 * u, 8 * u).lineStyle(1, 0x3fd0ff, 0.5).strokeRoundedRect(cx + cw - 118 * u, cy0 + 22 * u, 104 * u, 104 * u, 8 * u);
          this.iconImg('brP' + i, a.preview, cx + cw - 66 * u, cy0 + 74 * u, 96 * u, 23);
          this.T('brPL' + i, 'EFECTO', cx + cw - 66 * u, cy0 + 136 * u, { size: 9 * u, bold: true, color: '#9fc4e8', origin: [0.5, 0.5], stroke: 2, depth: 22 });
        }
        this.T('brD' + i, a.desc, cx + 16 * u, cy0 + 158 * u, { size: 13 * u, color: '#cfe3ff', stroke: 2, depth: 22 }).setWordWrapWidth(cw - 32 * u, true).setLineSpacing(3 * u);
        btn('brC' + i, 'ELEGIR', cx + 16 * u, cy0 + ch - 54 * u, cw - 32 * u, 40 * u, pick);
        this.btns.push({ x: cx, y: cy0, w: cw, h: ch, fn: pick });
      });
      btn('brX', 'CANCELAR (Esc)', W / 2 - 90 * u, by + bh - 54 * u, 180 * u, 38 * u, () => { this.branchSel = null; }, 0x5c1d1d);
    } else this.branchSel = null;

    A.uiRects = this.boxes;
"""
s = sub(s, "    A.uiRects = this.boxes;\n", block)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
