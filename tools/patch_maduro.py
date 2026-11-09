import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
def rep(s, old, new, cnt=1):
    assert old in s, old[:90]
    return s.replace(old, new, cnt)

# ================= data.js
p = ROOT / 'src/data.js'; s = p.read_text(encoding='utf8')
s = rep(s, "// small helper\nexport const rk", """// Maduro — soporte (ranged, magic). Passive: Devaluación. Q megaphone decree line (silence), F bodyguards (-20% damage + push), E empty supply box (area: enemies / allies), R = Súper Bigote (15 s):
// his Q / F / E become Iron Fist (dash punch + stun), Anti-imperialist Shield (blocks the first hit or CC) and Iron Hand (grab + armour shred); basic attacks become punches. `sb` holds the transformed kit.
CHAMPIONS.maduro = {
  name: 'Maduro', cls: 'soporte', ref: 'ref_maduro', height: 122,
  passive: { name: 'Devaluación', icon: 'maduro_passive',
    desc: 'Cada vez que Maduro daña a un campeón enemigo, durante unos segundos le roba un 5 % del oro que gana (por cualquier vía). Los súbditos aliados de Maduro cercanos dan a los rivales un 10 % menos de oro al morir. Por cada 1000 de oro robado Maduro gana 80 de escudo permanente.',
    steal: 0.05, mark: 4, minion: 0.1, per: 1000, shield: 80 },
  stats: { hp: 640, mana: 320, atk: 40, ap: 32, armor: 28, mr: 24, speed: 134, run: 214, range: 380, atkCd: 0.8 },
  grow: { hp: 0.07, atk: 0.04, ap: 0.06 },
  basic: { kind: 'projectile', base: 12, apScale: 0.55, type: 'magic', speed: 580, vfx: 'magic_missile', obj: 'decree_scroll', scale: 0.12, windup: 0.22, dur: 0.42 },
  abilities: {
    p1: { name: 'Decreto presidencial', icon: 'maduro_p1', cd: [10, 9, 8], mana: [60, 65, 70], windup: 0.3, dur: 0.6,
          desc: 'Lanza un discurso por un megáfono gigante en línea recta. Los enemigos golpeados reciben daño mágico y quedan SILENCIADOS 1.5 s (no hay réplica). Si golpea a más de un campeón, el segundo queda además RALENTIZADO un 40 %.',
          dmg: [60, 100, 140], apScale: 0.6, length: 640, width: 84, silence: 1.5, slowPct: 0.4, slowTime: 2 },
    p2: { name: 'Colectivo protector', icon: 'maduro_p2', cd: [16, 15, 14], mana: [50, 55, 60], windup: 0.1, dur: 0.5,
          desc: 'Invoca un escudo de escoltas a su alrededor: recibe un 20 % menos de daño durante 3 s. Al activarse causa daño físico a los enemigos cuerpo a cuerpo cercanos y los empuja hacia atrás.',
          dr: [0.2, 0.22, 0.25], time: [3, 3.5, 4], radius: 170, dmg: [40, 70, 100], atkScale: 0.5, push: 120 },
    p3: { name: 'La cesta básica', icon: 'maduro_p3', cd: [14, 13, 12], mana: [60, 65, 70], windup: 0.25, dur: 0.6,
          desc: 'Lanza una caja de recursos vacía a una zona. Los enemigos dentro sufren DESABASTECIMIENTO 4 s: -30 % de velocidad de ataque y de curación. Los aliados dentro ganan una gran velocidad de movimiento 3 s, pero pagan con un 5 % de su vida máxima (lealtad).',
          range: 520, radius: 130, time: [4, 4.5, 5], aspd: 0.3, heal: 0.3, ally: [0.35, 0.4, 0.45], allyTime: 3, drain: 0.05 },
    ult: { name: '¡Aparición de Súper Bigote!', icon: 'maduro_ult', cd: [100, 90, 80], mana: [100, 100, 100], windup: 0.5, dur: 0.9,
           desc: 'Se transforma en el superhéroe Súper Bigote durante 15 s. Una onda de choque global RALENTIZA a todos los enemigos del mapa un 20 % durante 2 s. Mientras dura gana un 30 % de velocidad, armadura extra y su Q, F y E se vuelven ofensivas: Puño de hierro, Escudo antimperialista y Mano de hierro. Sus ataques básicos pasan a ser puñetazos.',
           time: 15, slow: 0.2, slowTime: 2, speed: 0.3, armor: [30, 45, 60], mr: [15, 25, 35] },
  },
  sb: {
    basic: { kind: 'melee', base: 22, atkScale: 1.0, type: 'physical', reach: 100, windup: 0.2, dur: 0.42, vfx: 'punch' },
    abilities: {
      p1: { name: 'Puño de hierro', icon: 'maduro_p1_sb', cd: [8, 7, 6], mana: [60, 65, 70], windup: 0.1, dur: 0.5,
            desc: 'Súper Bigote vuela una corta distancia hacia delante y asesta un puñetazo devastador en el suelo. El primer campeón enemigo golpeado recibe daño físico masivo y queda ATURDIDO 1.5 s; los enemigos alrededor del impacto reciben daño colateral.',
            dmg: [90, 140, 190], atkScale: 1.1, dist: 260, stun: 1.5, splash: 0.5, radius: 130 },
      p2: { name: 'Escudo antimperialista', icon: 'maduro_p2_sb', cd: [14, 13, 12], mana: [50, 55, 60], windup: 0.1, dur: 0.4,
            desc: 'Crea un escudo de energía electromagnética que bloquea el primer ataque, proyectil o control de masas que lo golpee. Al bloquear, el escudo estalla y causa daño mágico a los enemigos cercanos según lo bloqueado.',
            time: [4, 4.5, 5], radius: 190, burst: 0.8, base: 60 },
      p3: { name: 'Mano de hierro', icon: 'maduro_p3_sb', cd: [12, 11, 10], mana: [60, 65, 70], windup: 0.2, dur: 0.5,
            desc: 'Estira su mano biónica hacia delante. Si atrapa a un enemigo lo ARRASTRA hacia él y le reduce la armadura un 25 % durante 3 s.',
            dmg: [60, 90, 120], atkScale: 0.7, range: 480, width: 64, shred: 0.25, shredTime: 3 },
    },
  },
};
export const maduroSB = def => ({ ...def, ref: 'ref_superbigote', basic: def.sb.basic, abilities: { ...def.abilities, ...def.sb.abilities } });

// small helper
export const rk""")
s = rep(s, "  const a = CHAMPIONS[champ].abilities[key];\n  switch (champ + ':' + key) {", "  const a = (f?.def?.abilities || CHAMPIONS[champ].abilities)[key];\n  switch (champ + ':' + key) {")
s = rep(s, "    case 'xeviche:ult': return { type: 'line', range: a.length, width: a.spread * 2 + a.beamW, color: 0xffd23f };   // the three lasers side by side",
"""    case 'xeviche:ult': return { type: 'line', range: a.length, width: a.spread * 2 + a.beamW, color: 0xffd23f };   // the three lasers side by side
    case 'maduro:p1': return f?.sb ? { type: 'line', range: a.dist + 60, width: 70, color: 0xff4a3a } : { type: 'line', range: a.length, width: a.width, color: 0xffd23f };
    case 'maduro:p3': return f?.sb ? { type: 'line', range: a.range, width: a.width, color: 0xc0c8d8 } : { type: 'zone', max: a.range, radius: a.radius, color: 0xffd23f };""")
