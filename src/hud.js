import Phaser from 'phaser';
import { CLASSES, ABILITY_KEYS, MAX_LEVEL, MAX_RANK, ULT_LEVELS, rk } from './data.js';
import { WORLD_W, WORLD_H, CAMPS } from './fighter.js';
import { walk, GW, GH, CELL } from './mapdata.js';
import { levelGauge } from './world.js';
import { vol, saveVol } from './audio.js';
import { net } from './net.js';
import { STAT_STYLE, statCss, scaleRows, rowStat, pct } from './stats.js';
import { ITEMS, ITEM_BY_ID, CATS, CAT_COL, STAT_LABEL, fmtStat, sellValue, buyPlan, recipeTree, PERMS, PERM_BY_ID, PERM_COST } from './items.js';

// HUD = separate floating modules built on Codex art (art/raw/ui -> tools/process_ui.py -> public/assets/ui).
// Each element is placed in its hole. Layout (empty space between modules on purpose):
//   bottom-left : hero (portrait, name, "?" button -> stats popup)   bottom-center: abilities + big HP / mana
//   bottom-right: minimap                                            middle-left  : 6 item slots
//   top-right   : info panel of the clicked champion (name, portrait, stats, items)
// Without the art it falls back to the default hole positions over a plain dark panel.
const MODS = {
  hud_hero:    { w: 260, h: 230, holes: { portrait: [20, 36, 128, 128], name: [20, 172, 128, 24], help: [164, 36, 36, 36] } },
  hud_center:  { w: 520, h: 190, holes: { ability0: [64, 16, 76, 76], ability1: [162, 16, 76, 76], ability2: [260, 16, 76, 76], ability3: [358, 16, 76, 76], hp: [40, 112, 440, 28], mana: [40, 146, 440, 18] } },
  hud_minimap: { w: 370, h: 230, holes: { minimap: [20, 24, 330, 180] } },
  hud_enemy:   { w: 504, h: 72, holes: { name: [14, 23, 170, 26], item0: [196, 17, 38, 38], item1: [238, 17, 38, 38], item2: [280, 17, 38, 38], item3: [322, 17, 38, 38], item4: [364, 17, 38, 38], item5: [406, 17, 38, 38], help: [462, 21, 30, 30] } },
  hud_banner_blue: { w: 800, h: 140, holes: { portrait: [18, 16, 108, 108], victim: [718, 38, 64, 64] } },
  hud_banner_red:  { w: 800, h: 140, holes: { portrait: [18, 16, 108, 108], victim: [718, 38, 64, 64] } },
  hud_banner_blue_l: { w: 800, h: 140, holes: { portrait: [18, 16, 108, 108] } },
  hud_banner_red_l:  { w: 800, h: 140, holes: { portrait: [18, 16, 108, 108] } },
  hud_banner_gold_l: { w: 800, h: 140, holes: { portrait: [18, 16, 108, 108] } },
  hud_banner_gold_plain: { w: 800, h: 140, holes: {} },
  hud_banner_gold: { w: 800, h: 140, holes: { portrait: [18, 16, 108, 108], victim: [718, 38, 64, 64] } },
  hud_kda:     { w: 380, h: 64, holes: { kills: [22, 16, 104, 32], deaths: [138, 16, 104, 32], assists: [254, 16, 104, 32] } },
  hud_score:   { w: 440, h: 64, holes: { blue: [24, 15, 110, 34], time: [155, 15, 130, 34], red: [306, 15, 110, 34] } },
  hud_stats:   { w: 254, h: 230, holes: { stats: [20, 20, 214, 190] } },
  hud_items:   { w: 148, h: 240, holes: { item0: [14, 28, 56, 56], item1: [78, 28, 56, 56], item2: [14, 92, 56, 56], item3: [78, 92, 56, 56], item4: [14, 156, 56, 56], item5: [78, 156, 56, 56] } },
  hud_target:  { w: 768, h: 300, holes: { name: [24, 14, 400, 28], portrait: [24, 56, 120, 120], stats: [160, 56, 300, 200],
    item0: [488, 56, 72, 72], item1: [568, 56, 72, 72], item2: [648, 56, 72, 72], item3: [488, 136, 72, 72], item4: [568, 136, 72, 72], item5: [648, 136, 72, 72] } },
};

// polygon of a clockwise sweep from 12 o'clock covering `frac` of a square (clock-style cooldown)
function sweep(cx, cy, half, frac) {
  const pts = [{ x: cx, y: cy }, { x: cx, y: cy - half }];
  const steps = Math.max(2, Math.ceil(frac * 72));
  for (let i = 1; i <= steps; i++) {
    const a = -Math.PI / 2 + (frac * 2 * Math.PI * i) / steps, c = Math.cos(a), sn = Math.sin(a), t = half / Math.max(Math.abs(c), Math.abs(sn));
    pts.push({ x: cx + c * t, y: cy + sn * t });
  }
  return pts;
}

// tooltip table: ability field -> [label, unit]. Only array fields (one value per rank) are listed.
const FIELD = { life: ['Duración de la bici', 's'], maxSpeed: ['Velocidad máxima', ''], drag: ['Distancia de arrastre', ''], wallStun: ['Stun al chocar', 's'], wallDmg: ['Daño al chocar', ''], active: ['Tiempo activo', 's'], burn: ['Quemadura', 's'], rate: ['Misiles por segundo', ''], hit: ['Radio de impacto', ''], root: ['Atrapa', 's'], wallHp: ['Vida de la barricada', ''], turretHp: ['Vida de la torreta', ''], turretDmg: ['Daño de la torreta', ''], maxTime: ['Duración máxima', 's'], count: ['Contratos', ''], areaRadius: ['Radio del área', ''], areaLife: ['Duración del área', 's'], buffTime: ['Duración de efectos', 's'], pull: ['Atracción', ''], shieldFlat: ['Escudo fijo', ''], shieldPct: ['Escudo (% vida máx.)', '%'], shieldArmor: ['Escudo (x armadura)', ''], effectTime: ['Duración de mejoras', 's'], effectPower: ['Potencia de mejoras', '%'], packages: ['Cajas', ''], interval: ['Golpes por pieza', ''], robots: ['Robots', ''], maxInvis: ['Invisibilidad máx.', 's'], control: ['Control', 's'], cd: ['Enfriamiento', 's'], mana: ['Maná', ''], dmg: ['Daño', ''], stun: ['Stun', 's'], slow: ['Ralentiza', '%'], poisonApScale: ['Veneno (xPoder IA)', ''],
  life: ['Duración', 's'], heal: ['Curación', ''], healHpPct: ['Curación extra (% vida)', '%'], maxStacks: ['Pilas máximas', ''], armorPer: ['Armadura por pila', ''],
  mrPer: ['Res. a la IA por pila', ''], silence: ['Silencio', 's'], stunAfter: ['Stun tras (s)', 's'], drops: ['Rondas de gotas', ''], amp: ['Curvatura', ''], blind: ['Ceguera', 's'], charm: ['Duración de control', 's'], hps: ['Curación por seg', ''], shield: ['Escudo', ''], speedBoost: ['Velocidad extra', '%'], time: ['Duración', 's'], critMult: ['Daño crítico (x)', ''], dashDist: ['Distancia del dash', ''], window: ['Tiempo para usar dashes', 's'], duration: ['Duración', 's'], hpMult: ['Vida (x)', ''], atkMult: ['Ataque (x)', ''], cdSpeed: ['Recarga de poderes (x)', ''], reqLvl: ['Nivel requerido', ''], radius: ['Radio', ''], melee: ['Bots cuerpo a cuerpo', ''], ranged: ['Bots a distancia', ''] };
const fmt = (k, v) => (FIELD[k][1] === '%' ? `${Math.round(v * 100)}%` : `${v}${FIELD[k][1]}`);

const LV_COL = { 1: 0x9aa0ab, 2: 0x3fbf5f, 3: 0xa45cff, perm: 0xff4a4a }, LV_HEX = { 1: '#c4c9d3', 2: '#6dff93', 3: '#c9a0ff', perm: '#ff8a8a' };

export class Hud extends Phaser.Scene {
  constructor() { super('hud'); }

  create() {
    this.g = this.add.graphics().setDepth(1);        // dark fills behind the art + bars/minimap
    this.top = this.add.graphics().setDepth(3);      // overlays above icons (cooldown sweep, highlights)
    // the scene object survives restarts but its display objects do not: forget every pooled object / texture of the previous match
    this.fogImg = null; this.glowG = null; this.hgImg = null; this.stImgs = {}; this.itImgs = {}; this.bnImgs = {}; this.blindImg = null; this.blindTex = null; this.blindWas = false; if (this.textures.exists('blindmask')) this.textures.remove('blindmask');
    this.txt = {}; this.icons = []; this.pimg = {}; this.panels = {}; this.iconRects = []; this.upRects = []; this.helpRect = null;
    this.tipG = this.add.graphics().setDepth(6);
    this.redG = this.add.graphics().setDepth(0.5);   // red screen tint while dead
    this.helpHold = null; this.enemyHelpRect = null; this.btns = []; this.ovG = this.add.graphics().setDepth(20); this.overlay = false;   // '?' buttons show stats only while held
    const L = this.cache.json.get('uilayout') || {};
    this.layout = {};
    Object.keys(MODS).forEach(n => {
      this.layout[n] = L[n] || MODS[n];
      if (this.textures.exists('ui_' + n)) this.panels[n] = this.add.image(0, 0, 'ui_' + n).setOrigin(0, 0).setDepth(2.5);
    });
    let sv = {}; try { sv = JSON.parse(localStorage.getItem('suika_shop') || '{}'); } catch (e) { /* ignore */ }   // shop tab / filter survive closing the shop, new matches and reloads
    this.shopOpen = false; this.shopStat = sv.stat || null; this.shopCat = sv.cat || 'all'; this.shopSel = null; this.shopScroll = 0; this.shopBtns = []; this.slotBtns = [];
    this.shopG = this.add.graphics().setDepth(30); this.shopTipG = this.add.graphics().setDepth(40);
    this.input.on('wheel', (ptr, over, dx, dy) => { if (this.shopOpen) this.shopScroll += dy > 0 ? 1 : -1; });
    this.input.on('pointerdown', ptr => {
      if (!ptr.leftButtonDown()) return;
      const A = this.scene.get('arena'), hit = r => r && ptr.x >= r.x && ptr.x <= r.x + (r.s ?? r.w) && ptr.y >= r.y && ptr.y <= r.y + (r.s ?? r.h);
      if (this.shopOpen) { const sb = this.shopBtns.find(hit); if (sb) { A.audio.play('ui_click', { gap: 0 }); sb.fn(); } return; }   // the shop eats every click
      const si = this.slotBtns.findIndex(hit); if (si >= 0 && !this.overlay) { if (this.slotBtns[si].special) this.toggleShop(); else A.pc.useItem(si); return; }
      const rbt = !A.pc.alive && this.recapBtns?.find(hit); if (rbt) { A.audio.play('ui_tab', { gap: 0 }); this.recapSel = rbt.id; return; }   // death recap: pick another champion's info
      const vb = this.volBars?.find(hit); if (vb) { this.dragVol = vb; this.setVol(vb, ptr.x); return; }
      const bt = this.btns.find(hit); if (bt) { A.audio.play('ui_click', { gap: 0 }); bt.fn(); return; }
      if (this.overlay) return;
      const up = this.upRects.findIndex(r => r && hit(r)), i = this.iconRects.findIndex(hit);
      if (up >= 0) A.player.spend(ABILITY_KEYS[up]);   // glowing upgrade button above the icon
      else if (i >= 0) { if (A.pc.silenceT > 0 && !A.pc.def.abilities[ABILITY_KEYS[i]].passive) return; A.aimKey === ABILITY_KEYS[i] ? A.confirmAim() : A.beginAim(ABILITY_KEYS[i]); }   // silenced: icons cannot be clicked
      else if (hit(this.enemyHelpRect)) this.helpHold = 'sel';
    });
    this.input.on('pointermove', ptr => { if (this.dragVol && ptr.isDown) this.setVol(this.dragVol, ptr.x); });
    this.input.on('pointerup', () => { this.helpHold = null; this.dragVol = null; });
    this.input.on('pointerupoutside', () => { this.helpHold = null; this.dragVol = null; });
  }

  // reusable text objects (hidden each frame unless re-set)
  T(id, str, x, y, { size = 12, color = '#fff', origin = [0, 0], bold = false, stroke = 3, depth = 4 } = {}) {
    let t = this.txt[id];
    if (!t) t = this.txt[id] = this.add.text(0, 0, '', { fontFamily: 'monospace' }).setDepth(depth);
    t.setStyle({ fontFamily: 'monospace', fontSize: `${Math.max(7, Math.round(size))}px`, color, fontStyle: bold ? 'bold' : 'normal', stroke: '#000', strokeThickness: stroke });
    return t.setText(str).setOrigin(...origin).setPosition(x, y).setVisible(true);
  }

  // place a module at (x, y) with scale s; returns role -> {x, y, w, h} in screen px. Also registers its box (clicks on it don't reach the world).
  place(name, x, y, s) {
    const L = this.layout[name], im = this.panels[name];
    if (im) im.setPosition(x, y).setScale(s).setVisible(true);
    else { this.g.fillStyle(0x0a0e18, 0.92).fillRect(x, y, L.w * s, L.h * s); this.g.lineStyle(2, 0x3fd0ff, 0.5).strokeRect(x, y, L.w * s, L.h * s); }
    this.boxes.push({ x, y, w: L.w * s, h: L.h * s });
    const rect = role => { const h = L.holes[role]; return h && { x: x + h[0] * s, y: y + h[1] * s, w: h[2] * s, h: h[3] * s }; };
    Object.keys(L.holes).forEach(r => { const q = rect(r); this.g.fillStyle(0x070a12, 1).fillRect(q.x, q.y, q.w, q.h); });
    return rect;
  }

