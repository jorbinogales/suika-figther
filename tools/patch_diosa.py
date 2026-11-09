import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
def rep(s, old, new, cnt=1):
    assert old in s, old[:90]
    return s.replace(old, new, cnt)

# ================= data.js
p = ROOT / 'src/data.js'; s = p.read_text(encoding='utf8')
s = rep(s, "// small helper\nexport const rk", """// Diosa Canales — asesina / escaramuzadora de daño físico. Resource = "Farándula" (the mana bar: starts empty, fills by fighting, no mana costs).
// Passive Rompiendo el Tabú; Q Pose de portada (dash, recast = backflip + kisses), W Tumbando la Zona (charm those who look at her), E Tacón de aguja (back-hit execute), R Show principal.
CHAMPIONS.diosa = {
  name: 'Diosa Canales', cls: 'hacker', ref: 'ref_diosa', height: 120, farandula: true,
  passive: { name: 'Rompiendo el Tabú', icon: 'diosa_passive',
    desc: 'Cada vez que lanza una habilidad gana un 15 % de velocidad de movimiento durante 3 s, y sus ataques básicos causan daño verdadero adicional por cada campeón enemigo que la está mirando. Con la Farándula al máximo, su siguiente ataque básico es un golpe crítico garantizado y reduce un 20 % la armadura del objetivo.',
    speed: 0.15, speedTime: 3, lookRange: 900, lookDmg: 7, lookMax: 5, crit: 1.8, shred: 0.2, shredTime: 3 },
  stats: { hp: 590, mana: 100, atk: 54, ap: 18, armor: 24, mr: 20, speed: 150, run: 236, range: 90, atkCd: 0.7 },
  grow: { hp: 0.07, atk: 0.055, ap: 0.03 },
  basic: { kind: 'melee', base: 15, atkScale: 1.0, type: 'physical', reach: 92, windup: 0.18, dur: 0.38, vfx: 'punch' },
  abilities: {
    p1: { name: 'Pose de portada', icon: 'diosa_p1', cd: [11, 10, 9], mana: [0, 0, 0], windup: 0.05, dur: 0.4,
          desc: 'Avanza rápidamente en una dirección y causa daño físico a todos los enemigos que atraviesa. Si golpea a un campeón puede volver a pulsarla durante 3 s para dar una voltereta hacia atrás lanzando una ráfaga de besos que causa daño de IA (y activa los efectos de impacto).',
          dmg: [50, 85, 120], atkScale: 0.7, dist: 300, width: 56, recast: 3, recastCd: 0.4, kissDmg: [45, 75, 105], kissAp: 0.5, back: 200, kissRange: 420 },
    p2: { name: 'Tumbando la zona', icon: 'diosa_p2', cd: [18, 17, 16], mana: [0, 0, 0], windup: 0.15, dur: 0.7,
          desc: 'Ejecuta un baile provocativo a su alrededor. Los campeones enemigos que la miren quedan ENCANTADOS 1.25 s y caminan indefensos hacia ella; los que estén de espaldas solo se ralentizan un 50 %. Por cada campeón afectado gana un escudo temporal.',
          radius: 300, charm: [1.25, 1.4, 1.55], slow: 0.5, slowTime: 2, shield: [60, 85, 110], shieldTime: 4 },
    p3: { name: 'Tacón de aguja', icon: 'diosa_p3', cd: [9, 8, 7], mana: [0, 0, 0], windup: 0.18, dur: 0.45,
          desc: 'Da una poderosa estocada con su tacón. De frente causa daño y ralentiza gravemente (60 %). Si golpea por la espalda, causa además daño según la vida que le falta al objetivo: una ejecución.',
          dmg: [60, 95, 130], atkScale: 0.8, reach: 165, width: 60, slow: 0.6, slowTime: 2, backPct: [0.25, 0.3, 0.35] },
    ult: { name: 'Show principal', icon: 'diosa_ult', cd: [100, 90, 80], mana: [0, 0, 0], windup: 0.1, dur: 1.0,
           desc: 'Se vuelve invisible e invulnerable 1 s mientras se eleva en un escenario de luces, y se limpia de cualquier control de masas. Al caer explota en flashes de cámaras: ciega a los enemigos cercanos 1.5 s, llena su Farándula y durante 8 s sus habilidades se recargan el doble de rápido.',
           radius: 450, blind: 1.5, cdrTime: 8 },
  },
};

// small helper
export const rk""")
s = rep(s, "    case 'xeviche:ult': return { type: 'line', range: a.length, width: a.spread * 2 + a.beamW, color: 0xffd23f };   // the three lasers side by side",
"""    case 'xeviche:ult': return { type: 'line', range: a.length, width: a.spread * 2 + a.beamW, color: 0xffd23f };   // the three lasers side by side
    case 'diosa:p1': return { type: 'line', range: a.dist, width: a.width, color: 0xff4fa3 };
    case 'diosa:p3': return { type: 'line', range: a.reach, width: a.width, color: 0xff9ad0 };""")