p.write_text(s, encoding='utf8')

# ================= fighter.js
p = ROOT / 'src/fighter.js'; s = p.read_text(encoding='utf8')
s = rep(s, "import { COMBOS, LUNGES,", "import { maduroSB, COMBOS, LUNGES,")
s = rep(s, "    this.def = CHAMPIONS[key] || BOT_DEFS[key] || UNIT_DEFS[key];", "    this.def = CHAMPIONS[key] || BOT_DEFS[key] || UNIT_DEFS[key];\n    if (key === 'maduro') { this.defN = this.def; this.defSB = maduroSB(this.def); }   // normal / Súper Bigote kits (the transformation swaps this.def)")
s = rep(s, "  get armor() { return (this.def.stats.armor + this.it.armor)", "  get armor() { return (this.sb ? this.sb.armor : 0) + (this.armorShredT > 0 ? 1 - this.armorShred : 1) * (this.def.stats.armor + this.it.armor)")
s = rep(s, "  get mr() { return (this.def.stats.mr + this.it.mr)", "  get mr() { return (this.sb ? this.sb.mr : 0) + (this.def.stats.mr + this.it.mr)")
s = rep(s, "    this.hen = false; this.rage = 0; this.pkBuffs = {}; this.protein = null; this.pullTo = null; this.bike = null; this.ride = null;",
 "    this.hen = false; this.rage = 0; this.pkBuffs = {}; this.protein = null; this.pullTo = null; this.bike = null; this.ride = null;\n    this.drT = 0; this.sShield = null; this.atkSlowT = 0; this.armorShredT = 0; this.devalT = 0; this.shove = null; this.pullMe = null; if (this.sb) this.setSB(0);")
