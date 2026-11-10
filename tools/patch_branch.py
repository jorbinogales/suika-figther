def sub(s, a, b, cnt=1):
    assert a in s, a[:90]
    return s.replace(a, b, cnt)

# ================= data.js =================
p = 'src/data.js'; s = open(p, encoding='utf-8').read()
alt = """    // second branch: when the ability is first learned the player picks this one OR the one in `abilities` (see Fighter.setBranch / the HUD choice window)
    alt: {
      p1: { name: 'Poder del peine', icon: 'leandro_p1b', preview: 'comb', v: 'comb', cd: [14, 13, 12], mana: [35, 40, 45], windup: 0.25, dur: 0.4,
            desc: 'Leandro se equipa un peine gigante sobre la mano y pasa a pelear CUERPO A CUERPO durante unos segundos: cada ataque básico barre un área corta al frente y lanza una onda que daña a todos los enemigos de delante con daño de IA (escala con tu poder de IA).',
            time: [7, 8, 9], reach: 175, atkCd: 0.55, dmg: [24, 36, 48], apScale: 0.5 },
      p2: { name: 'Poder de la secadora', icon: 'leandro_p2b', preview: 'hair_dryer', v: 'dryer', cd: [12, 11, 10], mana: [40, 45, 50], windup: 0.2, dur: 0.45,
            desc: 'Instantánea. Dispara la secadora en línea recta: pulsa F para JALAR a los enemigos de la línea hacia ti, o Mayús + F para IMPULSARLOS lejos. Cualquiera de las dos causa daño de IA y los afectados no pueden escapar mientras son arrastrados.',
            length: 560, width: 130, hold: 0.45, speed: 1100, dmg: [35, 55, 75], apScale: 0.6 },
      p3: { name: 'Lanzamiento de cauchos', icon: 'leandro_p3b', preview: 'tire', v: 'throw', wide: true, cd: [16, 15, 14], mana: [60, 65, 70], windup: 0.35, dur: 0.6,
            desc: 'La cámara se aleja mucho para mostrar el mapa. Arrojas 4 cauchos hacia donde apuntas (muy lejos): cada uno viaja en línea recta y rebota 2 veces, causando daño de IA a cada enemigo que atraviesa.',
            range: 1500, count: 4, spacing: 52, bounces: 2, speed: 950, dmg: [28, 42, 56], apScale: 0.45 },
      ult: { name: 'Filtraciones', icon: 'leandro_ultb', preview: 'virtual_cage', v: 'leak', wide: true, cd: [80, 70, 60], mana: [100, 100, 100], windup: 0.5, dur: 0.8,
             desc: '1ª activación: filtras la ubicación de todos los campeones enemigos durante unos segundos (solo ves una pequeña parte de su entorno). 2ª activación: eliges a un enemigo y te teletransportas junto a él desde cualquier parte del mapa, creando una JAULA VIRTUAL: nadie de fuera puede entrar y solo vosotros dos podéis quedaros dentro hasta que termine el tiempo.',
             reveal: [4, 5, 6], sight: 230, recast: 8, radius: 330, cage: [5, 6, 7] },
    },
"""
s = sub(s, "botApScale: 0.45, botHpScale: 1.2 },\n    },\n", "botApScale: 0.45, botHpScale: 1.2 },\n    },\n" + alt)
# previews of the first branch
s = sub(s, "p1: { name: 'Fiebre de cactus', icon: 'leandro_p1',", "p1: { name: 'Fiebre de cactus', icon: 'leandro_p1', preview: 'cactus',")
s = sub(s, "p2: { name: 'Lanzamiento de contrato', icon: 'leandro_p2',", "p2: { name: 'Lanzamiento de contrato', icon: 'leandro_p2', preview: 'contract',")
s = sub(s, "p3: { name: '4 Cauchos', icon: 'leandro_p3',", "p3: { name: '4 Cauchos', icon: 'leandro_p3', preview: 'tire',")
s = sub(s, "ult: { name: 'IA voy', icon: 'leandro_ult',", "ult: { name: 'IA voy', icon: 'leandro_ult', preview: 'bot_melee',")
s = sub(s, "    case 'leandro:p3':  return { type: 'wall', min: 80, max: 260, count: 4, spacing: 44, color: 0x9ad7ff };",
        "    case 'leandro:p3':  return a.v === 'throw' ? { type: 'wall', min: 200, max: a.range, count: a.count, spacing: a.spacing, color: 0x9ad7ff } : { type: 'wall', min: 80, max: 260, count: 4, spacing: 44, color: 0x9ad7ff };")