p.write_text(s, encoding='utf8')

# ================= fighter.js
p = ROOT / 'src/fighter.js'; s = p.read_text(encoding='utf8')
# respawn: Farándula starts empty; reset states
s = rep(s, "    this.mana = this.maxMana;\n    this.alive = true;", "    this.mana = this.def.farandula ? 0 : this.maxMana;\n    this.alive = true;")
s = rep(s, "    this.drT = 0; this.sShield = null;", "    this.qRe = null; this.cdrT = 0; this.invulT = 0; this.drT = 0; this.sShield = null;")
# timers
s = rep(s, "    if (this.drT > 0) this.drT -= dt;", """    if (this.invulT > 0) this.invulT -= dt;
    if (this.cdrT > 0) { this.cdrT -= dt; for (const k of ['p1', 'p2', 'p3']) if (this.cds[k] > 0) this.cds[k] = Math.max(0, this.cds[k] - dt); }   // Show principal: abilities recharge twice as fast
    if (this.qRe && (this.qRe.t -= dt) <= 0) { this.qRe = null; this.cds.p1 = Math.max(this.cds.p1, rk(this.def.abilities.p1.cd, this.ranks.p1 || 1)); }   // the recast window closed: the full cooldown starts
    if (this.drT > 0) this.drT -= dt;""")
# no CC while invulnerable
s = rep(s, "    if (this.sShield && this.w.sShieldBlock(this, 0)) return;\n", "    if (this.invulT > 0) return;\n    if (this.sShield && this.w.sShieldBlock(this, 0)) return;\n")
s = rep(s, "    if (this.sShield && this.w.sShieldBlock(this, 0)) return; this.slows.push({ pct, t });", "    if (this.invulT > 0) return;\n    if (this.sShield && this.w.sShieldBlock(this, 0)) return; this.slows.push({ pct, t });")
# status chips
s = rep(s, "    if (this.sb) add('sb',", """    if (this.invulT > 0) add('invul2', 'Invulnerable', this.invulT, false, 'Ningún daño ni control de masas te afecta.', { tint: 0xffd23f });
    if (this.cdrT > 0) add('cdr', 'Show principal', this.cdrT, false, 'Tus habilidades se recargan el doble de rápido.', { tint: 0xff4fa3 });
    if (this.qRe) add('qre', 'Pose de portada', this.qRe.t, false, 'Pulsa Q otra vez: voltereta hacia atrás y ráfaga de besos.', { tint: 0xff4fa3 });
    if (this.sb) add('sb',""")