s = rep(s, "    if (this.silenceT > 0) this.silenceT -= dt;\n", """    if (this.silenceT > 0) this.silenceT -= dt;
    if (this.drT > 0) this.drT -= dt; if (this.armorShredT > 0) this.armorShredT -= dt;
    if (this.sShield && (this.sShield.t -= dt) <= 0) { this.sShield = null; this.w.float(this.x, this.y - this.def.height - 30, 'Escudo agotado', '#c0c8d8'); }
    if (this.sb && (this.sb.t -= dt) <= 0) { this.setSB(0); this.w.vfx('summon', this.x, this.y - 10, { scale: 3 }); this.w.float(this.x, this.y - this.def.height - 30, 'Maduro', '#ffe27a'); }
    if (this.devalT > 0) {   // Maduro's passive: while marked, 5 % of every gold this champion earns goes to Maduro
      this.devalT -= dt; const d = this.gold - (this.goldPrev ?? this.gold), by = this.devalBy;
      if (d > 0 && by?.alive !== undefined && by.key === 'maduro') { const st = d * by.def.passive.steal; this.gold -= st; by.stealGold(st); }
      this.goldPrev = this.gold;
    } else this.goldPrev = null;
    if (this.shove) { const sv = this.shove; sv.t -= dt; if (!this.dashStep(sv.vx * dt, sv.vy * dt) || sv.t <= 0) this.shove = null; }
    if (this.pullMe) { const pm = this.pullMe, by = pm.by, dx = by.x + by.ax * 62 - this.x, dy = by.y + by.ay * 62 - this.y, dd = Math.hypot(dx, dy) || 1; pm.t -= dt; this.carriedT = 0.12; if (dd < 14 || pm.t <= 0 || !by.alive || !this.dashStep(dx / dd * 1100 * dt, dy / dd * 1100 * dt)) this.pullMe = null; }
""")
s = rep(s, "  stun(t) {\n    if (!this.alive || this.isTower || this.arepaBlocks()) return;", "  stun(t) {\n    if (!this.alive || this.isTower || this.arepaBlocks()) return;\n    if (this.sShield && this.w.sShieldBlock(this, 0)) return;")
s = rep(s, "    if (this.isTower || this.arepaBlocks()) return; this.slows.push({ pct, t });", "    if (this.isTower || this.arepaBlocks()) return;\n    if (this.sShield && this.w.sShieldBlock(this, 0)) return; this.slows.push({ pct, t });")
s = rep(s, "    if (this.woundT > 0) add('wound',", """    if (this.sb) add('sb', 'Súper Bigote', this.sb.t, false, 'Más velocidad y armadura; tus poderes son ofensivos y tus ataques son puñetazos.', { tint: 0xff4a3a });
    if (this.drT > 0) add('dr', 'Colectivo protector', this.drT, false, `Recibes un ${Math.round(this.drPct * 100)} % menos de daño.`, { tint: 0x7ee0ff });
    if (this.sShield) add('sshield', 'Escudo antimperialista', this.sShield.t, false, 'Bloquea el primer ataque o control de masas que te golpee.', { tint: 0x66b0ff });
    if (this.atkSlowT > 0 && this.atkSlowSrc === 'supply') add('supply', 'Desabastecimiento', this.atkSlowT, true, 'Menos velocidad de ataque y de curación.', { tint: 0xffb040 });
    if (this.armorShredT > 0) add('shred', 'Armadura rota', this.armorShredT, true, `Tu armadura se reduce un ${Math.round(this.armorShred * 100)} %.`, { tint: 0xc0c8d8 });
    if (this.devalT > 0) add('deval', 'Devaluación', this.devalT, true, 'Maduro te roba un 5 % del oro que ganas.', { tint: 0xffd23f });
    if (this.woundT > 0) add('wound',""")