s = sub(s, "    case 'leandro:ult': return { type: 'circle', radius: 160, color: 0x66ffcc };",
        "    case 'leandro:ult': return a.v === 'leak' ? { type: 'pick', radius: 1800, color: 0x66ffcc } : { type: 'circle', radius: 160, color: 0x66ffcc };")
open(p, 'w', encoding='utf-8').write(s)

# ================= fighter.js =================
p = 'src/fighter.js'; s = open(p, encoding='utf-8').read()
s = sub(s, "    this.ranks = { p1: 0, p2: 0, p3: 0, ult: 0 };\n", "    this.ranks = { p1: 0, p2: 0, p3: 0, ult: 0 };\n    this.branch = {};   // ability slot -> 1 when the second branch (def.alt) was chosen\n    this.comb = null; this.leakRe = null; this.revealT = 0;\n", 1)
# spend with branch
s = sub(s, "  spend(k) {\n    if (this.w.net?.role === 'client') return this.canSpend(k) && this.w.net.op('spend', k);\n    if (!this.canSpend(k)) return false;\n    this.ranks[k]++; this.points--;",
        "  setBranch(k, b) {   // idempotent: swaps the ability of slot k for its second-branch version\n    if (!this.def.alt?.[k] || (this.branch[k] || 0) === b) return;\n    this.branch[k] = b; this.def = { ...this.def, abilities: { ...this.def.abilities, [k]: b ? this.def.alt[k] : (CHAMPIONS[this.key].abilities[k]) } };\n  }\n  spend(k, b = 0) {\n    if (this.w.net?.role === 'client') return this.canSpend(k) && this.w.net.op('spend', b ? k + ':1' : k);\n    if (!this.canSpend(k)) return false;\n    if (!this.ranks[k] && this.def.alt?.[k]) this.setBranch(k, b ? 1 : 0);   // the choice is made when the ability is first learned\n    this.ranks[k]++; this.points--;")
# effective basic attack
s = sub(s, "  get atkRange() { const b = this.def.basic; return this.hen ? b.hen.reach : (b?.kind === 'melee' ? b.reach : this.def.stats.range); }",
        "  get atkRange() { const b = this.def.basic; return this.hen ? b.hen.reach : this.comb ? this.comb.reach : (b?.kind === 'melee' ? b.reach : this.def.stats.range); }\n  // basic attack in use: Eliud's hen form and Leandro's comb turn it into a melee swing\n  get basicDef() {\n    if (this.hen) return { ...this.def.basic, ...this.def.basic.hen };\n    if (this.comb) { const a = this.def.abilities.p1; return { ...this.def.basic, kind: 'melee', type: 'magic', reach: a.reach, base: rk(a.dmg, this.ranks.p1 || 1), atkScale: 0, apScale: a.apScale, vfx: 'spark', wave: true }; }\n    return this.def.basic;\n  }")