# dispatch
s = rep(s, "      case 'maduro:p1': case 'maduro:p2':", "      case 'diosa:p1': case 'diosa:p2': case 'diosa:p3': case 'diosa:ult': this.fireDiosa(k, a, rank); break;\n      case 'maduro:p1': case 'maduro:p2':")
s = rep(s, "  // ---- Maduro ----", """  // ---- Diosa Canales ----
  lookedAtBy(t) { const dx = this.x - t.x, dy = this.y - t.y, d = Math.hypot(dx, dy) || 1; return (t.ax * dx + t.ay * dy) / d > 0.25; }   // t is facing her
  fireDiosa(k, a, rank) {
    const w = this.w, P = this.def.passive, byDist = (p, q) => Math.hypot(p.x - this.x, p.y - this.y) - Math.hypot(q.x - this.x, q.y - this.y);
    this.speedBoost = Math.max(this.speedT > 0 ? this.speedBoost : 0, P.speed); this.speedT = Math.max(this.speedT, P.speedTime);   // passive: every ability gives speed
    if (k === 'p1' && this.qRe) {   // recast: backflip + a volley of kisses (AI damage, on-hit effects)
      this.qRe = null; this.cds.p1 = rk(a.cd, rank);
      const dmg = rk(a.kissDmg, rank) + this.ap * a.kissAp, ang0 = Math.atan2(this.ay, this.ax);
      this.state = 'cast'; this.anim = 'power1'; this.stateT = 0; this.stateDur = 0.4; this.fired = true; this.dashV = { x: -this.ax * a.back / 0.3, y: -this.ay * a.back / 0.3 };
      [-0.22, 0, 0.22].forEach((o, i) => w.after(i * 0.06, () => { if (this.alive) w.projectile(this, { ang: o, range: a.kissRange, speed: 780, dmg, type: 'magic', vfx: 'magic_missile', scale: 1.8, tint: 0xff4fa3, r: 20 }); }));
      w.float(this.x, this.y - this.def.height - 30, '¡Muac!', '#ff9ad0');
      return;
    }
    if (k === 'p1') {   // dash through enemies
      const dmg = rk(a.dmg, rank) + this.atk * a.atkScale, dur = 0.22, pts = [{ x: this.x, y: this.y }, { x: this.x + this.ax * a.dist, y: this.y + this.ay * a.dist }];
      this.state = 'cast'; this.anim = 'power1'; this.stateT = 0; this.stateDur = dur + 0.1; this.fired = true; this.dashV = { x: this.ax * a.dist / dur, y: this.ay * a.dist / dur };
      let champ = false;
      w.enemiesOf(this).filter(t => w.nearPath(pts, t.x, t.y, a.width / 2 + BODY_R * 0.6)).forEach(t => { w.damage(this, t, dmg, 'physical'); w.vfx('spark', t.x, t.cy, { scale: 3, tint: 0xff4fa3 }); if (t.isChamp) champ = true; });
      for (let i = 0; i < 5; i++) w.vfx('spark', this.x + this.ax * a.dist * i / 5, this.y - 20, { scale: 1.8, tint: 0xff9ad0 });
      if (champ) { this.qRe = { t: a.recast }; this.cds.p1 = a.recastCd; }
    } else if (k === 'p2') {   // dance: charm the ones who look at her, slow the ones turned away
      const sh = rk(a.shield, rank); let n = 0;
      w.vfx('shockwave', this.x, this.y - 6, { scale: a.radius / 40, below: true, tint: 0xff4fa3 }); w.vfx('buff', this.x, this.cy, { scale: 3, tint: 0xff9ad0 });
      w.float(this.x, this.y - this.def.height - 34, 'Mírame bien, que no me repito.', '#ff9ad0');
      w.enemiesNear(this.team, this.x, this.y, a.radius).filter(t => t.isChamp).forEach(t => {
        if (this.lookedAtBy(t)) t.lureTo(this, rk(a.charm, rank)); else t.slow(a.slow, a.slowTime);
        n++; w.vfx('heal', t.x, t.cy - 20, { scale: 1.8, tint: 0xff4fa3 });
      });
      if (n) { this.shieldHp += sh * n; this.shieldT = Math.max(this.shieldT, a.shieldTime); w.vfx('shield', this.x, this.cy, { scale: 2.6, tint: 0xff9ad0, alpha: 0.7 }); }
    } else if (k === 'p3') {   // stiletto: front = slow, back = execute (missing health)
      const dmg = rk(a.dmg, rank) + this.atk * a.atkScale, pts = [{ x: this.x, y: this.y }, { x: this.x + this.ax * a.reach, y: this.y + this.ay * a.reach }];
      const t = w.enemiesOf(this).filter(q => w.nearPath(pts, q.x, q.y, a.width / 2 + BODY_R * 0.6)).sort(byDist)[0];
      w.vfx('punch', this.x + this.ax * a.reach * 0.7, this.y - 24, { scale: 3, tint: 0xff4fa3 });
      if (t) {
        const dx = t.x - this.x, dy = t.y - this.y, d = Math.hypot(dx, dy) || 1, behind = (t.ax * dx + t.ay * dy) / d > 0.3;   // his back is toward her
        w.damage(this, t, dmg, 'physical');
        if (behind) { w.damage(this, t, (t.maxHp - t.hp) * rk(a.backPct, rank), 'physical', true); w.float(t.x, t.y - t.def.height - 40, '¡POR LA ESPALDA!', '#ff4fa3'); w.vfx('shockwave', t.x, t.y - 6, { scale: 3, below: true, tint: 0xff4fa3 }); }
        else t.slow(a.slow, a.slowTime);
      }
    } else {   // R: invisible + invulnerable on a stage of lights, then a flash of cameras
      this.stunT = 0; this.silenceT = 0; this.rootT = 0; this.slows = []; this.poisons = []; this.blindT = 0; this.charmT = 0; this.lure = null;   // cleanse every control effect
      this.invulT = 1.0; this.invis = { t: 1.0, trail: 0.15 };
      w.vfx('summon', this.x, this.y - 10, { scale: 4 }); w.vfx('levelup', this.x, this.y - 10, { scale: 5 }); w.float(this.x, this.y - this.def.height - 34, '¡Se prendió la farándula!', '#ffe27a');
      w.after(1.0, () => {
        if (!this.alive) return; this.breakInvis?.(); this.invulT = 0;
        w.vfx('shockwave', this.x, this.y - 6, { scale: a.radius / 25, below: true, tint: 0xffffff }); w.vfx('levelup', this.x, this.y, { scale: 8, tint: 0xffffff });
        w.enemiesNear(this.team, this.x, this.y, a.radius).filter(t => t.isChamp).forEach(t => { t.blindT = Math.max(t.blindT, a.blind); });
        this.mana = this.maxMana; this.cdrT = a.cdrTime;
      });
    }
  }

  // ---- Maduro ----""")