s = rep(s, "      case 'leandro:p1': {", "      case 'maduro:p1': case 'maduro:p2': case 'maduro:p3': case 'maduro:ult': this.fireMaduro(k, a, rank); break;\n      case 'leandro:p1': {")
s = rep(s, "  fireAbility(k, a, rank) {", """  // ---- Maduro ----
  setSB(t) {   // transform into Súper Bigote for t seconds, or back to normal (t = 0)
    const on = t > 0, was = !!this.sb, still = !this.hasAnims && !this.dirFrames && this.spr;
    if (on) {
      this.sb = { t, armor: this.sb?.armor || 0, mr: this.sb?.mr || 0 };
      if (!was) { this.def = this.defSB; this.comboStep = 0; this.setSkin('maduro_sb'); if (still && this.w.textures.exists('ref_superbigote')) this.spr.setTexture('ref_superbigote'); }
    } else if (was) {
      this.sb = null; this.def = this.defN; this.comboStep = 0; this.speedT = 0; this.speedBoost = 0; this.setSkin('maduro'); if (still) this.spr.setTexture('ref_maduro');
    }
  }
  stealGold(n) {   // Maduro's passive: every 1000 gold stolen gives a permanent shield
    const P = this.def.passive; this.gold += n; this.stolen = (this.stolen || 0) + n;
    while (this.stolen >= ((this.stolenN || 0) + 1) * P.per) { this.stolenN = (this.stolenN || 0) + 1; this.shieldHp += P.shield; this.shieldT = Infinity; this.w.float(this.x, this.y - this.def.height - 34, `+${P.shield} escudo`, '#ffe27a'); this.w.vfx('shield', this.x, this.cy, { scale: 2.2, tint: 0xffe27a, alpha: 0.7 }); }
  }
  fireMaduro(k, a, rank) {
    const w = this.w, sb = !!this.sb;
    const line = L => [{ x: this.x, y: this.y }, { x: this.x + this.ax * L, y: this.y + this.ay * L }];
    const byDist = (p, q) => Math.hypot(p.x - this.x, p.y - this.y) - Math.hypot(q.x - this.x, q.y - this.y);
    if (k === 'ult') {   // Súper Bigote: global slow, speed, armour
      this.setSB(a.time); this.sb.armor = rk(a.armor, rank); this.sb.mr = rk(a.mr, rank); this.speedBoost = a.speed; this.speedT = a.time;
      w.vfx('shockwave', this.x, this.y - 6, { scale: 9, below: true, tint: 0xff4a3a }); w.vfx('levelup', this.x, this.y - 10, { scale: 5 }); w.vfx('buff', this.x, this.cy, { scale: 3.5, tint: 0xff4a3a });
      w.enemiesOf(this).forEach(t => t.slow(a.slow, a.slowTime));
      w.float(this.x, this.y - this.def.height - 50, '¡Con mi mano de hierro, destruiré el sabotaje enemigo!', '#ffe27a');
      w.showBanner?.({ title: '¡APARICIÓN DE SÚPER BIGOTE!', sub: 'Los enemigos del mapa se ralentizan', team: this.baseTeam, face: w.faceOf?.(this) }, 2200);
      return;
    }
    if (k === 'p1' && !sb) {   // megaphone: damage + silence along a line, the second champion is also slowed
      const dmg = rk(a.dmg, rank) + this.ap * a.apScale, pts = line(a.length);
      for (let i = 1; i <= 6; i++) w.vfx('shockwave', this.x + this.ax * a.length * i / 6, this.y + this.ay * a.length * i / 6 - 8, { scale: 1 + i * 0.35, tint: 0xffd23f, alpha: 0.8 });
      let champs = 0;
      w.enemiesOf(this).filter(t => w.nearPath(pts, t.x, t.y, a.width / 2 + BODY_R * 0.6)).sort(byDist).forEach(t => {
        w.damage(this, t, dmg, 'magic'); t.silenceT = Math.max(t.silenceT, a.silence);
        if (t.isChamp && ++champs === 2) t.slow(a.slowPct, a.slowTime);
        w.vfx('spark', t.x, t.cy, { scale: 2.5, tint: 0xffd23f });
      });
    } else if (k === 'p1') {   // Puño de hierro: fly forward and smash the ground; the first champion hit is stunned
      const dmg = rk(a.dmg, rank) + this.atk * a.atkScale, dur = 0.2, pts = line(a.dist + 70);
      const tgt = w.enemiesOf(this).filter(t => t.isChamp && w.nearPath(pts, t.x, t.y, 38)).sort(byDist)[0];
      const trav = tgt ? Math.max(0, Math.min(a.dist, Math.hypot(tgt.x - this.x, tgt.y - this.y) - 62)) : a.dist;
      this.state = 'cast'; this.anim = 'power1'; this.stateT = 0; this.stateDur = dur + 0.2; this.fired = true; this.dashV = { x: this.ax * trav / dur, y: this.ay * trav / dur };
      w.float(this.x, this.y - this.def.height - 34, '¡Toma dosis de patria!', '#ff7a5a');
      w.after(dur, () => {
        if (!this.alive) return; const ix = this.x + this.ax * 50, iy = this.y + this.ay * 50;
        w.vfx('shockwave', ix, iy, { scale: 4, below: true, tint: 0xff7a5a }); w.vfx('punch', ix, iy - 20, { scale: 5 });
        if (tgt?.alive) { w.damage(this, tgt, dmg, 'physical'); tgt.stun(a.stun); }
        w.enemiesNear(this.team, ix, iy, a.radius).filter(t => t !== tgt).forEach(t => w.damage(this, t, dmg * a.splash, 'physical'));
      });
    } else if (k === 'p2' && !sb) {   // bodyguards: -x % damage taken, melee enemies nearby are hurt and pushed away
      this.drT = rk(a.time, rank); this.drPct = rk(a.dr, rank); const dmg = rk(a.dmg, rank) + this.atk * a.atkScale;
      for (let i = 0; i < 6; i++) w.vfx('summon', this.x + Math.cos(i * 1.047) * 70, this.y + Math.sin(i * 1.047) * 45 - 20, { scale: 1.6 });
      w.vfx('shockwave', this.x, this.y - 6, { scale: 4, below: true, tint: 0x7ee0ff });
      w.enemiesNear(this.team, this.x, this.y, a.radius).filter(t => t.def.basic?.kind === 'melee' || t.isMinion).forEach(t => {
        w.damage(this, t, dmg, 'physical'); const dx = t.x - this.x, dy = t.y - this.y, d = Math.hypot(dx, dy) || 1; t.shove = { vx: dx / d * a.push / 0.2, vy: dy / d * a.push / 0.2, t: 0.2 };
      });
    } else if (k === 'p2') {   // Escudo antimperialista: blocks the first hit / CC, then bursts
      this.sShield = { t: rk(a.time, rank), r: a.radius, mult: a.burst, base: a.base };
      w.vfx('shield', this.x, this.cy, { scale: 3, tint: 0x66b0ff, alpha: 0.8 }); w.vfx('shockwave', this.x, this.y - 6, { scale: 3, below: true, tint: 0x66b0ff });
    } else if (k === 'p3' && !sb) {   // empty supply box: enemies = Desabastecimiento, allies = speed (and they pay a little health)
      const c = this.castPoint || w.aiPoint(this, a.range), T = rk(a.time, rank); this.castPoint = null;
      w.zoneDecal(c.x, c.y, a.radius, 0xffd23f, 1.4); w.vfx('shockwave', c.x, c.y, { scale: 3, below: true, tint: 0xffd23f });
      w.after(0.35, () => {
        w.vfx('smoke', c.x, c.y - 10, { scale: 3 });
        w.enemiesNear(this.team, c.x, c.y, a.radius).forEach(t => { t.atkSlowT = Math.max(t.atkSlowT || 0, T); t.atkSlow = a.aspd; t.atkSlowSrc = 'supply'; if (t.isChamp) t.wound(a.heal, T); });
        w.fighters.filter(f => f.isChamp && f.alive && f.team === this.team && f !== this && Math.hypot(f.x - c.x, f.y - c.y) <= a.radius).forEach(f => {
          f.speedBoost = rk(a.ally, rank); f.speedT = a.allyTime; f.hp = Math.max(1, f.hp - f.maxHp * a.drain); w.float(f.x, f.y - f.def.height - 30, '¡Lealtad!', '#ffd23f');
        });
      });
    } else {   // Mano de hierro: grabs the first enemy on the line, pulls him in and breaks his armour
      const dmg = rk(a.dmg, rank) + this.atk * a.atkScale, pts = line(a.range);
      const tgt = w.enemiesOf(this).filter(t => w.nearPath(pts, t.x, t.y, a.width / 2 + BODY_R * 0.6)).sort((p, q) => (q.isChamp ? 1 : 0) - (p.isChamp ? 1 : 0) || byDist(p, q))[0];
      const end = tgt ? Math.hypot(tgt.x - this.x, tgt.y - this.y) : a.range;
      for (let i = 1; i <= 8; i++) w.vfx('spark', this.x + this.ax * end * i / 8, this.y + this.ay * end * i / 8 - 14, { scale: 1.6, tint: 0xc0c8d8 });
      if (tgt) { w.damage(this, tgt, dmg, 'physical'); tgt.armorShred = a.shred; tgt.armorShredT = a.shredTime; if (tgt.isChamp) tgt.pullMe = { by: this, t: 0.7 }; w.vfx('punch', tgt.x, tgt.cy, { scale: 4 }); }
    }
  }

  fireAbility(k, a, rank) {""")