n = s.count("const b = this.hen ? { ...this.def.basic, ...this.def.basic.hen } : this.def.basic")
assert n == 3, n
s = s.replace("const b = this.hen ? { ...this.def.basic, ...this.def.basic.hen } : this.def.basic", "const b = this.basicDef")
s = sub(s, "comboCfg() { const b = this.def.basic, c = COMBOS[this.key] ||", "comboCfg() { const b = this.basicDef, c = (this.comb ? COMBOS.jorbi : COMBOS[this.key]) ||")
s = sub(s, "this.cds.basic = this.def.stats.atkCd / (1 + this.pk('aspd')", "this.cds.basic = (this.comb?.atkCd || this.def.stats.atkCd) / (1 + this.pk('aspd')")
s = sub(s, "LG = LUNGES[this.key] || (b.kind === 'melee' ? LUNGES.jorbi : LUNGES.axel);", "LG = (this.comb ? LUNGES.jorbi : LUNGES[this.key]) || (b.kind === 'melee' ? LUNGES.jorbi : LUNGES.axel);")
s = sub(s, "if (b.kind === 'melee') raw = (b.base + this.atk * b.atkScale) * cs.dmg", "if (b.kind === 'melee') raw = (b.base + this.atk * (b.atkScale || 0) + this.ap * (b.apScale || 0)) * cs.dmg")
s = sub(s, "      let dmg = (b.base + this.atk * b.atkScale) * cs.dmg;\n      const crit", "      let dmg = (b.base + this.atk * (b.atkScale || 0) + this.ap * (b.apScale || 0)) * cs.dmg;\n      if (b.wave) w.vfx('shockwave', this.x + this.ax * b.reach * 0.5, this.y + this.ay * b.reach * 0.35 - 14, { scale: b.reach / 48, tint: 0x66ffcc, below: true });   // the comb's wave\n      const crit")
# recast cost + window
s = sub(s, "const cost = this.key === 'diosa' && k === 'p1' && this.qRe ? 0 : rk(a.mana, rank);", "const cost = (this.key === 'diosa' && k === 'p1' && this.qRe) || (this.leakRe && k === 'ult') ? 0 : rk(a.mana, rank);")
s = sub(s, "    if (this.qRe && (this.qRe.t -= dt) <= 0) {", "    if (this.comb && (this.comb.t -= dt) <= 0) { this.comb = null; this.w.float(this.x, this.y - this.def.height - 30, 'Peine guardado', '#9fffd8'); }\n    if (this.revealT > 0) this.revealT -= dt;\n    if (this.leakRe && (this.leakRe.t -= dt) <= 0) { this.leakRe = null; this.cds.ult = rk(this.def.abilities.ult.cd, this.ranks.ult || 1); }   // the 2nd activation window closed: the full cooldown starts\n    if (this.qRe && (this.qRe.t -= dt) <= 0) {")
s = sub(s, "this.shove = null; this.pullMe = null; if (this.sb) this.setSB(0);", "this.shove = null; this.pullMe = null; this.comb = null; this.leakRe = null; this.revealT = 0; if (this.sb) this.setSB(0);")
# dispatch of the new abilities
s = sub(s, "    switch (this.key + ':' + k) {\n      case 'diosa:p1':", "    if (this.key === 'leandro' && a.v) return this.fireLeandroB(k, a, rank);\n    switch (this.key + ':' + k) {\n      case 'diosa:p1':")
meth = """  // ---- Leandro, second branch: comb / hair dryer / tire throw / leaks ----
  fireLeandroB(k, a, rank) {
    const w = this.w, dmg = (a.dmg ? rk(a.dmg, rank) : 0) + this.ap * (a.apScale || 0);
    if (a.v === 'comb') {
      this.comb = { t: rk(a.time, rank), atkCd: a.atkCd, reach: a.reach };
      w.vfx('summon', this.x, this.y - 10, { scale: 3, tint: 0x66ffcc }); w.float(this.x, this.y - this.def.height - 30, '¡Poder del peine!', '#9fffd8');
    } else if (a.v === 'dryer') {
      const push = this.castPoint?.x === 1; this.castPoint = null;
      const px = -this.ay, py = this.ax, L = a.length;
      for (let i = 1; i <= 7; i++) w.after(i * 0.03, () => w.vfx('run_dust', this.x + this.ax * L * i / 7, this.y + this.ay * L * i / 7 - 10, { scale: 3 + i * 0.25, alpha: 0.85 }));
      w.enemiesOf(this).forEach(t => {
        if (t.isTower || t.def?.static) return;
        const rx = t.x - this.x, ry = t.y - this.y, along = rx * this.ax + ry * this.ay, side = Math.abs(rx * px + ry * py);
        if (along < 0 || along > L || side > a.width / 2 + t.br * 0.6) return;
        w.damage(this, t, dmg, 'magic'); t.carriedT = a.hold;   // cannot act (nor escape) while dragged
        if (push) t.shove = { vx: this.ax * a.speed, vy: this.ay * a.speed, t: a.hold }; else t.pullMe = { by: this, t: a.hold + 0.15 };
      });
      w.float(this.x, this.y - this.def.height - 30, push ? '¡Impulso!' : '¡Jalón!', '#ff9ad0');
    } else if (a.v === 'throw') {
      const c = this.castPoint || { x: this.x + this.ax * a.range * 0.6, y: this.y + this.ay * a.range * 0.6 }; this.castPoint = null;
      w.throwTires(this, c, a, dmg);
    } else if (a.v === 'leak') {
      if (this.leakRe) {   // 2nd activation: teleport next to the chosen enemy and lock both of you in a virtual cage
        const t = w.pickTarget(this, 1e6, this.castPoint || { x: this.x, y: this.y }); this.castPoint = null;
        this.leakRe = null; this.cds.ult = rk(a.cd, rank);
        if (!t) return;
        w.vfx('summon', this.x, this.y - 10, { scale: 4, tint: 0x66ffcc });
        const side = this.team === 0 ? -1 : 1; let nx = t.x + side * 90, ny = t.y; if (!isWalk(nx, ny)) { nx = t.x - side * 90; if (!isWalk(nx, ny)) { nx = t.x; ny = t.y + 60; } }
        this.x = nx; this.y = ny; this.ax = -side; this.ay = 0;
        w.vfx('summon', this.x, this.y - 10, { scale: 4, tint: 0x66ffcc }); w.makeCage(this, t, a.radius, rk(a.cage, rank));
        w.float(this.x, this.y - this.def.height - 30, '¡Jaula virtual!', '#66ffcc');
      } else {   // 1st activation: leak where the enemy champions are
        const T = rk(a.reveal, rank);
        w.fighters.forEach(e => { if (e.alive && e.isChamp && e.team !== this.team) { e.revealT = T; e.revealBy = this.team; e.revealSight = a.sight; } });
        this.leakRe = { t: a.recast }; this.cds.ult = 0;
        w.vfx('summon', this.x, this.y - 10, { scale: 3, tint: 0x66ffcc }); w.float(this.x, this.y - this.def.height - 30, '¡Filtración!', '#66ffcc');
      }
    }
  }

"""
s = sub(s, "  // ---- Diosa Canales ----\n", meth + "  // ---- Diosa Canales ----\n")
open(p, 'w', encoding='utf-8').write(s)