p.write_text(s, encoding='utf8')

# ================= world.js: Farándula, passive looks / crit, invulnerability
p = ROOT / 'src/world.js'; s = p.read_text(encoding='utf8')
s = rep(s, "    if (!target.alive) return 0;\n", "    if (!target.alive) return 0;\n    if (target.invulT > 0) return 0;   // Show principal: invulnerable\n", 1)
s = rep(s, "    let dmg = Math.max(1, raw * 100 / (100 + resist));\n", """    let dmg = Math.max(1, raw * 100 / (100 + resist));
    {   // Diosa Canales: Farándula (the bar fills by fighting) and the passive of her basic attacks
      const so = src?.owner || src;
      if (so?.key === 'diosa' && target !== so && target.team !== so.team && !dot) {
        const P = so.def.passive; so.mana = Math.min(so.maxMana, so.mana + so.maxMana * (target.isChamp ? 0.05 : 0.02));
        if (this.basicDmg) {
          if (so.mana >= so.maxMana - 0.01 && target.isChamp) { dmg *= P.crit; so.mana = 0; target.armorShred = P.shred; target.armorShredT = P.shredTime; this.float(target.x, target.y - target.def.height - 40, '¡CRÍTICO!', '#ff4fa3'); }
          const lookers = this.fighters.filter(c => c.isChamp && c.alive && c.team !== so.team && Math.hypot(c.x - so.x, c.y - so.y) <= P.lookRange && so.lookedAtBy(c)).length;
          if (lookers) dmg += Math.min(lookers, P.lookMax) * P.lookDmg;   // true damage: it ignores the armour above
        }
      }
      if (target.key === 'diosa' && src && src.team !== target.team && !dot) target.mana = Math.min(target.maxMana, target.mana + target.maxMana * 0.03);
    }
""")
p.write_text(s, encoding='utf8')