p.write_text(s, encoding='utf8')

# ================= world.js
p = ROOT / 'src/world.js'; s = p.read_text(encoding='utf8')
s = rep(s, "    let dmg = Math.max(1, raw * 100 / (100 + resist));\n    if (target.isChamp && target.pas?.size) {", """    let dmg = Math.max(1, raw * 100 / (100 + resist));
    { const so = src?.owner || src; if (so?.key === 'maduro' && target.isChamp && target.team !== so.team && !dot) { target.devalT = so.def.passive.mark; target.devalBy = so; } }   // Maduro's passive mark
    if (target.sShield && !dot && src && src.team !== target.team && this.sShieldBlock(target, dmg)) return 0;   // Escudo antimperialista: the first hit is absorbed
    if (target.drT > 0) dmg *= 1 - target.drPct;   // Colectivo protector
    if (target.isChamp && target.pas?.size) {""")
s = rep(s, "  solidAt(x, y) {", """  // Súper Bigote's shield: absorbs the first hit or crowd control and bursts, hurting the enemies around it for a part of what it blocked
  sShieldBlock(f, blocked) {
    const sh = f.sShield; if (!sh) return false; f.sShield = null;
    this.vfx('shockwave', f.x, f.y - 6, { scale: sh.r / 40, below: true, tint: 0x66b0ff }); this.vfx('shield', f.x, f.cy, { scale: 3.4, tint: 0xffffff, alpha: 0.9 }); this.audio.play('ui_confirm', { at: f, vol: 0.7, gap: 100 });
    this.float(f.x, f.y - f.def.height - 30, '¡Bloqueado!', '#9fe8ff');
    const d = sh.base + blocked * sh.mult; this.enemiesNear(f.team, f.x, f.y, sh.r).forEach(t => this.damage(f, t, d, 'magic', true));
    return true;
  }
  solidAt(x, y) {""")
s = rep(s, "    const near = this.fighters.filter(c => c.isChamp && c.alive && c.team === team && dist(c, v) <= 700);", "    const near = this.fighters.filter(c => c.isChamp && c.alive && c.team === team && dist(c, v) <= 700);\n    if (v.isMinion && this.fighters.some(m => m.key === 'maduro' && m.alive && m.team === v.team && dist(m, v) <= 700)) r.gold = Math.round(r.gold * (1 - CHAMPIONS.maduro.passive.minion));   // Maduro's passive: his nearby minions are worth 10 % less gold to the rivals")
p.write_text(s, encoding='utf8')
print('ok')
