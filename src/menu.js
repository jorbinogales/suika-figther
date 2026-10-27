import Phaser from 'phaser';
import { CHAMPIONS, CLASSES, CLASS_TABS, classLabel, rk } from './data.js';
import { Audio } from './audio.js';

const LIST = ['leandro', 'xeviche', 'jorbi', 'axel', 'julio', 'luis', 'eliud', 'hector'];   // Héctor still missing
const SIDES = [
  { team: 0, name: 'AZUL', sub: 'Militares', col: 0x3b82f6, hex: '#8ab4ff' },
  { team: 1, name: 'ROJO', sub: 'Robots', col: 0xef4444, hex: '#ff8a8a' },
];

// Main menu: pick your champion, your side and the enemy champion, then play.
export class Menu extends Phaser.Scene {
  constructor() { super('menu'); }

  create() {
    this.audio = new Audio(this); this.audio.music('music_menu');
    this.events.once('shutdown', () => this.audio.stopMusic());
    this.sel = this.sel || { mode: 1, me: 'leandro', team: 0, allies: [], enemies: [] };
    this.build();
    const rb = () => this.scene.isActive('menu') && this.build();
    this.scale.on('resize', rb);
    this.events.once('shutdown', () => this.scale.off('resize', rb));
  }

  txt(x, y, s, size, color = '#fff', o = {}) {
    return this.add.text(x, y, s, { fontFamily: 'monospace', fontSize: `${Math.round(size)}px`, color, fontStyle: o.bold ? 'bold' : 'normal', stroke: '#000', strokeThickness: o.stroke ?? 3, wordWrap: o.wrap ? { width: o.wrap } : undefined, lineSpacing: o.ls || 0 })
      .setOrigin(...(o.origin || [0, 0]));
  }

  // keeps the team slots the right size for the chosen mode (1v1 / 3v3 / 5v5), filling new slots with random champions
  fill(reroll = false) {
    const m = this.sel.mode, pool = () => LIST[Math.random() * LIST.length | 0];
    const make = (arr, n, avoid) => { const out = reroll ? [] : arr.slice(0, n); while (out.length < n) { const free = LIST.filter(c => !avoid.includes(c) && !out.includes(c)); out.push(free.length ? free[Math.random() * free.length | 0] : pool()); } return out; };
    this.sel.allies = make(this.sel.allies, m - 1, [this.sel.me]);
    this.sel.enemies = make(this.sel.enemies, m, [this.sel.me, ...this.sel.allies]);
  }