  update() {
    const A = this.scene.get('arena');
    if (!A?.player) return;
    Object.values(this.txt).forEach(t => t.setVisible(false));
    if (this.stImgs) Object.values(this.stImgs).forEach(im => im.setVisible(false));
    if (this.itImgs) Object.values(this.itImgs).forEach(im => im.setVisible(false));
    Object.values(this.panels).forEach(p => p.setVisible(false));
    const W = this.scale.width, H = this.scale.height, g = this.g, o = this.top, p = A.pc;
    g.clear(); o.clear(); this.tipG.clear(); this.redG.clear(); this.iconRects = []; this.upRects = []; this.boxes = [];
    const u = Phaser.Math.Clamp(Math.min(H / 900, W / 1480), 0.42, 1.5), m = 14 * u;

    // ---- worm: darkness, only a small circle around the champion stays visible ----
    if (p.alive && p.blindT > 0) {   // darkened map with an irregular, blurred vision area (not a perfect circle, not pitch black)
      const cam = A.cameras.main, v = cam.worldView, z = cam.zoom, cx = (p.x - v.x) * z, cy = (p.y - 40 - v.y) * z, S = 560 * z;
      if (!this.blindTex) { this.blindTex = this.textures.createCanvas('blindmask', 256, 256); this.blindImg = this.add.image(0, 0, 'blindmask').setDepth(0.45); this.blindTex.setFilter(Phaser.Textures.FilterMode.LINEAR); }
      if (!this.blindWas) {   // new random blob each time the blindness starts
        const ctx = this.blindTex.getContext(), id = ctx.createImageData(256, 256), ph = [0, 1, 2, 3, 4].map(() => Math.random() * 6.283), am = [0.1, 0.07, 0.05, 0.03, 0.02];
        for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
          const dx = (x - 128) / 128, dy = (y - 128) / 128, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
          let rr = 0.66; for (let k = 0; k < 5; k++) rr *= 1 + am[k] * Math.sin((k + 2) * th + ph[k]);
          const t = Math.min(1, Math.max(0, (d - rr * 0.62) / (rr * 0.62))), sm = t * t * (3 - 2 * t), i = (y * 256 + x) * 4;
          id.data[i] = 0; id.data[i + 1] = 6; id.data[i + 2] = 3; id.data[i + 3] = Math.round(sm * 215);
        }
        ctx.putImageData(id, 0, 0); this.blindTex.refresh();
      }
      this.blindImg.setVisible(true).setPosition(cx, cy).setDisplaySize(S, S);
      const L = cx - S / 2, Rr = cx + S / 2, Tp = cy - S / 2, Bt = cy + S / 2, rg = this.redG, y0 = Math.max(0, Tp), y1 = Math.min(H, Bt);
      rg.fillStyle(0x000603, 0.843).fillRect(0, 0, W, y0).fillRect(0, y1, W, Math.max(0, H - y1)).fillRect(0, y0, Math.max(0, L), y1 - y0).fillRect(Math.min(W, Rr), y0, Math.max(0, W - Rr), y1 - y0);
      this.T('blindT', `CEGADO ${p.blindT.toFixed(1)}s`, W / 2, 36 * u, { size: 16 * u, bold: true, color: '#9be37a', origin: [0.5, 0], stroke: 4 });
    }
    this.blindWas = p.alive && p.blindT > 0; if (!this.blindWas) this.blindImg?.setVisible(false);
    if (p.alive && p.silenceT > 0) this.T('silT', `SILENCIADO ${p.silenceT.toFixed(1)}s`, W / 2, 64 * u, { size: 16 * u, bold: true, color: '#c77dff', origin: [0.5, 0], stroke: 4 });
    const bm = p.bomber; if (bm && bm.phase === 'fly') this.T('bomber', `BOMBARDERO · ${Math.max(0, Math.ceil(bm.T - bm.t))}s · WASD: mover la vista · clic o Q: misiles · E: cajas · R: humo`, W / 2, 56 * u, { size: 18 * u, bold: true, color: '#66ff88', origin: [0.5, 0], stroke: 4 }); else this.texts?.bomber?.setVisible(false);
    const ctT = p.charmT > 0 ? p.charmT : (A.control?.mode === 'remote' && A.control.target === p ? A.control.t : 0);
    if (p.alive && ctT > 0) this.T('charmT', `CONTROLADO ${ctT.toFixed(1)}s`, W / 2, 90 * u, { size: 18 * u, bold: true, color: '#ffd23f', origin: [0.5, 0], stroke: 4 });

    if (A.control && A.control.mode === 'ctrl') this.T('ctrlT', `CONTROLANDO a ${A.control.target.def.name.toUpperCase()} · ${A.control.t.toFixed(1)}s`, W / 2, 90 * u, { size: 18 * u, bold: true, color: '#33ff88', origin: [0.5, 0], stroke: 4 });

    this.drawBanner(A, u, W);
    {   // scoreboard: the player's K / D / A hangs from the top-centre, team kills + match clock at the top-right
      const kd = this.layout.hud_kda, K = this.place('hud_kda', W / 2 - kd.w * u / 2, 0, u), sc = this.layout.hud_score, S = this.place('hud_score', W - sc.w * u - m, m, u);
      // glow pulse when a number goes up: remember the last value of every counter and flash its box for 1.2 s
      const pulse = (id, q, val, col) => {
        const c = (this.cnt ||= {}); const e = c[id] || (c[id] = { v: val, t: -9 });
        if (val > e.v) e.t = this.time.now; e.v = val;
        const age = (this.time.now - e.t) / 1200; if (age < 0 || age > 1) return 0;
        const k = 1 - age, pr = 0.6 + 0.4 * Math.sin(age * 22);
        for (let i = 0; i < 5; i++) o.fillStyle(col, 0.16 * k * pr * (5 - i) / 5).fillRect(q.x - i * 3 * u, q.y - i * 3 * u, q.w + i * 6 * u, q.h + i * 6 * u);
        o.lineStyle(3, 0xffffff, 0.9 * k).strokeRect(q.x - 1, q.y - 1, q.w + 2, q.h + 2); o.lineStyle(2, col, k).strokeRect(q.x - 4 * u, q.y - 4 * u, q.w + 8 * u, q.h + 8 * u);
        return k;
      };
      const cell = (id, q, label, val, col) => { this.T(id + 'v', `${val}`, q.x + q.w * 0.62, q.y + q.h / 2, { size: q.h * 0.62, bold: true, color: col, origin: [0.5, 0.5], stroke: 3 }); this.T(id + 'l', label, q.x + q.w * 0.14, q.y + q.h / 2, { size: q.h * 0.3, bold: true, color: '#8aa0c8', origin: [0.5, 0.5], stroke: 2 }); };
      cell('kK', K('kills'), 'K', p.kills, '#7dff9a'); cell('kD', K('deaths'), 'D', p.deaths, '#ff7a7a'); cell('kA', K('assists'), 'A', p.assists, '#ffe066');
      pulse('kK', K('kills'), p.kills, 0x7dff9a); pulse('kD', K('deaths'), p.deaths, 0xff5a5a); pulse('kA', K('assists'), p.assists, 0xffd23f);
      const tk = [0, 0]; A.champs.forEach(c => { tk[c.baseTeam] += c.kills; });
      const tm = Math.floor(A.gameT), clock = `${String(Math.floor(tm / 60)).padStart(2, '0')}:${String(tm % 60).padStart(2, '0')}`;
      const nb = S('blue'), nt = S('time'), nr = S('red');
      this.T('sB', `${tk[0]}`, nb.x + nb.w / 2, nb.y + nb.h / 2, { size: nb.h * 0.7, bold: true, color: '#8ab4ff', origin: [0.5, 0.5], stroke: 4 });
      this.T('sT', clock, nt.x + nt.w / 2, nt.y + nt.h / 2, { size: nt.h * 0.66, bold: true, color: '#ffffff', origin: [0.5, 0.5], stroke: 4 });
      this.T('sR', `${tk[1]}`, nr.x + nr.w / 2, nr.y + nr.h / 2, { size: nr.h * 0.7, bold: true, color: '#ff8a8a', origin: [0.5, 0.5], stroke: 4 });
      pulse('sB', nb, tk[0], 0x4aa3ff); pulse('sR', nr, tk[1], 0xff4a4a);
      this.scoreH = sc.h * u + 6 * u;
    }
    if (A.net && (!net.online || A.netLost)) this.T('reconn', 'RECONECTANDO…', W / 2, H / 2 - 120 * u, { size: 30 * u, bold: true, color: '#ffd23f', origin: [0.5, 0.5], stroke: 6, depth: 25 });
    {   // Jorbi's "15 Minutos más": golden glow around every player's screen while it lasts, and an hourglass announcement
      const G = A.rwGlow, gg = this.glowG || (this.glowG = this.add.graphics().setDepth(0.6)); gg.clear();
      if (G) {
        const k = Math.min(1, G.t / 0.8, (G.T - G.t) / 0.25 + 0.15), pulse = 0.8 + 0.2 * Math.sin(this.time.now / 160);
        for (let i = 0; i < 14; i++) gg.lineStyle(26, 0xffc933, 0.075 * (14 - i) / 14 * k * pulse).strokeRect(i * 11 - 6, i * 11 - 6, W - i * 22 + 12, H - i * 22 + 12);
        if (G.hg > 0) {
          const hk = Math.min(1, G.hg / 0.5, (2.6 - G.hg) / 0.25), sz = 150 * u, y0 = 250 * u;
          if (this.textures.exists('hourglass')) { this.hgImg = this.hgImg?.scene ? this.hgImg : this.add.image(0, 0, 'hourglass').setDepth(8); this.hgImg.setVisible(true).setPosition(W / 2, y0).setDisplaySize(sz, sz).setAlpha(hk).setAngle(Math.min(180, (2.6 - G.hg) * 150)); }
          else this.T('hgTxt', '⌛', W / 2, y0, { size: 90 * u, origin: [0.5, 0.5], color: '#ffd23f', depth: 8 }).setAlpha(hk);
        } else this.hgImg?.setVisible(false);
      } else this.hgImg?.setVisible(false);
    }