# ================= world.js =================
p = 'src/world.js'; s = open(p, encoding='utf-8').read()
s = sub(s, "this.fighters = []; this.projs = []; this.obstacles = [];", "this.fighters = []; this.projs = []; this.obstacles = []; this.cages = []; this.tireShots = [];")
# zoom out while aiming wide abilities
s = sub(s, "z = aboard ? zn / 1.5 : zn * this.zoomK;", "ab = this.aimKey && this.pc.def.abilities[this.aimKey], far = ab?.wide && (ab.v !== 'leak' || this.pc.leakRe), z = aboard ? zn / 1.5 : far ? zn * 0.5 : zn * this.zoomK;")
s = sub(s, "const zn = Phaser.Math.Clamp(this.scale.height / VIEW_H, 0.6, 4), z =", "const zn = Phaser.Math.Clamp(this.scale.height / VIEW_H, 0.6, 4);\n    const ")
# ESC closes the branch window first
s = sub(s, "if (hs?.shopOpen) { hs.shopOpen = false; } else if (this.aimKey)", "if (hs?.branchSel) { hs.branchSel = null; } else if (hs?.shopOpen) { hs.shopOpen = false; } else if (this.aimKey)")
# ctrl+key spend -> choice window
s = sub(s, "k.ctrl.isDown ? this.player.spend(a) :", "k.ctrl.isDown ? this.askSpend(a) :")
s = sub(s, "  beginAim(a) {", """  askSpend(k) {   // learning a slot with two branches opens the choice window first
    const p = this.player; if (!p.canSpend(k)) return;
    if (p.def.alt?.[k] && !p.ranks[k]) { const hs = this.scene.get('hud'); if (hs) { hs.shopOpen = false; hs.branchSel = k; return; } }
    p.spend(k);
  }
  beginAim(a) {""")
# instant casts + phase 2 of the leak
s = sub(s, "(p.key === 'diosa' && (a === 'p2' || a === 'ult' || (a === 'p1' && p.qRe)))) { p.tryCast(a); return; }",
        "(p.key === 'diosa' && (a === 'p2' || a === 'ult' || (a === 'p1' && p.qRe))) || (p.key === 'leandro' && (d.v === 'comb' || (d.v === 'leak' && !p.leakRe)))) { p.tryCast(a); return; }")
s = sub(s, "    if (p.key === 'jorbi' && a === 'p2') {   // instant dash", """    if (p.key === 'leandro' && d.v === 'dryer') {   // instant: F pulls, Shift + F pushes (carried to the host in the cast point)
      if (!rank || !p.free || p.cds[a] > 0) return; const m = this.mouseGround(); if (!this.hoverKey) p.setAim(m.x - p.x, m.y - p.y);
      p.castPoint = { x: this.k.shift?.isDown ? 1 : 0, y: 0 }; if (!p.tryCast(a)) p.castPoint = null; return;
    }
    if (p.key === 'jorbi' && a === 'p2') {   // instant dash""")