  build() {
    this.children.removeAll(true);
    const W = this.scale.width, H = this.scale.height, s = Phaser.Math.Clamp(Math.min(W / 1280, H / 720), 0.6, 1.6), k = n => n * s;
    this.fill();
    const g = this.add.graphics();
    g.fillGradientStyle(0x0b1630, 0x0b1630, 0x16294f, 0x16294f, 1).fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) g.fillStyle(0x3fd0ff, 0.05).fillRect((i * 97) % W, (i * 53) % H, k(60), 2);
    this.add.rectangle(k(12), k(12), k(130), k(28), 0x0f2038).setOrigin(0, 0).setStrokeStyle(2, 0x3fd0ff).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('launcher'));
    this.txt(k(77), k(26), '◀ LAUNCHER', k(12), '#7ee0ff', { bold: true, origin: [0.5, 0.5], stroke: 2 });
    this.txt(W / 2, k(10), 'SUIKA FIGTHER', k(38), '#ffe066', { bold: true, origin: [0.5, 0], stroke: 6 });

    const cardW = k(84), cardH = k(104), gap = k(10), rowW = LIST.length * cardW + (LIST.length - 1) * gap;
    const wide = W > k(1180), rx = wide ? k(40) : (W - rowW) / 2;
    const hit = (x, y, w, h, fn) => this.add.rectangle(x, y, w, h, 0xffffff, 0.001).setOrigin(0, 0).setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.audio.play('ui_select', { gap: 0 }); fn(); });
    const card = (x, y, id, on, col) => {
      const d = CHAMPIONS[id];
      g.fillStyle(0x0a0f1e, 1).fillRect(x, y, cardW, cardH);
      const im = this.add.image(0, 0, d.ref).setOrigin(0, 0).setCrop(360, 10, 400, 420).setScale(cardW / 400);
      im.setPosition(x - 360 * cardW / 400, y - 10 * cardW / 400);
      g.lineStyle(on ? 5 : 2, on ? col : 0x2b3a5c, 1).strokeRect(x, y, cardW, cardH);
      this.txt(x + cardW / 2, y + cardH - k(22), d.name, k(12), '#fff', { bold: true, origin: [0.5, 0] });
      this.txt(x + cardW / 2, y + cardH - k(8), CLASSES[d.cls]?.label || '', k(8), '#8aa0c8', { origin: [0.5, 0.5], stroke: 2 });
    };
    let y = k(58);
    // 1 · mode
    this.txt(rx, y, '1 · MODO DE JUEGO', k(14), '#cfe3ff', { bold: true }); y += k(20);
    [[1, '1 vs 1'], [3, '3 vs 3'], [5, '5 vs 5']].forEach(([m, label], i) => {
      const on = this.sel.mode === m, bw = k(150), bh = k(36), x = rx + i * (bw + k(10));
      g.fillStyle(on ? 0x2e6aa8 : 0x101a30, 1).fillRect(x, y, bw, bh).lineStyle(on ? 4 : 2, 0x3fd0ff, 1).strokeRect(x, y, bw, bh);
      this.txt(x + bw / 2, y + bh / 2, label, k(17), '#fff', { bold: true, origin: [0.5, 0.5] });
      hit(x, y, bw, bh, () => { this.sel.mode = m; this.build(); });
    });
    const rbw = k(190), rx2 = rx + 3 * (k(150) + k(10));
    g.fillStyle(0x4a3a8f, 1).fillRect(rx2, y, rbw, k(36)).lineStyle(2, 0xb59cff, 1).strokeRect(rx2, y, rbw, k(36));
    this.txt(rx2 + rbw / 2, y + k(18), 'EQUIPOS AL AZAR', k(13), '#fff', { bold: true, origin: [0.5, 0.5] });
    hit(rx2, y, rbw, k(36), () => { this.fill(true); this.build(); });
    y += k(52);
    // 2 · my champion
    this.txt(rx, y, '2 · TU CAMPEÓN', k(14), '#cfe3ff', { bold: true }); y += k(20);
    {   // class filter tabs
      const cls = this.sel.cls || 'todos', tw = k(118), th = k(30);
      CLASS_TABS.forEach((c, i) => {
        const x = rx + i * (tw + k(6)), on = cls === c, tex = 'class_' + c;
        g.fillStyle(on ? 0x2e6aa8 : 0x101a30, 1).fillRect(x, y, tw, th).lineStyle(on ? 3 : 1, on ? 0x7ee0ff : 0x3fd0ff, on ? 1 : 0.5).strokeRect(x, y, tw, th);
        let lx = x + k(8);
        if (this.textures.exists(tex)) { this.add.image(x + k(17), y + th / 2, tex).setDisplaySize(k(24), k(24)); lx = x + k(33); }
        this.txt(lx, y + th / 2, classLabel(c), k(11), on ? '#fff' : '#9fb4d8', { bold: true, origin: [0, 0.5], stroke: 2 });
        hit(x, y, tw, th, () => { this.sel.cls = c; this.build(); });
      });
      y += th + k(8);
    }
    const shown = LIST.filter(id => (this.sel.cls || 'todos') === 'todos' || CHAMPIONS[id].cls === this.sel.cls);
    shown.forEach((id, i) => { const x = rx + i * (cardW + gap); card(x, y, id, this.sel.me === id, 0x3ddc84); hit(x, y, cardW, cardH, () => { this.sel.me = id; this.build(); }); });
    y += cardH + k(14);
    // 3 · side
    this.txt(rx, y, '3 · TU BANDO', k(14), '#cfe3ff', { bold: true }); y += k(20);
    SIDES.forEach((sd, i) => {
      const on = this.sel.team === sd.team, bw = k(200), bh = k(36), x = rx + i * (bw + k(14));
      g.fillStyle(on ? sd.col : 0x101a30, on ? 0.85 : 1).fillRect(x, y, bw, bh).lineStyle(on ? 4 : 2, sd.col, 1).strokeRect(x, y, bw, bh);
      this.txt(x + bw / 2, y + bh / 2, `${sd.name} · ${sd.sub}`, k(15), '#fff', { bold: true, origin: [0.5, 0.5] });
      hit(x, y, bw, bh, () => { this.sel.team = sd.team; this.build(); });
    });
    y += k(52);
    // 4 · allies / 5 · enemies (click a slot to change its champion)
    const slots = (label, arr, col) => {
      this.txt(rx, y, label, k(14), '#cfe3ff', { bold: true }); y += k(20);
      if (!arr.length) { this.txt(rx, y + k(30), '— sin aliados en 1 vs 1 —', k(12), '#6a7ca0'); y += cardH + k(14); return; }
      arr.forEach((id, i) => { const x = rx + i * (cardW + gap); card(x, y, id, true, col); hit(x, y, cardW, cardH, () => { arr[i] = LIST[(LIST.indexOf(id) + 1) % LIST.length]; this.build(); }); });
      y += cardH + k(14);
    };
    slots(`4 · TUS ALIADOS (${this.sel.allies.length}) — clic para cambiar`, this.sel.allies, 0x3b82f6);
    slots(`5 · EQUIPO ENEMIGO (${this.sel.enemies.length}) — clic para cambiar`, this.sel.enemies, 0xff5a5a);

    // play
    const pw = k(280), ph = k(52), py = Math.min(H - ph - k(14), y), px = rx;
    g.fillStyle(0x1f8f4a, 1).fillRect(px, py, pw, ph).lineStyle(3, 0x7dff9a, 1).strokeRect(px, py, pw, ph);
    this.txt(px + pw / 2, py + ph / 2, '▶ JUGAR', k(24), '#fff', { bold: true, origin: [0.5, 0.5], stroke: 5 });
    hit(px, py, pw, ph, () => this.play());
    const tx = px + pw + k(16), tw = k(330);
    g.fillStyle(0x1d4a8f, 1).fillRect(tx, py, tw, ph).lineStyle(3, 0x7ee0ff, 1).strokeRect(tx, py, tw, ph);
    this.txt(tx + tw / 2, py + ph / 2, 'ZONA DE ENTRENAMIENTO', k(16), '#fff', { bold: true, origin: [0.5, 0.5], stroke: 4 });
    hit(tx, py, tw, ph, () => this.play(true));

    // info panel of the selected champion
    const d = CHAMPIONS[this.sel.me], ix = wide ? rx + rowW + k(40) : null;
    if (ix !== null) {
      const iw = W - ix - k(40), iy = k(58), ih = Math.min(H - iy - k(30), k(600));
      g.fillStyle(0x070b14, 0.92).fillRect(ix, iy, iw, ih).lineStyle(2, 0x3fd0ff, 0.9).strokeRect(ix, iy, iw, ih);
      this.txt(ix + k(18), iy + k(10), d.name.toUpperCase(), k(26), '#ffe066', { bold: true });
      this.txt(ix + k(18), iy + k(44), `${CLASSES[d.cls]?.label || ''} — ${CLASSES[d.cls]?.desc || ''}`, k(11), '#8aa0c8', { wrap: iw - k(36) });
      const st = d.stats, line = `Vida ${st.hp}  ·  ${d.rage ? 'Ira' : 'Maná ' + st.mana}  ·  Ataque ${st.atk}  ·  Poder IA ${st.ap}\nArmadura ${st.armor}  ·  Res. a la IA ${st.mr}  ·  Velocidad ${st.speed}  ·  Alcance ${st.range}`;
      this.txt(ix + k(18), iy + k(82), line, k(11), '#cfe3ff', { ls: 4, wrap: iw - k(36) });
      // abilities: only the icons (bottom of the box); the description shows while hovering an icon
      const isz = k(64), iyy = iy + ih - isz - k(18);
      this.txt(ix + k(18), iyy - k(20), 'HABILIDADES (pasa el ratón por un icono)', k(10), '#7ee0ff', { bold: true, stroke: 2 });
      ['p1', 'p2', 'p3', 'ult'].forEach((a, i) => {
        const ab = d.abilities[a], x = ix + k(18) + i * (isz + k(14)), tex = 'icon_' + ab.icon;
        g.fillStyle(0x0a1020, 1).fillRect(x, iyy, isz, isz).lineStyle(2, 0x3fd0ff, 0.6).strokeRect(x, iyy, isz, isz);
        if (this.textures.exists(tex)) this.add.image(x + isz / 2, iyy + isz / 2, tex).setDisplaySize(isz - 4, isz - 4);
        this.txt(x + isz - k(3), iyy + isz - k(2), 'QFER'[i], k(12), '#fff', { bold: true, origin: [1, 1] });
        const z = this.add.rectangle(x, iyy, isz, isz, 0xffffff, 0.001).setOrigin(0, 0).setInteractive({ useHandCursor: true });
        z.on('pointerover', () => this.showTip(x + isz / 2, iyy, `[${'QFER'[i]}] ${ab.name}${ab.passive ? ' (pasiva)' : ''}`, ab.desc, k));
        z.on('pointerout', () => this.hideTip());
      });
    }
    this.txt(W / 2, H - k(8), 'Controles: WASD mover · Shift correr · clic/J atacar · Q F E R poderes · Ctrl+tecla sube poder · Esc menú', k(11), '#6a7ca0', { origin: [0.5, 1], stroke: 2 });
  }

  showTip(cx, bottom, title, body, k) {
    this.hideTip(); const W = this.scale.width, w = k(320);
    const t1 = this.txt(0, 0, title, k(13), '#ffe066', { bold: true, stroke: 2, wrap: w - k(20) }), t2 = this.txt(0, 0, body, k(11), '#cfe3ff', { stroke: 2, wrap: w - k(20) });
    const h = k(14) + t1.height + k(6) + t2.height, x = Phaser.Math.Clamp(cx - w / 2, k(8), W - w - k(8)), y = Math.max(k(8), bottom - h - k(10));
    const bg = this.add.graphics().fillStyle(0x040a16, 0.97).fillRect(x, y, w, h).lineStyle(2, 0x3fd0ff, 1).strokeRect(x, y, w, h);
    t1.setPosition(x + k(10), y + k(7)); t2.setPosition(x + k(10), y + k(13) + t1.height); [bg, t1, t2].forEach(o => o.setDepth(50)); this.tip = [bg, t1, t2];
  }
  hideTip() { this.tip?.forEach(o => o.destroy()); this.tip = null; }

  play(training = false) {
    this.audio.play('ui_confirm', { gap: 0 });
    this.scene.start('arena', { training, mode: training ? 1 : this.sel.mode, player: this.sel.me, enemies: this.sel.enemies.slice(0, training ? 1 : 99), allies: training ? [] : this.sel.allies, team: this.sel.team, haveSprites: this.registry.get('sprites') });
  }
}