    // ---- dead: red screen + respawn countdown at the top ----
    if (!p.alive) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 300);
      this.redG.fillStyle(0x7a0000, 0.26 + 0.06 * pulse).fillRect(0, 0, W, H);
      for (let i = 0; i < 10; i++) this.redG.lineStyle(26, 0x9a0000, 0.045 * (10 - i)).strokeRect(i * 13, i * 13, W - i * 26, H - i * 26);
      const left = Math.max(0, p.respawnTime - p.deadT);
      this.T('deadT1', 'HAS MUERTO · REAPARECES EN', W / 2, 36 * u, { size: 18 * u, bold: true, color: '#ffb0b0', origin: [0.5, 0], stroke: 4, depth: 8 });
      this.T('deadT2', `${left.toFixed(1)}s`, W / 2, 60 * u, { size: 44 * u, bold: true, color: '#ff4a4a', origin: [0.5, 0], stroke: 6, depth: 8 });
      this.drawRecap(p, u, W, H);
    } else { this.recapBtns = []; this.recapFor = null; }

    // ---- bottom-left: hero ----
    const hh = this.layout.hud_hero.h * u, hy = H - hh - m;
    const Rh = this.place('hud_hero', m, hy, u);
    this.portrait('main', p.def.ref, Rh('portrait'));
    const nm = Rh('name');
    this.T('heroName', `${p.def.name.toUpperCase()} · Nv${p.level}`, nm.x + nm.w / 2, nm.y + nm.h / 2, { size: nm.h * 0.6, bold: true, origin: [0.5, 0.5], stroke: 2 });
    // level badge on the portrait corner: gold ring fills with XP around the level number (full ring = level up)
    const pq = Rh('portrait'), br = 17 * u, bcx = pq.x + 4 * u, bcy = pq.y + 4 * u;
    levelGauge(o, bcx, bcy, br, p.level >= MAX_LEVEL ? 1 : p.xp / p.xpNeed, 5 * u);
    this.T('lvlNum', `${p.level}`, bcx, bcy, { size: 15 * u, bold: true, origin: [0.5, 0.5], stroke: 3 });
    const ptrx = this.input.activePointer;
    if (Math.hypot(ptrx.x - bcx, ptrx.y - bcy) < br * 1.2) this.T('xpTip', p.level >= MAX_LEVEL ? 'Nivel máximo' : `XP ${Math.floor(p.xp)} / ${p.xpNeed}`, bcx + br + 6 * u, bcy, { size: 12 * u, bold: true, origin: [0, 0.5], color: '#ffd23f', depth: 8 });
    this.helpRect = null;   // no '?' button on the champion in use: its stats are always visible
    const hb = Rh('help');   // that slot now shows the unspent skill points
    this.T('ptsL', 'PUNTOS', hb.x + hb.w / 2, hb.y + hb.h * 0.2, { size: hb.h * 0.2, color: '#8aa0c8', bold: true, origin: [0.5, 0.5], stroke: 2 });
    this.T('ptsN', `${p.points}`, hb.x + hb.w / 2, hb.y + hb.h * 0.62, { size: hb.h * 0.52, color: p.points > 0 ? '#7dff9a' : '#5d6c88', bold: true, origin: [0.5, 0.5], stroke: 3 });
    {   // stats of the champion in use: always visible, to the side of the hero module
      const hs = this.layout.hud_stats, T = this.place('hud_stats', m + this.layout.hud_hero.w * u + 8 * u, H - m - hs.h * u, u);
      this.statsBlock('pop', T('stats'), p, true, 1);
    }

    // ---- bottom-center: abilities + big HP / mana ----
    const Rc = this.place('hud_center', W / 2 - this.layout.hud_center.w * u / 2, H - this.layout.hud_center.h * u - m, u);
    ABILITY_KEYS.forEach((a, i) => { const q = Rc('ability' + i); this.drawAbility(A, p, a, i, q.x, q.y, Math.min(q.w, q.h)); });
    const ptr = this.input.activePointer, hov = this.iconRects.findIndex(r => r && ptr.x >= r.x && ptr.x <= r.x + r.s && ptr.y >= r.y && ptr.y <= r.y + r.s);
    A.hoverKey = hov >= 0 && !p.def.abilities[ABILITY_KEYS[hov]].passive ? ABILITY_KEYS[hov] : null;   // world draws that ability's range
    const hp = Rc('hp'), mp = Rc('mana');
    const shd = p.shieldHp > 0 ? p.shieldHp : 0, tot = Math.max(p.maxHp, p.hp + shd);
    this.fillBar(g, hp, p.hp / tot, 0x2fd06f);
    if (shd > 0) { const sx0 = hp.x + hp.w * p.hp / tot, sw = hp.w * shd / tot; g.fillStyle(0xffffff).fillRect(sx0, hp.y, sw, hp.h).fillStyle(0xbfc8d8).fillRect(sx0, hp.y + hp.h * 0.65, sw, hp.h * 0.35); }   // white shield bar in front of the health
    this.T('hpTxt', `${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}${shd > 0 ? '  +' + Math.ceil(shd) : ''}`, hp.x + hp.w / 2, hp.y + hp.h / 2, { size: hp.h * 0.62, bold: true, origin: [0.5, 0.5] });
    if (p.def.charge) this.fillBar(g, mp, p.charge / 100, 0x4fe0c0); else if (p.isRage) this.fillBar(g, mp, p.hen ? p.henHp / p.henMax : p.rage / 100, p.hen ? 0xffd23f : 0xff7a2a); else this.fillBar(g, mp, p.maxMana ? p.mana / p.maxMana : 0, 0x3b8cff);
    this.T('mpTxt', p.def.charge ? (p.bomber?.phase === 'fly' ? `EN VUELO ${Math.ceil(p.charge)}%` : p.bomber ? 'LA NAVE LLEGA...' : `NAVE ${Math.floor(p.charge)}%`) : p.isRage ? (p.hen ? `GALLINA ${Math.ceil(p.henHp)} / ${Math.ceil(p.henMax)}` : `IRA ${Math.floor(p.rage)} / 100`) : `${Math.floor(p.mana)} / ${Math.floor(p.maxMana)}`, mp.x + mp.w / 2, mp.y + mp.h / 2, { size: mp.h * 0.62, bold: true, origin: [0.5, 0.5], stroke: 2 });
    if (A.aimKey) this.T('aimHint', `${p.def.abilities[A.aimKey].name}: CLIC para lanzar · clic derecho / ESC cancela`, W / 2, Rc('ability0').y - 44 * u, { size: 14 * u, color: '#ffd23f', bold: true, origin: [0.5, 1] });

    if (hov >= 0) this.drawTip(p, hov, this.iconRects[hov], u, W);
    else this.drawStatus(A, p, Rc, u, W);

    // ---- bottom-right: minimap ----
    const mmw = this.layout.hud_minimap.w * u, mmh = this.layout.hud_minimap.h * u;
    const Rm = this.place('hud_minimap', W - mmw - m, H - mmh - m, u);
    this.drawMinimap(A, g, o, Rm('minimap'));

    // ---- middle-left: 6 item slots (crafted items), gold and shop prompt ----
    const iy = H / 2 - this.layout.hud_items.h * u / 2, Ri = this.place('hud_items', m * 0.6, iy, u);
    this.slotBtns = []; let tipSlot = -1;
    for (let i = 0; i < 6; i++) {
      const q = Ri('item' + i), sl = p.inv[i]; this.slotBtns.push(q); this.boxes.push(q);
      this.T('key' + i, `${i + 1}`, q.x + 3 * u, q.y + 2 * u, { size: 11 * u, bold: true, color: '#cfe3ff', stroke: 3, depth: 5 });
      if (!sl) continue;
      const it = ITEM_BY_ID[sl.id], usable = !!(it.active || it.consumable);
      this.tile(g, 'slot' + i, sl.id, q, 3, sl.cd > 0 || (it.consumable && p.potionCd > 0) ? 0.45 : 1);
      if (sl.cd > 0) {   // clock sweep + seconds
        const f = sl.cd / it.active.cd; this.tipG.fillStyle(0x000000, 0.6).fillPoints(sweep(q.x + q.w / 2, q.y + q.h / 2, q.w / 2, f), true);
        this.T('cd' + i, `${Math.ceil(sl.cd)}`, q.x + q.w / 2, q.y + q.h / 2, { size: q.h * 0.4, bold: true, origin: [0.5, 0.5], depth: 7 });
      }
      if (it.consumable) this.T('ch' + i, `x${sl.charges}`, q.x + q.w - 3 * u, q.y + q.h - 2 * u, { size: 13 * u, bold: true, origin: [1, 1], color: '#ffe066', depth: 5 });
      else if (usable) this.tipG.fillStyle(0xffd23f, 0.9).fillCircle(q.x + q.w - 7 * u, q.y + 7 * u, 3.5 * u);
      const ptrI = this.input.activePointer; if (ptrI.x >= q.x && ptrI.x <= q.x + q.w && ptrI.y >= q.y && ptrI.y <= q.y + q.h) tipSlot = i;
    }
    if (tipSlot >= 0) this.itemTip(p.inv[tipSlot], Ri('item' + tipSlot), u);
    const gx0 = m * 0.6 + this.layout.hud_items.w * u / 2, gy0 = iy + this.layout.hud_items.h * u + 6 * u;
    this.T('gold', `ORO ${Math.floor(p.gold)}`, gx0, gy0, { size: 15 * u, color: '#ffd23f', bold: true, origin: [0.5, 0] });
    { const own = Object.keys(p.perm || {}).filter(k => p.perm[k] > 0);   // permanent upgrades you own: small red chips under the gold
      own.forEach((k, i) => { const x = gx0 - 52 * u + (i % 6) * 18 * u, y = gy0 + 54 * u + Math.floor(i / 6) * 18 * u; g.fillStyle(0x3a0d10, 1).fillRect(x, y, 16 * u, 16 * u).lineStyle(1, 0xff4a4a, 1).strokeRect(x, y, 16 * u, 16 * u); if (this.textures.exists('stat_' + k)) this.iconImg('pmh' + k, 'stat_' + k, x + 8 * u, y + 8 * u, 13 * u, 3.4); this.T('pmc' + k, `${p.perm[k]}`, x + 16 * u, y + 15 * u, { size: 8 * u, bold: true, origin: [1, 1], color: '#ffe27a', depth: 5 }); }); }
    this.shopPrompt = A.canShop(p) && !this.shopOpen ? { x: gx0 - 58 * u, y: gy0 + 24 * u, w: 116 * u, h: 26 * u } : null;
    if (this.shopPrompt) {
      const sp = this.shopPrompt, ptrS = this.input.activePointer, overS = ptrS.x >= sp.x && ptrS.x <= sp.x + sp.w && ptrS.y >= sp.y && ptrS.y <= sp.y + sp.h;
      this.boxes.push(sp); this.slotBtns.push({ ...sp, special: true });
      o.fillStyle(overS ? 0x2e8a5a : 0x14583a).fillRect(sp.x, sp.y, sp.w, sp.h).lineStyle(2, 0x7dff9a, 0.9).strokeRect(sp.x, sp.y, sp.w, sp.h);
      this.T('shopPrompt', 'TIENDA (B)', sp.x + sp.w / 2, sp.y + sp.h / 2, { size: 13 * u, bold: true, origin: [0.5, 0.5], stroke: 2, depth: 5 });
    }
    this.drawShop(A, p, u, W, H);

    // ---- top-right: clicked champion as a thin LINEAR strip (name + items); hold its ? for the stats box ----
    const sel = A.selected;
    this.enemyHelpRect = null;
    if (sel) {
      const eL = this.layout.hud_enemy, E = this.place('hud_enemy', W - eL.w * u - m, m + (this.scoreH || 0), u), n = E('name');
      const who = sel === p ? 'TU' : sel.team === A.player.baseTeam ? 'ALIADO' : 'ENEMIGO';
      this.T('tName', `${sel.def.name.toUpperCase()} Nv${sel.level} · ${who}`, n.x + 6 * u, n.y + n.h / 2,
        { size: n.h * 0.5, bold: true, origin: [0, 0.5], stroke: 2, color: sel === p ? '#7dff9a' : sel.team === A.player.baseTeam ? '#8ab4ff' : '#ff8a8a' });
      for (let i = 0; i < 6; i++) { const q = E('item' + i), sl = sel.inv?.[i]; if (q && sl) this.tile(g, 'eit' + i, sl.id, q, 3, 1); }
      const hb = this.enemyHelpRect = E('help');
      g.fillStyle(this.helpHold === 'sel' ? 0x1d6f8f : 0x0f2038).fillRect(hb.x, hb.y, hb.w, hb.h);
      this.T('help2?', '?', hb.x + hb.w / 2, hb.y + hb.h / 2, { size: hb.h * 0.8, bold: true, origin: [0.5, 0.5], color: '#7ee0ff' });
      if (this.helpHold === 'sel') {
        const hs = this.layout.hud_stats, T = this.place('hud_stats', W - hs.w * u - m, m + (this.scoreH || 0) + eL.h * u + 6 * u, u);
        this.statsBlock('sel', T('stats'), sel, false, 1);
      }
    }

    // ---- kill feed / announcements (top center, below the enemy strip) ----
    A.feed.forEach((e, i) => {
      const ally = e.team === A.player.baseTeam, col = ally ? '#8ab4ff' : '#ff8a8a', t = this.T('feed' + i, e.text, W / 2, (120 + i * 30) * u, { size: 15 * u, bold: true, color: col, origin: [0.5, 0.5], stroke: 4 });
      t.setAlpha(Math.min(1, e.t));
      o.fillStyle(0x070b14, 0.7 * Math.min(1, e.t)).fillRoundedRect(t.x - t.width / 2 - 12 * u, t.y - 13 * u, t.width + 24 * u, 26 * u, 6 * u);
      o.lineStyle(2, ally ? 0x3b82f6 : 0xff3b3b, 0.9 * Math.min(1, e.t)).strokeRoundedRect(t.x - t.width / 2 - 12 * u, t.y - 13 * u, t.width + 24 * u, 26 * u, 6 * u);
    });

    // ---- menu button + pause / game-over overlays ----
    this.btns = []; this.volBars = []; const ov = this.ovG; ov.clear();
    const btn = (id, label, x, y, w, h, fn, col = 0x1d3a5c) => {
      if (this.input.activePointer.x >= x && this.input.activePointer.x <= x + w && this.input.activePointer.y >= y && this.input.activePointer.y <= y + h) { if (this.hovBtn !== id) { this.hovBtn = id; A.audio.play('ui_hover', { gap: 0, vol: 0.5 }); } } else if (this.hovBtn === id) this.hovBtn = null;
      const over = this.input.activePointer.x >= x && this.input.activePointer.x <= x + w && this.input.activePointer.y >= y && this.input.activePointer.y <= y + h;
      const danger = col === 0x5c1d1d, rad = Math.min(7 * u, h / 2), bord = danger ? 0xff7a7a : 0x3fd0ff;
      if (over) ov.lineStyle(2, bord, 0.35).strokeRoundedRect(x - 2 * u, y - 2 * u, w + 4 * u, h + 4 * u, rad + 2 * u);
      ov.fillStyle(over ? (danger ? 0x8a2b2b : 0x1d7fc4) : col, 0.97).fillRoundedRect(x, y, w, h, rad).lineStyle(2, over ? (danger ? 0xffa0a0 : 0x8ae2ff) : bord, over ? 1 : 0.8).strokeRoundedRect(x, y, w, h, rad);
      ov.lineStyle(1, 0xffffff, over ? 0.35 : 0.18).lineBetween(x + 10 * u, y + 2.5 * u, x + w - 10 * u, y + 2.5 * u);
      this.T('b' + id, label, x + w / 2, y + h / 2, { size: h * 0.45, bold: true, origin: [0.5, 0.5], depth: 22 });
      this.btns.push({ x, y, w, h, fn });
    };
    const finished = A.over && A.over.t > 2.4;
    this.overlay = A.paused || finished;
    if (!this.overlay) {
      const mb = { x: 12, y: 44 * u, w: 92 * u, h: 26 * u }; this.boxes.push(mb);
      const over = this.input.activePointer.x >= mb.x && this.input.activePointer.x <= mb.x + mb.w && this.input.activePointer.y >= mb.y && this.input.activePointer.y <= mb.y + mb.h;
      o.fillStyle(over ? 0x1d7fc4 : 0x0a1a30, 0.95).fillRoundedRect(mb.x, mb.y, mb.w, mb.h, 6 * u).lineStyle(2, over ? 0x8ae2ff : 0x3fd0ff, over ? 1 : 0.8).strokeRoundedRect(mb.x, mb.y, mb.w, mb.h, 6 * u);
      this.T('menuBtn', '☰ MENÚ (Esc)', mb.x + mb.w / 2, mb.y + mb.h / 2, { size: 11 * u, bold: true, origin: [0.5, 0.5], stroke: 2 });
      this.btns.push({ ...mb, fn: () => A.togglePause() });
    } else {
      this.boxes.push({ x: 0, y: 0, w: W, h: H });
      ov.fillStyle(0x020812, 0.68).fillRect(0, 0, W, H);
      const pw = 380 * u, px0 = W / 2 - pw / 2, bh = 46 * u;
      // panel de cristal tech oscuro (estilo B) detrás del contenido
      const pW = Math.min(pw + 52 * u, W - 16 * u), pX = W / 2 - pW / 2, pTop = finished ? H / 2 - 184 * u : H / 2 - 200 * u, pH = finished ? 268 * u : 408 * u;
      ov.lineStyle(2, 0x3fd0ff, 0.22).strokeRoundedRect(pX - 3 * u, pTop - 3 * u, pW + 6 * u, pH + 6 * u, 14 * u);
      ov.fillStyle(0x0a1a30, 0.94).fillRoundedRect(pX, pTop, pW, pH, 12 * u).lineStyle(2, 0x3fd0ff, 0.65).strokeRoundedRect(pX, pTop, pW, pH, 12 * u);
      ov.lineStyle(1, 0x8ae2ff, 0.35).lineBetween(pX + 14 * u, pTop + 2.5 * u, pX + pW - 14 * u, pTop + 2.5 * u);
      if (finished) {
        const win = A.over.winner === A.player.baseTeam;
        this.T('ovTitle', win ? '¡VICTORIA!' : 'DERROTA', W / 2, H / 2 - 120 * u, { size: 64 * u, bold: true, color: win ? '#7dff9a' : '#ff6a6a', origin: [0.5, 0.5], stroke: 8, depth: 22 });
        this.T('ovSub', win ? 'El nexo enemigo ha caído' : 'Tu nexo ha sido destruido', W / 2, H / 2 - 60 * u, { size: 18 * u, color: '#cfe3ff', origin: [0.5, 0.5], stroke: 4, depth: 22 });
        btn('leave', 'VOLVER AL MENÚ', px0, H / 2 - 10 * u, pw, bh, () => this.leave());
      } else {
        this.T('ovTitle', 'PAUSA', W / 2, H / 2 - 150 * u, { size: 48 * u, bold: true, color: '#eaf7ff', origin: [0.5, 0.5], stroke: 6, depth: 22 });
        ov.fillStyle(0x3fd0ff, 0.9).fillRoundedRect(W / 2 - 34 * u, H / 2 - 121 * u, 68 * u, 3 * u, 2 * u);
        btn('resume', 'CONTINUAR', px0, H / 2 - 100 * u, pw, bh, () => A.togglePause());
        // volume bars (click or drag): the filled part is the current level
        [['music', 'MÚSICA', 0x3fd0ff], ['sfx', 'EFECTOS', 0x7dff9a], ['voice', 'VOZ ANUNCIADOR', 0xffd23f]].forEach(([k, label, col], n) => {
          const y = H / 2 + 80 * u + n * 34 * u, lw = 150 * u, bx = px0 + lw, bw = pw - lw - 56 * u, bhh = 16 * u;
          this.T('vl' + k, label, px0, y + bhh / 2, { size: 12 * u, bold: true, color: '#cfe3ff', origin: [0, 0.5], stroke: 3, depth: 22 });
          const trad = bhh / 2;
          ov.lineStyle(2, col, 0.28).strokeRoundedRect(bx - 2 * u, y - 2 * u, bw + 4 * u, bhh + 4 * u, trad + 2 * u);
          ov.fillStyle(0x08182e, 1).fillRoundedRect(bx, y, bw, bhh, trad);
          if (vol[k] > 0) { ov.fillStyle(col, 0.95).fillRoundedRect(bx, y, Math.max(bhh, bw * vol[k]), bhh, trad); ov.fillStyle(0xffffff, 0.28).fillRoundedRect(bx + 2 * u, y + 2 * u, Math.max(0, bw * vol[k] - 4 * u), bhh * 0.32, 2 * u); }
          ov.lineStyle(1, 0x3fd0ff, 0.45).strokeRoundedRect(bx, y, bw, bhh, trad);
          ov.fillStyle(0xeaf7ff, 1).fillRoundedRect(bx + bw * vol[k] - 3 * u, y - 3 * u, 6 * u, bhh + 6 * u, 3 * u).lineStyle(1, col, 0.9).strokeRoundedRect(bx + bw * vol[k] - 3 * u, y - 3 * u, 6 * u, bhh + 6 * u, 3 * u);
          this.T('vp' + k, `${Math.round(vol[k] * 100)}%`, bx + bw + 8 * u, y + bhh / 2, { size: 12 * u, bold: true, color: '#fff', origin: [0, 0.5], stroke: 3, depth: 22 });
          this.volBars.push({ x: bx - 4 * u, y: y - 8 * u, w: bw + 8 * u, h: bhh + 16 * u, bx, bw, key: k });
        });
        if (!A.training && !A.net) btn('surr', 'RENDIRSE', px0, H / 2 - 40 * u, pw, bh, () => A.surrender(), 0x5c1d1d);
        btn('leave', 'SALIR AL MENÚ PRINCIPAL', px0, A.training ? H / 2 - 40 * u : H / 2 + 20 * u, pw, bh, () => this.leave());
      }
    }

    A.uiRects = this.boxes;
  }

  /* ---------- items: icon tile, tooltip and shop ---------- */
  iconImg(key, tex, x, y, size, depth) {
    this.itImgs = this.itImgs || {}; let im = this.itImgs[key];
    if (!im || im.texture.key !== tex) { im?.destroy(); im = this.itImgs[key] = this.add.image(0, 0, tex); }
    return im.setDepth(depth).setVisible(true).setPosition(x, y).setDisplaySize(size, size);
  }
  // neutral square behind the item icon; small pips show the crafting level (1-3)
  tile(g, key, id, q, depth, alpha = 1) {
    const it = ITEM_BY_ID[id];
    const col = LV_COL[it.lvl];   // crafting level colour: basic = grey, level 2 = green, level 3 = purple
    g.fillStyle(col, 0.34 * alpha).fillRect(q.x, q.y, q.w, q.h).fillStyle(col, 0.2 * alpha).fillRect(q.x, q.y, q.w, q.h * 0.45).lineStyle(2, col, alpha).strokeRect(q.x, q.y, q.w, q.h);
    const tex = 'item_' + id, sz = Math.min(q.w, q.h) * 0.86;
    if (this.textures.exists(tex)) this.iconImg(key, tex, q.x + q.w / 2, q.y + q.h / 2, sz, depth + 0.2).setAlpha(alpha);
    else this.T(key + 'f', it.name.slice(0, 2).toUpperCase(), q.x + q.w / 2, q.y + q.h / 2, { size: q.h * 0.4, bold: true, origin: [0.5, 0.5], depth: depth + 0.5 });
    const ps = Math.max(3, q.w * 0.08); for (let i = 0; i < it.lvl; i++) g.fillStyle(col, alpha).fillRect(q.x + 3 + i * (ps + 2), q.y + q.h - ps - 3, ps, ps);
  }
  statStr(it) {
    const parts = Object.keys(it.stats).map(k => `${fmtStat(k, it.stats[k])} ${STAT_LABEL[k]}`);
    if (it.consumable) { const c = it.consumable; if (c.hp) parts.push(`cura ${c.hp} vida`); if (c.mana) parts.push(`${c.mana} maná`); }
    if (it.active) parts.push(`activo (enfriamiento ${it.active.cd}s)`);
    return parts.join(' · ') || '—';
  }
  // permanent-upgrade card: red "prompt" card with the advantage's logo
  permTile(g, key, pm, q, depth, have, alpha = 1) {
    g.fillStyle(0x3a0d10, alpha).fillRect(q.x, q.y, q.w, q.h).fillStyle(0xff4a4a, 0.3 * alpha).fillRect(q.x, q.y, q.w, q.h * 0.45).lineStyle(2, 0xff4a4a, alpha).strokeRect(q.x, q.y, q.w, q.h);
    g.fillStyle(0x1a0507, alpha).fillRect(q.x + 5, q.y + 5, q.w - 10, q.h * 0.2); this.T(key + 'pr', '> prompt_', q.x + 7, q.y + 6, { size: Math.max(7, q.w * 0.14), color: '#ff8a8a', depth: depth + 0.5, stroke: 0 }).setAlpha(alpha);
    const tx = 'stat_' + pm.stat;
    if (this.textures.exists(tx)) this.iconImg(key + 'ic', tx, q.x + q.w / 2, q.y + q.h * 0.6, q.w * 0.56, depth + 0.2).setAlpha(alpha);
    if (have > 0) this.T(key + 'ct', `x${have}`, q.x + q.w - 3, q.y + q.h - 2, { size: Math.max(9, q.w * 0.2), bold: true, origin: [1, 1], color: '#ffe27a', depth: depth + 0.6, stroke: 3 });
  }
  permPanel(g, p, pm, dx, dw, top, bottom, u, D, bev, head, sbtn) {
    const have = p.perm[pm.stat] || 0, nxt = PERM_COST, q = { x: dx + dw / 2 - 40 * u, y: top + 30 * u, w: 80 * u, h: 80 * u };
    this.T('pmN', pm.name.toUpperCase(), dx + 4 * u, top, { size: 17 * u, bold: true, color: '#ff8a8a', depth: D + 1 }).setWordWrapWidth(dw, true);
    bev(dx - 4 * u, top + 26 * u, dw + 8 * u, bottom - top - 36 * u, 8 * u, 0x0a1224, 1, 0xff4a4a, 0.5, 1);
    this.permTile(g, 'pmBig', pm, q, D, have, 1);
    this.T('pmV', `${STAT_LABEL[pm.stat]}  ${fmtStat(pm.stat, pm.per)} por compra`, dx + dw / 2, q.y + q.h + 12 * u, { size: 14 * u, bold: true, color: '#ffe27a', origin: [0.5, 0], depth: D + 1, stroke: 2 });
    this.T('pmL', `Compradas: ${have}`, dx + dw / 2, q.y + q.h + 36 * u, { size: 14 * u, color: '#ffffff', origin: [0.5, 0], depth: D + 1, stroke: 2 });
    this.T('pmT', `Total ahora: ${have ? fmtStat(pm.stat, pm.per * have) : '+0'}   →   al comprar: ${fmtStat(pm.stat, pm.per * (have + 1))}`, dx + dw / 2, q.y + q.h + 62 * u, { size: 12 * u, color: '#9fe8ff', origin: [0.5, 0], depth: D + 1, stroke: 2 });
    const d = this.T('pmD', pm.desc, dx + 10 * u, q.y + q.h + 96 * u, { size: 12 * u, color: '#aab8d0', depth: D + 1, stroke: 2 }); d.setWordWrapWidth(dw - 20 * u, true);
    const by = bottom, bh = 44 * u, label = p.gold < nxt ? `FALTA ORO (${nxt})` : `COMPRAR ${nxt}`;
    sbtn('pbuy', label, { x: dx, y: by, w: dw, h: bh }, p.canBuyPerm(pm.stat), () => p.buyPerm(pm.stat), 0x7a1d22);
  }
  // item tooltip: name, level, what it improves, description, passive (highlighted in yellow), recipe. `at` = {x, y} anchors it (shop: next to the mouse).
  itemTip(sl, q, u, shop = false) {
    const it = ITEM_BY_ID[sl.id], g = shop ? this.shopTipG : this.tipG, dep = shop ? 41 : 8, w = 290 * u;
    const ln = [[it.name.toUpperCase(), '#ffffff', 14], [`Nivel ${it.lvl} · ${CATS[it.cat]}`, CAT_COL[it.cat], 11]];
    Object.keys(it.stats).forEach(k => ln.push([`${fmtStat(k, it.stats[k])} ${STAT_STYLE[k].label}`, statCss(k), 12, k]));
    if (it.consumable) { const c = it.consumable; if (c.hp) ln.push([`Cura ${c.hp} de vida`, statCss('hpRegen'), 12, 'hpRegen']); if (c.mana) ln.push([`Restaura ${c.mana} de maná`, statCss('mana'), 12, 'mana']); }
    if (!Object.keys(it.stats).length && !it.consumable) ln.push(['Sin mejoras de estadísticas', '#8aa0c8', 11]);
    ln.push([it.desc, '#aab8d0', 11]);
    if (it.active) ln.push([`ACTIVO · enfriamiento ${it.active.cd}s${sl.cd > 0 ? ` · listo en ${Math.ceil(sl.cd)}s` : ''}`, '#ffd23f', 11]);
    let pi = -1; if (it.passive) { pi = ln.length; ln.push([`PASIVA · ${it.passive.name}: ${it.passive.desc}`, '#ffe27a', 11]); }
    if (it.recipe) ln.push([`Receta: ${it.recipe.map(r => ITEM_BY_ID[r].name).join(' + ')}`, '#8aa0c8', 10]);
    let h = 12 * u; const ts = ln.map((l, i) => { const t = this.T('itTip' + i, l[0], 0, 0, { size: l[2] * u, color: l[1], bold: i === 0 || i === pi || !!l[3], depth: dep + 1, stroke: 2 }); t.setWordWrapWidth(w - 20 * u - (l[3] ? l[2] * 1.6 * u : 0), true); const r = { t, h: t.height + 4 * u, ic: l[3], sz: l[2] * u }; h += r.h; return r; });
    const W = this.scale.width, H = this.scale.height, ptr = this.input.activePointer;
    const x = shop ? Math.min(W - w - 6, ptr.x + 18 * u) : q.x + q.w + 14 * u, y = shop ? Math.min(H - h - 6, Math.max(6, ptr.y - 8 * u)) : q.y;
    g.fillStyle(0x070b14, 0.97).fillRect(x, y, w, h).lineStyle(2, 0x56688a, 0.95).strokeRect(x, y, w, h);
    let yy = y + 6 * u; ts.forEach((r, i) => {
      if (i === pi) g.fillStyle(0xffd23f, 0.2).fillRect(x + 4 * u, yy - 2 * u, w - 8 * u, r.h + 1 * u).fillStyle(0xffd23f, 1).fillRect(x + 4 * u, yy - 2 * u, 3 * u, r.h + 1 * u);   // passive highlighted in yellow
      if (r.ic) this.iconImg('itTipI' + i, 'stat_' + r.ic, x + 10 * u + r.sz * 0.65, yy + r.t.height / 2, r.sz * 1.4, dep + 1);
      r.t.setPosition(x + 10 * u + (i === pi ? 4 * u : 0) + (r.ic ? r.sz * 1.6 : 0), yy); yy += r.h;
    });
  }
  saveShop() { try { localStorage.setItem('suika_shop', JSON.stringify({ cat: this.shopCat, stat: this.shopStat })); } catch (e) { /* ignore */ } }
  toggleShop() {
    const A = this.scene.get('arena');
    if (this.shopOpen) { this.shopOpen = false; return; }
    if (A?.pc && A.canShop(A.pc) && !A.paused) { this.shopOpen = true; A.audio.play('ui_open', { gap: 0 }); if (!this.shopSel) this.shopSel = ITEMS[0].id; }
  }
  drawShop(A, p, u, W, H) {
    this.shopBtns = []; const g = this.shopG; g.clear(); this.shopTipG.clear(); this.shopHover = null;
    if (this.shopOpen && (!A.canShop(p) || A.paused || (A.over && A.over.t > 2.4))) this.shopOpen = false;
    if (!this.shopOpen) return;
    const pw = Math.min(W - 24, 1200 * u), ph = Math.min(H - 24, 690 * u), x0 = (W - pw) / 2, y0 = (H - ph) / 2, pad = 16 * u, D = 32;
    this.boxes.push({ x: 0, y: 0, w: W, h: H });
    // chamfered panels (same look as the launcher windows)
    const bev = (x, y, w, h, c, fc, fa, lc, la, lw = 2) => { const P = [{ x: x + c, y }, { x: x + w - c, y }, { x: x + w, y: y + c }, { x: x + w, y: y + h - c }, { x: x + w - c, y: y + h }, { x: x + c, y: y + h }, { x, y: y + h - c }, { x, y: y + c }]; g.fillStyle(fc, fa).fillPoints(P, true); g.lineStyle(lw, lc, la).strokePoints(P, true); };
    const head = (id, label, x, y) => { g.fillStyle(0xffd23f, 1).fillRect(x, y + 2 * u, 4 * u, 14 * u); this.T(id, label, x + 11 * u, y, { size: 13 * u, bold: true, color: '#7ee0ff', depth: D + 1, stroke: 2 }); };
    g.fillStyle(0x000000, 0.66).fillRect(0, 0, W, H);
    bev(x0, y0, pw, ph, 16 * u, 0x070d1a, 0.985, 0x3fd0ff, 0.95, 3);
    g.lineStyle(1, 0x3fd0ff, 0.25).strokeRect(x0 + 8 * u, y0 + 8 * u, pw - 16 * u, ph - 16 * u);
    const ptr = this.input.activePointer, over = q => ptr.x >= q.x && ptr.x <= q.x + q.w && ptr.y >= q.y && ptr.y <= q.y + q.h;
    const sbtn = (id, label, q, en, fn, col = 0x1d3a5c, tc = '#fff') => {
      bev(q.x, q.y, q.w, q.h, Math.min(8 * u, q.h * 0.3), !en ? 0x151a24 : over(q) ? 0x2e6aa8 : col, 1, en ? 0x3fd0ff : 0x3a4252, 0.95);
      if (en) g.fillStyle(0xffffff, 0.12).fillRect(q.x + 8 * u, q.y + 3, q.w - 16 * u, Math.max(2, q.h * 0.16));
      this.T('sb' + id, label, q.x + q.w / 2, q.y + q.h / 2, { size: Math.min(q.h * 0.42, q.w / (label.length * 0.62)), bold: true, origin: [0.5, 0.5], color: en ? tc : '#5d6676', stroke: 2, depth: D + 1 });
      if (en) this.shopBtns.push({ ...q, fn });
    };
    head('shT', 'TIENDA DE LA BASE', x0 + pad * 1.4, y0 + 14 * u);
    this.T('shGold', `ORO  ${Math.floor(p.gold)}`, x0 + pw - pad * 2 - 50 * u, y0 + 13 * u, { size: 20 * u, bold: true, color: '#ffd23f', origin: [1, 0], depth: D + 1 });
    sbtn('x', 'X', { x: x0 + pw - pad - 34 * u, y: y0 + 10 * u, w: 34 * u, h: 30 * u }, true, () => { this.shopOpen = false; }, 0x5c1d1d);

    // ---- left column: category tabs + items grouped by level ----
    const fcw = 50 * u, gw = pw * 0.56 - pad - fcw - 8 * u, gx = x0 + pad * 1.4 + fcw + 8 * u, gx0 = x0 + pad * 1.4, ty = y0 + 52 * u, SH = { all: 'TODOS', basic: 'BÁSICOS', ad: 'ATAQUE', ap: 'PODER IA', arm: 'ARMADURA', mr: 'RESIST. IA', hp: 'VIDA', util: 'UTILIDAD', rec: 'RECUP.', perm: 'MEJORAS' };
    const cats = Object.keys(SH), tw = gw / cats.length;
    cats.forEach((c, i) => sbtn('tab' + c, SH[c], { x: gx + i * tw, y: ty, w: tw - 3 * u, h: 28 * u }, true, () => { this.shopCat = c; this.shopScroll = 0; this.saveShop(); }, this.shopCat === c ? 0x2e6aa8 : 0x10213a, c === 'all' ? '#fff' : c === 'basic' ? '#dfe8ff' : c === 'perm' ? '#ff8a8a' : CAT_COL[c]));
    const cs = 60 * u, gap = 8 * u, cellH = cs + 17 * u, gy = ty + 38 * u, invH = 110 * u, gh = ph - (gy - y0) - invH - pad * 1.3, cols = Math.max(1, Math.floor((gw + gap) / (cs + gap)));
    bev(gx - 6 * u, gy - 6 * u, gw + 12 * u, gh + 12 * u, 8 * u, 0x0a1224, 1, 0x2a3650, 1, 1);
    const STAT_KEYS = ['atk', 'ap', 'armor', 'mr', 'hp', 'mana', 'speed', 'aspd', 'lifesteal', 'cdr', 'hpRegen', 'manaRegen'], fl = this.shopStat;
    {   // filter by advantage: vertical column on the left; the first entry (TODOS) clears the filter
      const colTop = ty, colH = (y0 + ph - pad * 1.3 - 62 * u - 30 * u) - colTop, n13 = STAT_KEYS.length + 1, cg = 4 * u, cc = Math.min(fcw - 8 * u, (colH - 20 * u - (n13 - 1) * cg) / n13);
      bev(gx0 - 4 * u, colTop, fcw + 4 * u, colH, 8 * u, 0x0a1224, 1, 0x2a3650, 1, 1);
      let hov = null;
      for (let i = 0; i < n13; i++) {
        const k = i === 0 ? null : STAT_KEYS[i - 1], q = { x: gx0 + (fcw - cc) / 2 - 2 * u, y: colTop + 10 * u + i * (cc + cg), w: cc, h: cc }, on = fl === k, tx = 'stat_' + k;
        g.fillStyle(on ? 0x3a3014 : 0x121b2e, 1).fillRect(q.x, q.y, q.w, q.h).lineStyle(on ? 3 : 1, on ? 0xffd23f : over(q) ? 0x7ee0ff : 0x36486a, 1).strokeRect(q.x, q.y, q.w, q.h);
        if (k === null) this.T('flAll', 'TODOS', q.x + q.w / 2, q.y + q.h / 2, { size: cc * 0.27, bold: true, origin: [0.5, 0.5], color: on ? '#ffd23f' : '#9fe8ff', depth: D + 1, stroke: 2 });
        else if (this.textures.exists(tx)) this.iconImg('flt' + i, tx, q.x + q.w / 2, q.y + q.h / 2, q.w * 0.8, D + 0.4);
        else this.T('fl' + k, STAT_LABEL[k].slice(0, 3).toUpperCase(), q.x + q.w / 2, q.y + q.h / 2, { size: q.h * 0.3, bold: true, origin: [0.5, 0.5], color: '#9fe8ff', depth: D + 1 });
        if (over(q)) hov = k === null ? 'Todos los objetos' : STAT_LABEL[k];
        this.shopBtns.push({ ...q, fn: () => { this.shopStat = k; this.shopScroll = 0; this.saveShop(); } });
      }
      this.fltHover = hov;
    }
    const list = ITEMS.filter(i => this.shopCat !== 'perm' && (this.shopCat === 'all' || (this.shopCat === 'basic' ? i.lvl === 1 : i.cat === this.shopCat)) && (!fl || i.stats[fl] > 0 || (fl === 'hp' && i.consumable?.hp) || (fl === 'mana' && i.consumable?.mana)));
    const LVT = { 1: 'NIVEL 1 · COMPONENTES BÁSICOS', 2: 'NIVEL 2 · OBJETOS COMBINADOS', 3: 'NIVEL 3 · OBJETOS AVANZADOS' }, rows = [];
    for (const lv of [1, 2, 3]) { const its = list.filter(i => i.lvl === lv); if (!its.length) continue; rows.push({ hdr: LVT[lv], lv, h: 26 * u }); for (let k = 0; k < its.length; k += cols) rows.push({ its: its.slice(k, k + cols), h: cellH + gap }); }
    const pl2 = (this.shopCat === 'all' || this.shopCat === 'perm') ? PERMS.filter(q => !fl || q.stat === fl) : [];
    if (pl2.length) { rows.push({ hdr: 'MEJORAS PERMANENTES · se compran varias veces', lv: 'perm', h: 26 * u }); for (let k = 0; k < pl2.length; k += cols) rows.push({ its: pl2.slice(k, k + cols), h: cellH + gap }); }
    let maxS = 0; { let acc = 0; for (let i = rows.length - 1; i >= 0; i--) { acc += rows[i].h; if (acc > gh) { maxS = i + 1; break; } } }
    this.shopScroll = Phaser.Math.Clamp(this.shopScroll, 0, maxS);
    let yy = gy, n = 0;
    if (!rows.length) this.T('shNone', 'Ningún objeto da esa ventaja en esta categoría', gx + gw / 2, gy + 40 * u, { size: 13 * u, color: '#7a8db3', origin: [0.5, 0], depth: D + 1 });
    for (let ri = this.shopScroll; ri < rows.length; ri++) {
      const row = rows[ri]; if (yy + row.h > gy + gh + gap) break;
      if (row.hdr) { g.fillStyle(LV_COL[row.lv], 1).fillRect(gx, yy + 4 * u, 5 * u, 14 * u); g.fillStyle(LV_COL[row.lv], 0.3).fillRect(gx + 10 * u, yy + 11 * u, gw - 10 * u, 1); this.T('shH' + n, row.hdr, gx + 12 * u, yy + 2 * u, { size: 11 * u, bold: true, color: LV_HEX[row.lv], depth: D + 1, stroke: 2 }); yy += row.h; n++; continue; }
      row.its.forEach((it, c) => {
        if (it.perm) {   // permanent upgrade card: always the same red card, only the logo changes
          const q = { x: gx + c * (cs + gap), y: yy, w: cs, h: cs }, have = p.perm[it.stat] || 0, key = 'pm' + n + '_' + c, afford = p.canBuyPerm(it.stat);
          this.permTile(g, key, it, q, D, have, afford ? 1 : 0.55);
          if (this.shopSel === it.id) g.lineStyle(3, 0xffffff, 1).strokeRect(q.x - 2, q.y - 2, q.w + 4, q.h + 4);
          this.T('gp' + key, `${PERM_COST}`, q.x + q.w / 2, q.y + q.h + 2 * u, { size: 11 * u, bold: true, origin: [0.5, 0], color: afford ? '#ffd23f' : '#ff6a6a', stroke: 2, depth: D + 1 });
          this.shopBtns.push({ x: q.x, y: q.y, w: cs, h: cellH, fn: () => { this.shopSel = it.id; this.shopSlot = null; } });
          return;
        }
        const q = { x: gx + c * (cs + gap), y: yy, w: cs, h: cs }, si = p.slotOf(it.id), pl = buyPlan(p.inv, it.id), afford = pl.ok && p.gold >= pl.gold, key = 'g' + n + '_' + c;
        this.tile(g, key, it.id, q, D, afford || si >= 0 ? 1 : 0.5);
        Object.keys(it.stats).slice(0, 2).forEach((k, j) => { const tx = 'stat_' + k; if (this.textures.exists(tx)) this.iconImg(key + 's' + j, tx, q.x + q.w - 9 * u, q.y + 9 * u + j * 17 * u, 15 * u, D + 0.6); });   // the advantages it gives
        if (this.shopSel === it.id) g.lineStyle(3, 0xffffff, 1).strokeRect(q.x - 2, q.y - 2, q.w + 4, q.h + 4);
        this.T('gp' + key, si >= 0 ? 'TIENES' : `${pl.gold}`, q.x + q.w / 2, q.y + q.h + 2 * u, { size: 11 * u, bold: true, origin: [0.5, 0], color: si >= 0 ? '#7dff9a' : afford ? '#ffd23f' : '#ff6a6a', stroke: 2, depth: D + 1 });
        this.shopBtns.push({ x: q.x, y: q.y, w: cs, h: cellH, tip: it.id, fn: () => { this.shopSel = it.id; this.shopSlot = null; } });
      });
      yy += row.h; n++;
    }
    if (maxS > 0) {
      sbtn('up', '▲', { x: gx + gw - 60 * u, y: gy + gh + 10 * u, w: 28 * u, h: 24 * u }, this.shopScroll > 0, () => { this.shopScroll--; });
      sbtn('dn', '▼', { x: gx + gw - 28 * u, y: gy + gh + 10 * u, w: 28 * u, h: 24 * u }, this.shopScroll < maxS, () => { this.shopScroll++; });
    }

    // inventory strip
    const iy = y0 + ph - pad * 1.3 - 62 * u;
    head('shInv', 'INVENTARIO · clic para ver · teclas 1-6 para usar', gx0, iy - 24 * u);
    for (let i = 0; i < 6; i++) {
      const q = { x: gx0 + i * (58 * u + 10 * u), y: iy, w: 58 * u, h: 58 * u }, sl = p.inv[i];
      if (!sl) { g.fillStyle(0x0d1422, 1).fillRect(q.x, q.y, q.w, q.h).lineStyle(1, 0x2a3650, 1).strokeRect(q.x, q.y, q.w, q.h); continue; }
      this.tile(g, 'inv' + i, sl.id, q, D);
      if (this.shopSel === sl.id && (this.shopSlot ?? i) === i) g.lineStyle(3, 0xffffff, 1).strokeRect(q.x - 2, q.y - 2, q.w + 4, q.h + 4);
      if (ITEM_BY_ID[sl.id].consumable) this.T('invc' + i, `x${sl.charges}`, q.x + q.w - 3 * u, q.y + q.h - 2 * u, { size: 12 * u, bold: true, origin: [1, 1], color: '#ffe066', depth: D + 2 });
      this.shopBtns.push({ ...q, tip: sl.id, fn: () => { this.shopSel = sl.id; this.shopSlot = i; } });
    }

    // right column: title, recipe tree, action buttons
    const dx = gx + gw + pad * 1.5, dw = x0 + pw - pad - dx;
    if (PERM_BY_ID[this.shopSel]) { this.permPanel(g, p, PERM_BY_ID[this.shopSel], dx, dw, y0 + 52 * u, y0 + ph - pad * 1.3 - 46 * u, u, D, bev, head, sbtn); return; }
    const it = ITEM_BY_ID[this.shopSel] || ITEMS[0];
    const owned = p.inv.map((sl, i) => (sl && sl.id === it.id ? i : -1)).filter(i => i >= 0), sellSlot = owned.includes(this.shopSlot) ? this.shopSlot : owned[0], sl = sellSlot !== undefined ? p.inv[sellSlot] : null;
    const fy = y0 + 52 * u;
    let dy = fy;
    this.T('dN', it.name.toUpperCase(), dx + 4 * u, dy, { size: 17 * u, bold: true, color: '#ffffff', depth: D + 1 }).setWordWrapWidth(dw, true); dy += 26 * u;
    if (it.passive) { const pp = this.T('dP', `PASIVA · ${it.passive.name}: ${it.passive.desc}`, dx + 4 * u, dy + (Object.keys(it.stats).length || 1) * 18 * u + ((it.consumable || it.active) ? 16 * u : 0) + 2 * u, { size: 11 * u, color: '#ffe27a', depth: D + 1, stroke: 2 }); pp.setWordWrapWidth(dw - 8 * u, true); this.passH = pp.height + 6 * u; } else this.passH = 0;
    const sk = Object.keys(it.stats); sk.forEach((k, j) => { this.iconImg('dSI' + j, 'stat_' + k, dx + 12 * u, dy + 8 * u, 16 * u, D + 1); this.T('dS' + j, `${fmtStat(k, it.stats[k])} ${STAT_STYLE[k].label}`, dx + 26 * u, dy, { size: 12 * u, bold: true, color: statCss(k), depth: D + 1, stroke: 2 }); dy += 18 * u; });
    const xs = [it.consumable?.hp ? `cura ${it.consumable.hp} de vida` : '', it.consumable?.mana ? `${it.consumable.mana} de maná` : '', it.active ? `activo (enfriamiento ${it.active.cd}s)` : ''].filter(Boolean).join(' · ');
    if (xs) { const st = this.T('dSx', xs, dx + 4 * u, dy, { size: 11 * u, color: '#9fe8ff', depth: D + 1, stroke: 2 }); st.setWordWrapWidth(dw, true); dy += st.height + 4 * u; } else if (!sk.length) { this.T('dSx', '—', dx + 4 * u, dy, { size: 11 * u, color: '#9fe8ff', depth: D + 1 }); dy += 16 * u; }
    dy += 6 * u + (this.passH || 0);
    const ups = ITEMS.filter(i => i.recipe && i.recipe.includes(it.id));   // what this item can become one level up
    {   // recipe tree: the item on top, its components below (up to 3 crafting levels). Owned components are marked: they are consumed when you craft.
      const upH = ups.length ? 74 * u : 0, by0 = y0 + ph - pad * 1.3 - 46 * u, tx = dx, tt0 = dy, th = by0 - 10 * u - tt0 - upH, rowH = (th - 24 * u) / 3, ts = Math.min(52 * u, rowH - 26 * u), tree = recipeTree(p.inv, it.id), GOLD = 0xffd23f;
      const done = nd => nd.owned || (nd.children.length > 0 && nd.children.every(done));   // a node is complete when you own it or own everything under it
      const pulse = 0.65 + 0.35 * Math.sin(this.time.now / 260);
      bev(tx - 4 * u, tt0, dw + 8 * u, th, 8 * u, 0x0a1224, 1, 0x2a3650, 1, 1);
      head('trH', 'ÁRBOL DE CRAFTEO', tx + 4 * u, tt0 + 6 * u);
      let n = 0;
      const glow = (q, w) => { g.lineStyle(w + 6, GOLD, 0.25 * pulse).strokeRect(q.x - 4, q.y - 4, q.w + 8, q.h + 8); g.lineStyle(w, 0xffe27a, 1).strokeRect(q.x - 2, q.y - 2, q.w + 4, q.h + 4); };
      const place = (node, depth, xl, xr, parent) => {
        const cx = (xl + xr) / 2, cy = tt0 + 24 * u + depth * rowH, q = { x: cx - ts / 2, y: cy, w: ts, h: ts }, c = ITEM_BY_ID[node.id], k = n++, dn = done(node);
        if (parent) { const lit = dn; if (lit) g.lineStyle(7, GOLD, 0.22 * pulse).lineBetween(parent.x, parent.y + ts, cx, cy); g.lineStyle(lit ? 3 : 2, lit ? 0xffe27a : 0x4b5870, 1).lineBetween(parent.x, parent.y + ts, cx, cy); }
        this.tile(g, 'tr' + k, node.id, q, D, depth <= 1 || node.owned ? 1 : 0.8);
        if (depth <= 1 || dn) glow(q, 3);   // the item being crafted, its ingredients and anything already completed
        else g.lineStyle(2, LV_COL[c.lvl], 1).strokeRect(q.x - 2, q.y - 2, q.w + 4, q.h + 4);
        const lw = Math.max(60 * u, Math.min(dw / (depth === 2 ? 4 : depth === 1 ? 2 : 1), 150 * u)), lab = this.T('trL' + k, c.name, cx, cy + ts + 3 * u, { size: 10 * u, color: depth <= 1 ? '#ffe9a0' : '#cfe0ff', depth: D + 1, stroke: 2, origin: [0.5, 0] }); lab.setWordWrapWidth(lw, true).setAlign('center');
        this.T('trP' + k, node.owned ? '✔ TIENES' : depth === 0 ? '' : `${c.cost}`, cx, cy + ts + 3 * u + lab.height, { size: 10 * u, bold: true, color: node.owned ? '#ffd23f' : '#ffffff', depth: D + 1, stroke: 2, origin: [0.5, 0] });
        if (depth > 0) this.shopBtns.push({ x: cx - lw / 2, y: cy, w: lw, h: ts + 26 * u, tip: node.id, fn: () => { this.shopSel = node.id; this.shopSlot = null; } });
        const w2 = (xr - xl) / Math.max(1, node.children.length);
        node.children.forEach((ch, i) => place(ch, depth + 1, xl + i * w2, xl + (i + 1) * w2, { x: cx, y: cy }));
      };
      place(tree, 0, tx + 6 * u, tx + dw - 6 * u, null);
      if (ups.length) {   // items that use this one as an ingredient (one crafting level up)
        const uy = tt0 + th + 8 * u; bev(tx - 4 * u, uy, dw + 8 * u, upH - 4 * u, 8 * u, 0x0a1224, 1, 0x2a3650, 1, 1);
        head('upH', 'SE USA PARA CREAR', tx + 4 * u, uy + 5 * u);
        const us = Math.min(36 * u, (dw - 12 * u) / Math.max(ups.length, 1) - 6 * u);
        ups.forEach((ui, i) => { const q = { x: tx + 8 * u + i * (us + 6 * u), y: uy + 26 * u, w: us, h: us }; this.tile(g, 'up' + i, ui.id, q, D, 1); glow(q, 2); this.shopBtns.push({ ...q, tip: ui.id, fn: () => { this.shopSel = ui.id; this.shopSlot = null; } }); });
      }
    }
    const by = y0 + ph - pad * 1.3 - 46 * u, bh = 44 * u, bw1 = (dw - 8 * u) * 0.62, bw2 = dw - 8 * u - bw1, pl = buyPlan(p.inv, it.id);
    const label = !pl.ok ? pl.reason : p.gold < pl.gold ? `FALTA ORO (${pl.gold})` : `${it.recipe ? 'ARMAR' : 'COMPRAR'} ${pl.gold}`;
    sbtn('buy', label, { x: dx, y: by, w: bw1, h: bh }, p.canBuy(it.id), () => p.buyItem(it.id), 0x14583a);
    const sv = sl ? sellValue(it) * (it.consumable ? Math.max(1, sl.charges) : 1) : 0;
    sbtn('sell', sl ? `VENDER ${sv}` : 'VENDER', { x: dx + bw1 + 8 * u, y: by, w: bw2, h: bh }, !!sl, () => p.sellItem(sellSlot), 0x5c3a1d);
    { const hb = this.shopBtns.find(b2 => b2.tip && over(b2)); if (hb) { this.shopHover = hb.tip; this.itemTip({ id: hb.tip, cd: 0 }, null, u, true); } }
    if (fl || this.fltHover) { const txt = this.fltHover || `Filtro: ${STAT_LABEL[fl]}`, t = this.T('fltName', txt, this.fltHover ? ptr.x + 16 * u : gx + 4 * u, this.fltHover ? ptr.y - 6 * u : ty + 46 * u, { size: 12 * u, bold: true, color: '#ffd23f', depth: D + 6, stroke: 4 }); if (!this.fltHover) t.setText(`Filtro: ${STAT_LABEL[fl]}`).setPosition(gx + gw - t.width - 4 * u, ty + 8 * u).setVisible(false); }
  }

  setVol(bar, x) {
    const A = this.scene.get('arena'); vol[bar.key] = Math.round(Phaser.Math.Clamp((x - bar.bx) / bar.bw, 0, 1) * 100) / 100; saveVol(); A.audio.refresh();
  }

  leave() {
    const A = this.scene.get('arena'); if (A) { A.time.paused = false; A.tweens.resumeAll(); A.paused = false; }   // leaving from the pause menu must not leave the clocks frozen for the next match
    this.anims.resumeAll();
    if (net.room) { net.send('leave_room'); net.room = null; }
    this.scene.stop('arena'); this.scene.stop('hud'); this.scene.start('launcher');
  }

  // epic announcement banner: killer's face (big), victim's face (small), title and subtitle; slides in, pops, fades out
  drawBanner(A, u, W) {
    const b = A.banner, g = this.g, o = this.top;
    if (this.bnImgs) Object.values(this.bnImgs).forEach(i => i.setVisible(false));
    if (!b) return;
    const age = b.T - b.t, inT = Math.min(1, age / 0.4), outT = Math.min(1, b.t / 0.45);
    const ease = 1 - Math.pow(1 - inT, 3), pop = 1 + (b.big || 1) * 0.02 * Math.max(0, 1 - age * 2.5) + (inT < 1 ? (1 - ease) * -0.25 : 0);
    const alpha = Math.min(ease, outT), sc = Math.min(W * 0.5 / 800, 0.62 * u) * pop;   // compact banner
    const col = b.team === 0 ? 'blue' : b.team === 1 ? 'red' : 'gold', tint = { blue: 0x4aa3ff, red: 0xff4a3a, gold: 0xffd23f }[col], tcol = { blue: '#9ad0ff', red: '#ff9a8a', gold: '#ffe066' }[col];
    // variants: with the actor's portrait -> only the left frame; announcer-only messages -> plain banner (no frames)
    const name = b.face ? (this.panels['hud_banner_' + col + '_l'] ? 'hud_banner_' + col + '_l' : 'hud_banner_' + col) : (this.panels.hud_banner_gold_plain ? 'hud_banner_gold_plain' : 'hud_banner_gold'), L = this.layout[name], bw = 800 * sc, bh = 140 * sc, x = W / 2 - bw / 2, y = 74 * u + (1 - ease) * -70 * u;
    this.boxes.push({ x, y, w: bw, h: bh });
    // glow behind the banner
    o.fillStyle(tint, 0.16 * alpha).fillRect(x - 14 * sc, y + 10 * sc, bw + 28 * sc, bh - 20 * sc);
    const art = this.panels[name];
    if (art) art.setPosition(x, y).setScale(sc).setAlpha(alpha).setVisible(true);
    else { this.g.fillStyle(0x0a0f1e, 0.95 * alpha).fillRect(x, y, bw, bh).lineStyle(4, tint, alpha).strokeRect(x, y, bw, bh); }
    const hole = r => L.holes[r] && { x: x + L.holes[r][0] * sc, y: y + L.holes[r][1] * sc, w: L.holes[r][2] * sc, h: L.holes[r][3] * sc };
    const show = (id, f, q) => {
      if (!f || !q) return;
      this.bnImgs = this.bnImgs || {};
      if (!this.bnImgs[id] || this.bnImgs[id].key !== f.tex) { this.bnImgs[id]?.destroy(); this.bnImgs[id] = this.add.image(0, 0, f.tex).setOrigin(0, 0).setDepth(2); this.bnImgs[id].key = f.tex; }
      const im = this.bnImgs[id].setVisible(true).setAlpha(alpha);
      this.g.fillStyle(0x05070d, alpha).fillRect(q.x, q.y, q.w, q.h);
      if (f.kind === 'face') { const cw = 400, ch = Math.min(420, cw), k = q.w / cw; im.setCrop(360, 10, cw, ch).setScale(k).setPosition(q.x - 360 * k, q.y - 10 * k); }
      else { im.setCrop(); const k = Math.min(q.w / im.width, q.h / im.height) * 0.92; im.setScale(k).setPosition(q.x + (q.w - im.width * k) / 2, q.y + (q.h - im.height * k) / 2); }
    };
    const pr = hole('portrait');
    if (b.face && pr) show('bnA', b.face, pr);
    // text
    const cx0 = x + (b.face ? 140 : 70) * sc, cx1 = x + (b.face ? 740 : 730) * sc, cx = (cx0 + cx1) / 2;
    const title = this.T('bnTitle', b.title, cx, y + 52 * sc, { size: 40 * sc, bold: true, color: tcol, origin: [0.5, 0.5], stroke: 6, depth: 6 });
    title.setAlpha(alpha).setShadow(0, 3, '#000', 6, true, true);
    const maxW = cx1 - cx0; if (title.width > maxW) title.setFontSize(Math.floor(title.style.fontSize.replace('px', '') * maxW / title.width));
    this.T('bnSub', b.sub || '', cx, y + 98 * sc, { size: 17 * sc, color: '#dfe9ff', origin: [0.5, 0.5], stroke: 4, depth: 6 }).setAlpha(alpha);
  }

  fillBar(g, q, f, c) {
    const w = q.w * Phaser.Math.Clamp(f, 0, 1);
    g.fillStyle(c).fillRect(q.x, q.y, w, q.h);
    g.fillStyle(0xffffff, 0.2).fillRect(q.x, q.y, w, q.h * 0.35);
  }

  portrait(id, ref, q) {
    let im = this.pimg[id];
    if (!im || im.key !== ref) { im?.img.destroy(); im = this.pimg[id] = { key: ref, img: this.add.image(0, 0, ref).setOrigin(0, 0).setDepth(2) }; }
    // crop the face region of the 1122x1402 reference to the hole's aspect, then scale to fill it
    const cw = 400, ch = Math.min(420, cw * q.h / q.w), k = q.w / cw;
    im.img.setVisible(true).setCrop(360, 10, cw, ch).setScale(k).setPosition(q.x - 360 * k, q.y - 10 * k);
  }

  // base values in white; when items / buffs add (or a debuff takes away) the difference is shown right beside it in green (red)
  statsBlock(id, q, f, mine, cols = 2) {
    const B = f.baseStats(), rows = [['VIDA', B.hp, f.maxHp], [f.isRage ? 'IRA' : 'MANA', f.isRage ? 100 : B.mana, f.isRage ? 100 : f.maxMana], ['ATQ FIS', B.atk, f.atk], ['PODER IA', B.ap, f.ap],
      ['ARMADURA', B.armor, f.armor], ['RES. IA', B.mr, f.mr], ['VELOCIDAD', B.speed, f.speed], ['RANGO', f.def.stats.range, f.def.stats.range]];
    const lh = cols === 1 ? q.h / 11 : q.h / 6.4, fs = Math.min(lh * 0.62, q.w / (cols === 1 ? 17 : 22)), pad = q.w * 0.04, colW = (q.w - pad * 2) / cols;
    this.T(id + 'h1', mine ? `${f.def.name.toUpperCase()} · ${(CLASSES[f.def.cls]?.label || f.def.name)}` : (CLASSES[f.def.cls]?.label || f.def.name), q.x + pad, q.y + lh * 0.15, { size: fs * 1.05, bold: true, stroke: 2 });
    this.T(id + 'h2', mine ? `NIVEL ${f.level}/${MAX_LEVEL} · XP ${f.level >= MAX_LEVEL ? 'MAX' : `${Math.floor(f.xp)}/${f.xpNeed}`}` : `NIVEL ${f.level}/${MAX_LEVEL} · ${Math.ceil(f.hp)}/${Math.ceil(f.maxHp)} HP`,
      q.x + pad, q.y + lh * 1.15, { size: fs, color: mine && f.points > 0 ? '#7dff9a' : '#ffe066', stroke: 2 });
    rows.forEach(([n, base, now], i) => {
      const x = q.x + pad + (cols === 1 ? 0 : (i % 2) * colW), y = q.y + lh * (cols === 1 ? 2.1 + i : 2.2 + (i >> 1)), nx = x + (cols === 1 ? q.w * 0.4 : colW * 0.5), d = now - base;
      this.T(`${id}n${i}`, n, x, y, { size: fs * 0.85, color: '#8aa0c8', stroke: 2 });
      const tv = this.T(`${id}v${i}`, `${Math.round(base)}`, nx, y - fs * 0.05, { size: fs, color: '#ffffff', bold: true, stroke: 2 });
      if (Math.abs(d) >= 0.5) this.T(`${id}b${i}`, `${d > 0 ? '+' : '-'}${Math.abs(Math.round(d))}`, nx + tv.width + fs * 0.4, y - fs * 0.05, { size: fs, color: d > 0 ? '#5dff8a' : '#ff6a6a', bold: true, stroke: 2 });
    });
  }

  // death recap: the killer (big) with the abilities that hit you and their damage; click a helper's face to see what they did
  drawRecap(p, u, W, H) {
    const rc = p.recap, o = this.top; this.recapBtns = [];
    if (!rc?.entries?.length) return;
    if (this.recapFor !== rc) { this.recapFor = rc; this.recapSel = rc.entries[0].id; }
    const sel = rc.entries.find(e => e.id === this.recapSel) || rc.entries[0], D = 8, pw = Math.min(W - 24, 540 * u), x = (W - pw) / 2, y = 118 * u, pad = 14 * u;
    const rowH = 30 * u, rows = Math.min(sel.abilities.length, 7), hh = 96 * u, stripH = rc.entries.length > 1 ? 74 * u : 0, ph = pad * 2 + hh + 8 * u + Math.max(1, rows) * rowH + stripH + 6 * u;
    o.fillStyle(0x070b14, 0.94).fillRect(x, y, pw, ph).lineStyle(2, sel.killer ? 0xff4a4a : 0xffd23f, 0.95).strokeRect(x, y, pw, ph);
    o.fillStyle(sel.killer ? 0xff4a4a : 0xffd23f, 1).fillRect(x, y, pw, 4 * u);
    this.boxes.push({ x, y, w: pw, h: ph });
    // header card: face + name + total damage
    const fs = 84 * u, fx = x + pad, fy = y + pad + 4 * u;
    o.fillStyle(0x000000, 1).fillRect(fx - 2, fy - 2, fs + 4, fs + 4).lineStyle(3, sel.killer ? 0xff4a4a : 0xffd23f, 1).strokeRect(fx - 2, fy - 2, fs + 4, fs + 4);
    if (sel.face && this.textures.exists('face_' + sel.face)) this.iconImg('rcFace', 'face_' + sel.face, fx + fs / 2, fy + fs / 2, fs, D + 0.5); else this.T('rcFaceT', '☠', fx + fs / 2, fy + fs / 2, { size: fs * 0.6, origin: [0.5, 0.5], color: '#ff8a8a', depth: D + 1 });
    this.T('rcTag', sel.killer ? 'TE ELIMINÓ' : 'ASISTENCIA', fx + fs + 16 * u, fy, { size: 13 * u, bold: true, color: sel.killer ? '#ff8a8a' : '#ffe27a', depth: D + 1, stroke: 3 });
    this.T('rcName', sel.name.toUpperCase(), fx + fs + 16 * u, fy + 20 * u, { size: 28 * u, bold: true, color: '#ffffff', depth: D + 1, stroke: 4 });
    this.T('rcTot', `Daño total causado a ti: ${sel.total}`, fx + fs + 16 * u, fy + 58 * u, { size: 14 * u, bold: true, color: '#ffd23f', depth: D + 1, stroke: 3 });
    // abilities used and damage dealt
    const mx = Math.max(1, ...sel.abilities.map(a => a.dmg)), ry0 = y + pad + hh + 8 * u, TC = { magic: 0x4aa3ff, physical: 0xff5a4a };
    if (!sel.abilities.length) this.T('rcNone', 'Sin daño registrado en los últimos 10 s', x + pad, ry0 + 6 * u, { size: 12 * u, color: '#8aa0c8', depth: D + 1 });
    sel.abilities.slice(0, 7).forEach((a, i) => {
      const yy = ry0 + i * rowH, ic = a.icon && this.textures.exists(a.icon) ? a.icon : null;
      o.fillStyle(0x10182a, 1).fillRect(x + pad, yy, pw - pad * 2, rowH - 4 * u);
      if (ic) this.iconImg('rcI' + i, ic, x + pad + 13 * u, yy + (rowH - 4 * u) / 2, 24 * u, D + 0.5); else { o.fillStyle(0x2a3550, 1).fillRect(x + pad + 2 * u, yy + 2 * u, 22 * u, rowH - 8 * u); this.T('rcL' + i, '⚔', x + pad + 13 * u, yy + (rowH - 4 * u) / 2, { size: 14 * u, origin: [0.5, 0.5], depth: D + 1 }); }
      const bx = x + pad + 190 * u, bw = pw - pad * 2 - 190 * u - 64 * u;
      this.T('rcA' + i, a.label, x + pad + 32 * u, yy + 5 * u, { size: 12 * u, bold: true, color: '#e6f1ff', depth: D + 1, stroke: 2 });
      o.fillStyle(0x000000, 0.7).fillRect(bx, yy + 8 * u, bw, 10 * u).fillStyle(TC[a.type] || 0x9be37a, 1).fillRect(bx, yy + 8 * u, bw * a.dmg / mx, 10 * u);
      this.T('rcD' + i, `${a.dmg}`, x + pw - pad - 4 * u, yy + 5 * u, { size: 13 * u, bold: true, color: '#ffffff', origin: [1, 0], depth: D + 1, stroke: 3 });
    });
    // helpers strip: click a face to switch the info shown
    if (rc.entries.length > 1) {
      const sy = y + ph - stripH + 2 * u, sz = 46 * u;
      this.T('rcStripT', 'Clic en una cara para ver su aporte', x + pad, sy - 2 * u, { size: 10 * u, color: '#8aa0c8', depth: D + 1 });
      rc.entries.forEach((e, i) => {
        const bx = x + pad + i * (sz + 16 * u), by = sy + 14 * u, on = e.id === sel.id;
        o.fillStyle(0x000000, 1).fillRect(bx, by, sz, sz).lineStyle(on ? 3 : 2, on ? 0xffd23f : e.killer ? 0xff4a4a : 0x56688a, 1).strokeRect(bx, by, sz, sz);
        if (e.face && this.textures.exists('face_' + e.face)) this.iconImg('rcS' + i, 'face_' + e.face, bx + sz / 2, by + sz / 2, sz - 4, D + 0.5).setAlpha(on ? 1 : 0.65); else this.T('rcS' + i, '☠', bx + sz / 2, by + sz / 2, { size: sz * 0.5, origin: [0.5, 0.5], depth: D + 1 });
        this.T('rcSN' + i, `${e.killer ? '☠ ' : ''}${e.total}`, bx + sz / 2, by + sz + 1 * u, { size: 10 * u, bold: true, color: e.killer ? '#ff8a8a' : '#cfe3ff', origin: [0.5, 0], depth: D + 1, stroke: 2 });
        this.recapBtns.push({ id: e.id, x: bx, y: by, w: sz, h: sz });
      });
    }
  }

  drawAbility(A, p, a, i, x, y, size) {
    const o = this.top, d = p.def.abilities[a], rank = p.ranks[a];
    this.iconRects[i] = { x, y, s: size };
    const learned = rank > 0, cd = p.cds[a], total = learned && d.cd ? rk(d.cd, rank) : 1, onCd = learned && cd > 0 && !d.passive;
    const locked = learned && p.abilityLocked?.(a), noMana = learned && d.mana && p.mana < rk(d.mana, rank) && !A.debugFree;
    const tex = 'icon_' + d.icon, pad = size * 0.04;
    if (this.textures.exists(tex)) {
      if (!this.icons[i] || this.icons[i].texture.key !== tex) { this.icons[i]?.destroy(); this.icons[i] = this.add.image(0, 0, tex).setDepth(1.5); }
      const sil = p.silenceT > 0 && !d.passive && learned, jx = sil ? Phaser.Math.Between(-4, 4) : 0, jw = sil ? Phaser.Math.FloatBetween(0.82, 1.18) : 1;
      const im = this.icons[i].setVisible(true).setPosition(x + size / 2 + jx, y + size / 2 + (sil ? Phaser.Math.Between(-2, 2) : 0)).setDisplaySize((size - pad * 2) * jw, size - pad * 2).setAlpha(learned ? (sil ? 0.55 : 1) : 0.3);
      if (sil) {   // glitch: distorted icon + noise bars + red "no" sign
        im.setTint(Phaser.Math.Between(0, 3) === 0 ? 0x66ffaa : 0xb070ff);
        for (let n = 0; n < 5; n++) { const by = y + Phaser.Math.Between(0, size - 6); o.fillStyle(Phaser.Math.Between(0, 1) ? 0x33ff88 : 0x000000, 0.7).fillRect(x + Phaser.Math.Between(0, size / 3), by, Phaser.Math.Between(size / 4, size), Phaser.Math.Between(2, 5)); }
        const cx0 = x + size / 2, cy0 = y + size / 2, rr = size * 0.34;
        o.lineStyle(Math.max(4, size * 0.09), 0xff3b3b, 0.95).strokeCircle(cx0, cy0, rr).lineBetween(cx0 - rr * 0.7, cy0 + rr * 0.7, cx0 + rr * 0.7, cy0 - rr * 0.7);
      }
      if (onCd || locked) im.setTint(0x3a3a3a); else if (!(p.silenceT > 0 && !d.passive && learned)) im.clearTint();
    } else this.T('lab' + i, d.name.split(' ').map(w => w[0]).join(''), x + size / 2, y + size / 2, { size: size * 0.3, origin: [0.5, 0.5] });
    if (locked) { o.fillStyle(0x000000, 0.5).fillRect(x, y, size, size); this.T('lk' + i, p.bomber?.phase === 'fly' ? 'A PIE' : 'NAVE', x + size / 2, y + size / 2, { size: size * 0.2, bold: true, origin: [0.5, 0.5], color: '#9fe8ff', stroke: 4 }); }
    if (onCd) {
      // bold dark overlay + clock sweep marking the time still missing, with the seconds on top
      o.fillStyle(0x000000, 0.45).fillRect(x, y, size, size);
      o.fillStyle(0x000000, 0.55).fillPoints(sweep(x + size / 2, y + size / 2, size / 2, cd > 1e5 ? 0.0001 : Math.min(1, cd / total)), true);
      this.T('cd' + i, cd > 1e5 ? 'ACTIVA' : `${cd.toFixed(cd < 10 ? 1 : 0)}s`, x + size / 2, y + size / 2, { size: size * (cd > 1e5 ? 0.2 : 0.3), bold: true, origin: [0.5, 0.5], color: cd > 1e5 ? '#ffd23f' : '#fff', stroke: 5 });
    }
    if (noMana && !onCd) o.fillStyle(0x0033ff, 0.35).fillRect(x, y, size, size);
    if (A.aimKey === a) o.lineStyle(4, 0xffd23f).strokeRect(x, y, size, size);
    if (d.passive) this.T('pas' + i, learned ? 'PASIVA' : 'PASIVA', x + size / 2, y + size * 0.62, { size: size * 0.16, bold: true, origin: [0.5, 0.5], color: '#ffe066', stroke: 3 });
    if (p.key === 'jorbi' && a === 'p2' && learned) this.T('dashN' + i, `${p.dashCharges}/3`, x + size - size * 0.08, y + size - size * 0.2, { size: size * 0.26, bold: true, origin: [1, 0.5], color: p.dashCharges ? '#ffd23f' : '#ff8a6a', stroke: 4 });
    const kb = size * 0.3;   // key badge on the icon's top-left corner (its own text id: the item slots used 'key0..5' and overwrote it)
    o.fillStyle(0x000000, 0.8).fillRect(x, y, kb, kb).lineStyle(1, 0xffd23f, 0.9).strokeRect(x, y, kb, kb);
    this.T('abKey' + i, ['Q', 'F', 'E', 'R'][i], x + kb / 2, y + kb / 2, { size: size * 0.22, color: '#ffe066', bold: true, origin: [0.5, 0.5], stroke: 2, depth: 6 });
    for (let r = 0; r < MAX_RANK; r++) o.fillStyle(r < rank ? 0xffd23f : 0x30384a).fillRect(x + size / 2 - size * 0.22 + r * size * 0.16, y + size - size * 0.09, size * 0.13, size * 0.06);
    if (p.canSpend(a)) {   // pulsing gold "level up" button above the icon: click to upgrade
      const r = size * 0.2, cx = x + size / 2, cy = y - r - size * 0.14, pulse = 0.5 + 0.5 * Math.sin(this.time.now / 170);
      const ptr = this.input.activePointer, over = Math.hypot(ptr.x - cx, ptr.y - cy) <= r * 1.3;
      this.upRects[i] = { x: cx - r * 1.3, y: cy - r * 1.3, w: r * 2.6, h: r * 2.6 }; this.boxes.push(this.upRects[i]);   // clicks on the upgrade button must not reach the world (no attack)
      o.fillStyle(0xffd23f, 0.16 + 0.22 * pulse).fillCircle(cx, cy, r * (1.55 + 0.35 * pulse));
      o.fillStyle(0xfff3a0, 0.25 + 0.3 * pulse).fillCircle(cx, cy, r * (1.25 + 0.2 * pulse));
      o.fillStyle(0x3a2a00).fillCircle(cx, cy, r * 1.08).fillStyle(over ? 0xfff3a0 : 0xffd23f).fillCircle(cx, cy, r);
      o.fillStyle(0x4a3200).fillPoints([{ x: cx, y: cy - r * 0.68 }, { x: cx + r * 0.62, y: cy + r * 0.05 }, { x: cx + r * 0.24, y: cy + r * 0.05 }, { x: cx + r * 0.24, y: cy + r * 0.62 },
        { x: cx - r * 0.24, y: cy + r * 0.62 }, { x: cx - r * 0.24, y: cy + r * 0.05 }, { x: cx - r * 0.62, y: cy + r * 0.05 }], true);
    }
  }

  // status bar above the abilities: each active effect with its source ability, remaining seconds and (hover) description
  drawStatus(A, p, Rc, u, W) {
    const list = p.statusList(), o = this.top, g = this.tipG;
    if (!list.length) return;
    const q0 = Rc('ability0'), q3 = Rc('ability3'), sz = 46 * u, gap = 8 * u, y = q0.y - 126 * u;
    const totalW = list.length * sz + (list.length - 1) * gap, cx = (q0.x + q3.x + q3.w) / 2, x0 = cx - totalW / 2, ptr = this.input.activePointer;
    let hv = -1;
    list.forEach((e, i) => {
      const x = x0 + i * (sz + gap), col = e.bad ? 0xff5a5a : 0x5dff8a, pulse = e.t != null && e.t < 2 ? 0.5 + 0.5 * Math.sin(this.time.now / 100) : 1;
      this.boxes.push({ x, y, w: sz, h: sz });
      this.g.fillStyle(0x070b14, 0.92).fillRect(x, y, sz, sz);
      const tex = e.icon && this.textures.exists(e.icon) ? e.icon : null, key = 'st' + i;
      if (tex) { this.stImgs = this.stImgs || {}; let im = this.stImgs[key]; if (!im || im.texture.key !== tex) { im?.destroy(); im = this.stImgs[key] = this.add.image(0, 0, tex).setDepth(3.2); } im.setVisible(true).setPosition(x + sz / 2, y + sz / 2).setDisplaySize(sz - 6 * u, sz - 6 * u).setAlpha(0.35 + 0.65 * pulse); this.stUsed = this.stUsed || new Set(); this.stUsed.add(key); }
      else { o.fillStyle(e.tint, 0.55 * pulse).fillRect(x + 4 * u, y + 4 * u, sz - 8 * u, sz - 8 * u); this.T('stl' + i, e.label[0], x + sz / 2, y + sz / 2, { size: sz * 0.5, bold: true, origin: [0.5, 0.5], depth: 4 }); }
      o.lineStyle(3, col, 1).strokeRect(x, y, sz, sz);
      if (e.t != null) { o.fillStyle(0x000000, 0.7).fillRect(x, y + sz - 15 * u, sz, 15 * u); this.T('sts' + i, `${e.t >= 10 ? Math.ceil(e.t) : e.t.toFixed(1)}s`, x + sz / 2, y + sz - 7.5 * u, { size: 12 * u, bold: true, origin: [0.5, 0.5], depth: 5, stroke: 3 }); }
      if (ptr.x >= x && ptr.x <= x + sz && ptr.y >= y && ptr.y <= y + sz) hv = i;
    });
    if (hv >= 0) {   // tooltip: which ability, what it does, seconds left
      const e = list[hv], x = x0 + hv * (sz + gap), TW = 330 * u, pad = 10 * u;
      const title = this.T('stTitle', e.name, 0, 0, { size: 15 * u, bold: true, color: e.bad ? '#ff9a9a' : '#9affb0', depth: 8 });
      const sub = this.T('stSub', `${e.by ? e.by + ' · ' : ''}${e.label}${e.t != null ? ` · quedan ${e.t.toFixed(1)}s` : ''}`, 0, 0, { size: 11 * u, color: '#8aa0c8', depth: 8, stroke: 2 });
      const desc = this.T('stDesc', e.desc, 0, 0, { size: 12 * u, color: '#cfe3ff', depth: 8, stroke: 2 }); desc.setWordWrapWidth(TW - 2 * pad);
      const th = pad * 2 + title.height + sub.height + desc.height + 8 * u, bx = Phaser.Math.Clamp(x + sz / 2 - TW / 2, 8, W - TW - 8), by = y - th - 8 * u;
      g.fillStyle(0x070b14, 0.97).fillRect(bx, by, TW, th).lineStyle(2, e.bad ? 0xff5a5a : 0x5dff8a, 0.9).strokeRect(bx, by, TW, th);
      title.setPosition(bx + pad, by + pad); sub.setPosition(bx + pad, by + pad + title.height + 2 * u); desc.setPosition(bx + pad, sub.y + sub.height + 6 * u);
    }
  }

  // hover info: title, description and what each rank improves (current rank highlighted)
  drawTip(p, i, q, u, W) {
    const a = ABILITY_KEYS[i], d = p.def.abilities[a], rank = p.ranks[a], g = this.tipG;
    const TW = 360 * u, pad = 12 * u, fs = 12 * u, depth = 7, rows = [];
    Object.keys(FIELD).forEach(k => { if (Array.isArray(d[k])) rows.push([k, d[k]]); });
    if (a === 'ult') rows.push(['reqLvl', ULT_LEVELS]);
    ['range', 'radius'].forEach(k => { if (typeof d[k] === 'number') rows.push([k, d[k]]); });
    const title = this.T('tipTitle', `[${'QFER'[i]}] ${d.name}`, 0, 0, { size: 16 * u, bold: true, color: '#ffe066', depth });
    const sub = this.T('tipSub', rank ? `Nivel ${rank} de ${MAX_RANK}${a === 'ult' ? ' · mejora en nv ' + ULT_LEVELS.join(', ') : ''}` : a === 'ult' ? `Se desbloquea en el nivel ${ULT_LEVELS[0]}` : 'Sin aprender (Ctrl+' + 'QFER'[i] + ' o botón dorado)', 0, 0, { size: 11 * u, color: rank ? '#7dff9a' : '#ff9a7a', depth, stroke: 2 });
    const desc = this.T('tipDesc', d.desc, 0, 0, { size: fs, color: '#cfe3ff', depth, stroke: 2 }); desc.setWordWrapWidth(TW - 2 * pad);
    const sc = d.passive && !Array.isArray(d.dmg) ? [] : scaleRows(d, rank, { ap: p.ap, atk: p.atk, maxHp: p.maxHp });
    const rh = 18 * u, head = 20 * u, scH = sc.length ? 18 * u + sc.length * 20 * u + 6 * u : 0, th = pad + title.height + 2 * u + sub.height + 8 * u + desc.height + 10 * u + scH + head + rows.length * rh + pad;
    const x = Phaser.Math.Clamp(q.x + q.s / 2 - TW / 2, 8, W - TW - 8), y = q.y - 50 * u - th;
    g.fillStyle(0x070b14, 0.97).fillRect(x, y, TW, th).lineStyle(2, 0x3fd0ff, 0.9).strokeRect(x, y, TW, th);
    g.lineStyle(1, 0x1b4a63, 1).strokeRect(x + 4 * u, y + 4 * u, TW - 8 * u, th - 8 * u);
    g.fillStyle(0xffb020).fillRect(x, y, 14 * u, 3 * u).fillRect(x + TW - 14 * u, y + th - 3 * u, 14 * u, 3 * u);
    title.setPosition(x + pad, y + pad); sub.setPosition(x + pad, y + pad + title.height + 2 * u);
    desc.setPosition(x + pad, sub.y + sub.height + 8 * u);
    let cy = desc.y + desc.height + 10 * u;
    if (sc.length) {   // "ESCALA": [stat icon] (value now) in the color of the stat, with the formula in grey
      this.T('scH', 'ESCALA (con tus estadísticas actuales)', x + pad, cy, { size: 10 * u, color: '#8aa0c8', depth, stroke: 2 }); cy += 16 * u;
      sc.forEach((r, i) => {
        const st = rowStat(r), col = st ? statCss(st) : '#cfe3ff', ys = cy + i * 20 * u;
        const lb = this.T('scL' + i, r.label, x + pad, ys, { size: fs, color: '#ffffff', depth, stroke: 2 });
        let xx = x + pad + 130 * u;
        r.parts.forEach((pt, j) => { this.iconImg('scI' + i + '_' + j, 'stat_' + pt.stat, xx + fs * 0.6, ys + fs * 0.65, fs * 1.3, depth + 0.1); xx += fs * 1.5; });
        const v = this.T('scV' + i, `(${Math.round(r.total)})`, xx, ys, { size: fs * 1.05, bold: true, color: col, depth, stroke: 3 }); xx += v.width + 8 * u;
        const f = r.parts.length ? `${Math.round(r.base)} + ` + r.parts.map(pt => `${pct(pt.k)} ${STAT_STYLE[pt.stat].label}`).join(' + ') : '';
        if (f) this.T('scF' + i, f, xx, ys + 1 * u, { size: 10 * u, color: '#8aa0c8', depth, stroke: 2 });
      });
      cy += sc.length * 20 * u + 6 * u;
    }
    const c0 = x + pad + 170 * u, cw = 52 * u;
    this.T('tipH', 'NIVEL', x + pad, cy, { size: 10 * u, color: '#8aa0c8', depth, stroke: 2 });
    for (let r = 0; r < MAX_RANK; r++) this.T('tipHr' + r, `${r + 1}`, c0 + r * cw, cy, { size: 11 * u, bold: true, color: rank === r + 1 ? '#ffd23f' : '#8aa0c8', depth, stroke: 2, origin: [0.5, 0] });
    g.lineStyle(1, 0x3fd0ff, 0.5).lineBetween(x + pad, cy + head - 4 * u, x + TW - pad, cy + head - 4 * u);
    cy += head;
    rows.forEach(([k, v], n) => {
      const y2 = cy + n * rh;
      if (Array.isArray(v)) {
        this.T('tipL' + n, FIELD[k][0], x + pad, y2, { size: fs, depth, stroke: 2 });
        v.forEach((val, r) => this.T(`tipV${n}_${r}`, fmt(k, val), c0 + r * cw, y2, { size: fs, bold: rank === r + 1, color: rank === r + 1 ? '#ffd23f' : '#cfe3ff', depth, stroke: 2, origin: [0.5, 0] }));
      } else {
        this.T('tipL' + n, k === 'range' ? 'Alcance' : 'Radio de efecto', x + pad, y2, { size: fs, depth, stroke: 2 });
        this.T(`tipV${n}_0`, `${v}`, c0, y2, { size: fs, color: '#cfe3ff', depth, stroke: 2, origin: [0.5, 0] });
      }
    });
  }

  drawMinimap(A, g, o, q) {
    const fx = q.w / WORLD_W, fy = q.h / WORLD_H;     // stretched to fill the hole
    g.fillStyle(0x7d8226).fillRect(q.x, q.y, q.w, q.h);
    const dirt = 0x8c6a2c;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) if (walk[j * GW + i]) g.fillStyle(dirt).fillRect(q.x + i * CELL * fx, q.y + j * CELL * fy, CELL * fx + 0.6, CELL * fy + 0.6);
    (A.camps?.length ? A.camps : CAMPS.map(([x, y]) => ({ x, y, owner: null, prog: [0, 0] }))).forEach(c => { const col = c.owner === 0 ? 0x4aa3ff : c.owner === 1 ? 0xff4a3a : 0x8a6238; g.fillStyle(col).fillCircle(q.x + c.x * fx, q.y + c.y * fy, 5); g.lineStyle(1, 0xffffff, 0.8).strokeCircle(q.x + c.x * fx, q.y + c.y * fy, 5); });
    g.fillStyle(0x3b82f6, 0.45).fillRect(q.x, q.y + 600 * fy, 340 * fx, 312 * fy);
    g.fillStyle(0xef4444, 0.45).fillRect(q.x + q.w - 340 * fx, q.y + 600 * fy, 340 * fx, 312 * fy);
    if (A.fog) { if (!this.fogImg || !this.fogImg.scene) this.fogImg = this.add.image(0, 0, 'fogmask').setOrigin(0, 0).setDepth(1.6); this.fogImg.setPosition(q.x, q.y).setDisplaySize(q.w, q.h).setVisible(true); } else this.fogImg?.setVisible(false);
    A.fighters.forEach(ft => {
      if ((!ft.alive && !ft.isNexus) || ft.hiddenFor(A.player)) return;
      const me = A.player, cx = q.x + ft.x * fx, cy = q.y + ft.y * fy;
      g.fillStyle(ft.isNexus && !ft.alive ? 0x444444 : ft === me ? 0x3ddc84 : ft.team === me.baseTeam ? 0x3b82f6 : 0xff3b3b);
      if (ft.isNexus) g.fillRect(cx - 6, cy - 6, 12, 12); else if (ft.isTower) g.fillRect(cx - 4, cy - 4, 8, 8); else g.fillCircle(cx, cy, ft.isBot || ft.isMinion ? 2.5 : 5);
      if (ft === A.selected) o.lineStyle(2, 0xffffff).strokeCircle(cx, cy, 8);
    });
    const v = A.cameras.main.worldView;
    o.lineStyle(1, 0xffffff, 0.9).strokeRect(q.x + v.x * fx, q.y + Math.max(0, v.y) * fy, v.width * fx, Math.min(v.height, WORLD_H) * fy);
  }
}