s = sub(s, "(p.mana < rk(d.mana, rank) && !this.debugFree)) { if (rank) this.audio.play('ui_error'", "(p.mana < (p.leakRe && a === 'ult' ? 0 : rk(d.mana, rank)) && !this.debugFree)) { if (rank) this.audio.play('ui_error'")
# AI branch choice + hash
s = sub(s, "e.spend(open.includes('ult') ? 'ult' : open[Math.random() * open.length | 0]);", "e.spend(open.includes('ult') ? 'ult' : open[Math.random() * open.length | 0], Math.random() < 0.5 ? 1 : 0);")
s = sub(s, "ABILITY_KEYS.forEach(a => { while (p.canSpend(a) && p.ranks[a] < (+h.get('rank') || 1)) p.spend(a); });", "const brs = h.get('br') || '';   // #br=1010: second branch for p1 / p2 / p3 / ult\n    ABILITY_KEYS.forEach((a, i) => { while (p.canSpend(a) && p.ranks[a] < (+h.get('rank') || 1)) p.spend(a, brs[i] === '1' ? 1 : 0); });")
# cages / tires: logic + drawing
s = sub(s, "  resolveSolids(f) {\n", """  // virtual cage (Leandro's leaks): whoever was inside when it closed cannot leave, nobody else can come in
  makeCage(owner, target, r, life) {
    this.cages.push({ x: target.x, y: target.y, r, t: life, T: life, inside: new Set([owner, target]) });
    this.zoneDecal(target.x, target.y, r, 0x66ffcc, 1.6); this.audio.play('ui_announce', { vol: 0.7, gap: 0 });
  }
  cageClamp(f) {
    for (const c of this.cages) {
      const dx = f.x - c.x, dy = f.y - c.y, d = Math.hypot(dx, dy) || 1, ins = c.inside.has(f), lim = ins ? c.r - 16 : c.r + 16;
      if (ins ? d <= lim : d >= lim) continue;
      const nx = c.x + dx / d * lim, ny = c.y + dy / d * lim; if (isWalk(nx, ny)) { f.x = nx; f.y = ny; }
    }
  }
  updateCages(dt) {
    this.cages = this.cages.filter(c => (c.t -= dt) > 0 || (this.cageG?.clear(), false));
    if (this.bot) return; const g = (this.cageG ||= this.add.graphics().setDepth(99980)); g.clear(); const tt = this.time.now / 1000;
    for (const c of this.cages) {
      const fade = Math.min(1, c.t * 2, (c.T - c.t) * 3), pulse = 0.5 + 0.5 * Math.sin(tt * 6);
      g.fillStyle(0x66ffcc, 0.07 * fade).fillCircle(c.x, c.y, c.r).lineStyle(4, 0x66ffcc, (0.7 + 0.25 * pulse) * fade).strokeCircle(c.x, c.y, c.r);
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2 + tt * 0.3, x = c.x + Math.cos(a) * c.r, y = c.y + Math.sin(a) * c.r; g.lineStyle(3, 0x9fffe8, 0.55 * fade).lineBetween(x, y, x, y - 60); }
      g.lineStyle(2, 0xffffff, 0.35 * fade).strokeCircle(c.x, c.y - 60, c.r);
    }
  }
  // Leandro's tire throw: every tire flies in a straight line to the target distance, then bounces back and out again (2 bounces), hurting what it crosses
  throwTires(owner, c, a, dmg) {
    const dx0 = c.x - owner.x, dy0 = c.y - owner.y, D = Math.min(a.range, Math.max(250, Math.hypot(dx0, dy0))), base = Math.atan2(dy0, dx0), px = -Math.sin(base), py = Math.cos(base);
    for (let i = 0; i < a.count; i++) {
      const o = (i - (a.count - 1) / 2) * a.spacing, ang = base + (i - (a.count - 1) / 2) * 0.05, s = this.add.image(owner.x + px * o, owner.y + py * o, 'tire').setOrigin(0.5, 0.85);
      s.setScale(54 / s.height);
      this.tireShots.push({ owner, s, x: owner.x + px * o, y: owner.y + py * o, dx: Math.cos(ang), dy: Math.sin(ang), left: D, D, leg: 0, legs: a.bounces + 1, speed: a.speed, dmg, hit: new Set() });
    }
    this.audio.play('explosion', { at: owner, vol: 0.5, gap: 100 });
  }
  updateTireShots(dt) {
    this.tireShots = this.tireShots.filter(q => {
      let mv = q.speed * dt; const nx = q.x + q.dx * mv, ny = q.y + q.dy * mv;
      if (!isWalk(nx, ny)) q.left = 0; else { q.x = nx; q.y = ny; q.left -= mv; }
      for (const t of this.enemiesOf(q.owner)) if (!q.hit.has(t) && !t.isTower && !t.def?.lane && eDist(t.x, t.y, q.x, q.y) < t.br + 24) { q.hit.add(t); this.damage(q.owner, t, q.dmg, 'magic'); this.vfx('spark', t.x, t.cy, { scale: 3, tint: 0x9ad7ff }); }
      if (q.left <= 0) { q.leg++; if (q.leg >= q.legs) { q.s.destroy(); return false; } q.dx = -q.dx; q.dy = -q.dy; q.left = q.D; q.hit.clear(); this.vfx('shockwave', q.x, q.y - 4, { scale: 1.4, below: true, tint: 0x9ad7ff }); this.audio.play('hit_metal', { at: q, vol: 0.4, gap: 60 }); }
      q.s.setPosition(q.x, q.y).setDepth(q.y).setRotation(q.s.rotation + dt * 14); return true;
    });
  }
  resolveSolids(f) {
    if (this.cages.length) this.cageClamp(f);
""")
s = sub(s, "    this.updateProjectiles(dt);\n", "    this.updateProjectiles(dt); this.updateTireShots(dt); this.updateCages(dt);\n")
# fog: revealed champions
s = sub(s, "    // explore the ground around every unit of ours", "    for (const f of this.fighters) if (f.revealT > 0 && f.alive && f.team !== team && f.revealBy === team) src.push({ x: f.x, y: f.y, team, sight: f.revealSight || 230, reveal: true });   // Leandro's leaks: a small circle of sight around each revealed enemy\n    // explore the ground around every unit of ours")
open(p, 'w', encoding='utf-8').write(s)