# ================= world.js beginAim: instant casts; ai; recommend; menu; hud
s = (ROOT / 'src/world.js').read_text(encoding='utf8')
s = rep(s, "|| (p.key === 'maduro' && (a === 'p2' || a === 'ult'))) { p.tryCast(a); return; }", "|| (p.key === 'maduro' && (a === 'p2' || a === 'ult')) || (p.key === 'diosa' && (a === 'p2' || a === 'ult' || (a === 'p1' && p.qRe)))) { p.tryCast(a); return; }")
s = rep(s, "    this.load.image('ref_maduro', 'assets/ref_maduro.png');", "    this.load.image('ref_maduro', 'assets/ref_maduro.png');\n    this.load.image('ref_diosa', 'assets/ref_diosa.png');")
(ROOT / 'src/world.js').write_text(s, encoding='utf8')

p = ROOT / 'src/ai.js'; s = p.read_text(encoding='utf8')
s = rep(s, "  'maduro:p1':", "  'diosa:p1': (f, c) => f.qRe ? c.target && c.d < 360 : c.target && c.d > 120 && c.d < 300,\n  'diosa:p2': (f, c) => c.champNear(280) >= 1,\n  'diosa:p3': (f, c) => c.target && c.d < 170,\n  'diosa:ult': (f, c) => (c.hpR < 0.4 && c.enemiesNear(500) >= 1) || c.champNear(450) >= 2,\n  'maduro:p1':")
p.write_text(s, encoding='utf8')

p = ROOT / 'src/recommend.js'; s = p.read_text(encoding='utf8')
s = rep(s, "  maduro:   { role:", "  diosa:    { role: 'Asesino',   dmg: 'ad',  melee: true,  cc: ['encanto', 'ralentización'] },\n  maduro:   { role:")
s = rep(s, "  maduro:   ['nucleo_ia',", "  diosa:    ['punio_acero', 'garras_vampiricas', 'ransomware', 'botas_hipersonicas', 'chaleco_antibalas', 'filtro_spam'],\n  maduro:   ['nucleo_ia',")
p.write_text(s, encoding='utf8')

p = ROOT / 'src/menu.js'; s = p.read_text(encoding='utf8')
s = rep(s, "'junior', 'maduro'];", "'junior', 'maduro', 'diosa'];")
p.write_text(s, encoding='utf8')

# hud: the mana bar is "Farándula" for her (pink, in %)
p = ROOT / 'src/hud.js'; s = p.read_text(encoding='utf8')
s = rep(s, "if (p.def.charge) this.fillBar(g, mp, p.charge / 100, 0x4fe0c0);", "if (p.def.farandula) this.fillBar(g, mp, p.mana / Math.max(1, p.maxMana), 0xff4fa3); else if (p.def.charge) this.fillBar(g, mp, p.charge / 100, 0x4fe0c0);")
s = rep(s, "this.T('mpTxt', p.def.charge ?", "this.T('mpTxt', p.def.farandula ? `FARÁNDULA ${Math.floor(p.mana / Math.max(1, p.maxMana) * 100)}%` : p.def.charge ?")
p.write_text(s, encoding='utf8')

# netgame: nothing extra (mana is already replicated)
print('ok')