# ================= netgame.js =================
p = 'src/netgame.js'; s = open(p, encoding='utf-8').read()
s = sub(s, "d.op === 'spend') f.spend(d.a);", "d.op === 'spend') { const [kk, bb] = String(d.a).split(':'); f.spend(kk, bb ? 1 : 0); }")
s = sub(s, "      if (f.hen) o.hen = [r1(f.henHp), r1(f.henMax)];", "      if (f.hen) o.hen = [r1(f.henHp), r1(f.henMax)];\n      if (f.def.alt) o.br = ABILITY_KEYS.map(a => f.branch[a] || 0); if (f.comb) o.cb = r1(f.comb.t); if (f.leakRe) o.lk = r1(f.leakRe.t);   // Leandro: branch choices, comb and leak windows")
s = sub(s, "ABILITY_KEYS.forEach((a, i) => { f.ranks[a] = o.rk[i]; if (cd) f.cds[a] = o.cd[i]; });", "ABILITY_KEYS.forEach((a, i) => { f.ranks[a] = o.rk[i]; if (cd) f.cds[a] = o.cd[i]; }); if (o.br) ABILITY_KEYS.forEach((a, i) => f.setBranch(a, o.br[i])); f.comb = o.cb ? { t: o.cb, atkCd: f.def.abilities.p1.atkCd, reach: f.def.abilities.p1.reach } : null; f.leakRe = o.lk ? { t: o.lk } : null;")
open(p, 'w', encoding='utf-8').write(s)

# ================= ai.js =================
p = 'src/ai.js'; s = open(p, encoding='utf-8').read()
s = sub(s, "  'leandro:p3': (f, c) => c.target && c.d < 230 && c.hpR < 0.65,", """  'leandro:p3': (f, c) => c.target && c.d < 230 && c.hpR < 0.65,
  'leandro:p1:comb': (f, c) => c.target && c.d < 300 && !f.comb,
  'leandro:p2:dryer': (f, c) => c.target && c.d < 480,
  'leandro:p3:throw': (f, c) => c.target && c.d > 300 && c.d < 1300,
  'leandro:ult:leak': (f, c) => f.leakRe ? !!c.target || c.anyChampAlive : c.anyChampAlive && c.hpR > 0.4,""")
s = sub(s, "const key = f.key + ':' + k, spec = aimSpec(f.key, k, rank, f);", "const key = f.key + ':' + k + (a.v ? ':' + a.v : ''), spec = aimSpec(f.key, k, rank, f);")
open(p, 'w', encoding='utf-8').write(s)
print('ok')
