def sub(s, a, b, cnt=1):
    assert a in s, a[:90]
    return s.replace(a, b, cnt)

# ================= data.js =================
p = 'src/data.js'; s = open(p, encoding='utf-8').read()
s = sub(s, "    case 'leandro:p2':  return { type: 'trapezoid', length: 760, nearW: 70, farW: 560, color: 0xb0ff60 };",
        "    case 'leandro:p2':  return a.v === 'dryer' ? { type: 'dryer', length: a.length, width: a.width, color: 0x5ad7ff } : { type: 'trapezoid', length: 760, nearW: 70, farW: 560, color: 0xb0ff60 };")
s = sub(s, "desc: 'Instantánea. Dispara la secadora en línea recta: pulsa F para JALAR a los enemigos de la línea hacia ti, o Mayús + F para IMPULSARLOS lejos. Cualquiera de las dos causa daño de IA y los afectados no pueden escapar mientras son arrastrados.',",
        "desc: 'Apunta la línea de la secadora y confirma con clic (o pulsando F otra vez). Por defecto JALA a los enemigos de la línea hacia ti; mantén Mayús mientras apuntas para REPELERLOS lejos (las flechas y el color de la zona cambian). Causa daño de IA y los afectados no pueden escapar mientras son arrastrados.',")
s = sub(s, "desc: 'La cámara se aleja mucho para mostrar el mapa. Arrojas 4 cauchos hacia donde apuntas (muy lejos): cada uno viaja en línea recta y rebota 2 veces, causando daño de IA a cada enemigo que atraviesa.',",
        "desc: 'La cámara se aleja mucho para mostrar el mapa. Arrojas 4 cauchos hacia donde apuntas (muy lejos): cada uno bota 3 veces SIEMPRE hacia delante y causa daño de IA donde cae. Nivel 1: cauchos normales. Nivel 2: al rebotar rompen el suelo y aturden un instante a quien cae debajo. Nivel 3: cauchos en llamas que además rompen la tierra y dejan fuego.',")
s = sub(s, "range: 1500, count: 4, spacing: 52, bounces: 2, speed: 950, dmg: [28, 42, 56], apScale: 0.45 },", "range: 1500, count: 4, spacing: 52, bounces: 2, speed: 760, radius: 85, stun: 0.6, fire: 3, dmg: [28, 42, 56], apScale: 0.45 },")
s = sub(s, "desc: '1ª activación: filtras la ubicación de todos los campeones enemigos durante unos segundos (solo ves una pequeña parte de su entorno). 2ª activación: eliges a un enemigo y te teletransportas junto a él desde cualquier parte del mapa, creando una JAULA VIRTUAL: nadie de fuera puede entrar y solo vosotros dos podéis quedaros dentro hasta que termine el tiempo.',",
        "desc: '1ª activación: filtras la ubicación de todos los campeones enemigos durante unos segundos (solo ves una pequeña parte de su entorno). 2ª activación: eliges a un enemigo y te teletransportas junto a él desde cualquier parte del mapa, creando un ESCENARIO VIRTUAL: solo vosotros dos os quedáis dentro, nadie de fuera puede entrar y el resto del mapa se ve totalmente oscuro para quien está dentro; los de fuera no ven el terreno de la arena.',")
open(p, 'w', encoding='utf-8').write(s)

# ================= fighter.js =================
p = 'src/fighter.js'; s = open(p, encoding='utf-8').read()
s = sub(s, "    const map = { p1: 'power1', p2: 'power2', p3: 'power3', ult: 'ult' };\n",
        "    const map = { p1: 'power1', p2: 'power2', p3: 'power3', ult: 'ult' };\n    if (this.key === 'leandro' && a.v) { const nm = a.v === 'comb' ? 'power1b' : a.v === 'dryer' ? (this.castPoint?.x === 1 ? 'power2b_push' : 'power2b_pull') : a.v === 'throw' ? 'power3b' : 'ultb'; if (this.w.anims.exists('leandro_' + nm)) map[k] = nm; }   // branch-B cast animations (fall back to the normal ones until drawn)\n")
s = sub(s, "    if (this.comb && (this.comb.t -= dt) <= 0) {", "    if (this.key === 'leandro') { const want = this.comb ? 'leandro_comb' : 'leandro'; if (this.skin !== want) this.setSkin(want); }   // comb in hand while the power lasts\n    if (this.comb && (this.comb.t -= dt) <= 0) {")
open(p, 'w', encoding='utf-8').write(s)

# ================= world.js =================
p = 'src/world.js'; s = open(p, encoding='utf-8').read()
s = sub(s, "attack3: 12, dash: 14 };", "attack3: 12, dash: 14, power1b: 12, power2b_pull: 12, power2b_push: 12, power3b: 12, ultb: 12 };")
# dryer needs confirmation: drop the instant branch
a = s.index("    if (p.key === 'leandro' && d.v === 'dryer') {   // instant"); b = s.index("    if (p.key === 'jorbi' && a === 'p2') {   // instant dash")
s = s[:a] + s[b:]
s = sub(s, "    p.castPoint = spec.type === 'wall' ||", "    if (spec.type === 'dryer') p.castPoint = { x: this.k.run?.isDown ? 1 : 0, y: 0 };   // Shift while aiming = push (the cast point carries the mode to the host)\n    else p.castPoint = spec.type === 'wall' ||")
# aim preview of the dryer
s = sub(s, "    } else if (spec.type === 'pick') {\n      ring('ring', p.x, p.y, spec.radius, 0.7);", """    } else if (spec.type === 'dryer') {   // hair dryer line: cyan arrows towards Leandro (pull) / orange arrows away from him (push, Shift)
      const push = !!this.k.run?.isDown, col = push ? 0xff9a3a : 0x5ad7ff, px = -p.ay, py = p.ax, L = spec.length, hw = spec.width / 2, g = this.aimG, tt = this.time.now / 1000;
      const P = (u, v) => ({ x: p.x + p.ax * u + px * v, y: p.y + p.ay * u + py * v });
      g.fillStyle(col, 0.16).fillPoints([P(0, -hw), P(L, -hw), P(L, hw), P(0, hw)], true);
      g.lineStyle(3, col, 0.9).lineBetween(P(0, -hw).x, P(0, -hw).y, P(L, -hw).x, P(L, -hw).y).lineBetween(P(0, hw).x, P(0, hw).y, P(L, hw).x, P(L, hw).y).lineBetween(P(L, -hw).x, P(L, -hw).y, P(L, hw).x, P(L, hw).y);
      for (let i = 0; i < 6; i++) {
        const u = (((i / 6) + tt * (push ? 0.7 : -0.7)) % 1 + 1) % 1 * L, d = push ? 1 : -1, al = Math.sin(Math.PI * u / L), tip = P(u + d * 16, 0), l1 = P(u - d * 14, -hw * 0.55), l2 = P(u - d * 14, hw * 0.55);
        g.lineStyle(5, col, 0.95 * al).lineBetween(l1.x, l1.y, tip.x, tip.y).lineBetween(l2.x, l2.y, tip.x, tip.y);
      }
      this.aimObj('dryerHint', () => this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '15px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(99991))
        .setVisible(true).setText(push ? 'REPELER  (suelta Mayús: JALAR)' : 'JALAR  (mantén Mayús: REPELER)').setColor(push ? '#ffb86a' : '#8ae2ff').setPosition(p.x, p.y - p.def.height - 56);
    } else if (spec.type === 'pick') {
      ring('ring', p.x, p.y, spec.radius, 0.7);""")
# tires: new bouncing flight
a = s.index("  // Leandro's tire throw:"); b = s.index("  resolveSolids(f) {")
tires = """  // Leandro's tire throw: every tire hops 3 times, always FORWARD, along a straight line (landing points at 40 / 70 / 100 % of the distance).
  // Rank 1 = plain tires; rank 2 = every landing breaks the ground and stuns briefly whoever is under it; rank 3 = flaming tires that also leave fire.
  throwTires(owner, c, a, dmg) {
    const rank = owner.ranks.p3 || 1, dx0 = c.x - owner.x, dy0 = c.y - owner.y, D = Math.min(a.range, Math.max(300, Math.hypot(dx0, dy0))), base = Math.atan2(dy0, dx0), px = -Math.sin(base), py = Math.cos(base);
    const fr = [0, 0.4, 0.7, 1].slice(0, a.bounces + 2), n = a.count;
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * a.spacing, ang = base + (i - (n - 1) / 2) * 0.05, x0 = owner.x + px * o, y0 = owner.y + py * o, fire = rank >= 3;
      const s = this.add.image(x0, y0, fire && this.textures.exists('tire_fire') ? 'tire_fire' : 'tire').setOrigin(0.5, 0.5); if (fire && !this.textures.exists('tire_fire')) s.setTint(0xff7a2a);
      const sh = this.add.ellipse(x0, y0, 44, 18, 0x000000, 0.35).setDepth(-3);
      this.tireShots.push({ owner, s, sh, x0, y0, dx: Math.cos(ang), dy: Math.sin(ang), D, fr, leg: 0, t: 0, dur: fr.slice(1).map((f, j) => (f - fr[j]) * D / a.speed), rank, fire, dmg, rad: a.radius, stun: a.stun, squash: 0, hit: new Set(), a });
    }
    this.audio.play('explosion', { at: owner, vol: 0.5, gap: 100 });
  }
  tireLand(q, x, y) {
    const rank = q.rank, a = q.a;
    this.vfx('shockwave', x, y - 4, { scale: 2.2, below: true, tint: q.fire ? 0xff8a2a : 0x9ad7ff }); this.vfx('run_dust', x, y - 6, { scale: 3, alpha: 0.9, below: true }); this.audio.play('hit_metal', { at: { x, y }, vol: 0.5, gap: 40 });
    for (const t of this.enemiesOf(q.owner)) {
      if (t.isTower || t.def?.lane || eDist(t.x, t.y, x, y) > q.rad + t.br * 0.5) continue;
      this.damage(q.owner, t, q.dmg, 'magic'); this.vfx('spark', t.x, t.cy, { scale: 3, tint: q.fire ? 0xff8a2a : 0x9ad7ff });
      if (rank >= 2 && !t.def?.static && eDist(t.x, t.y, x, y) <= q.rad * 0.7) t.stun(q.stun);
    }
    if (rank >= 2) { const cr = this.textures.exists('ground_crack') ? this.add.image(x, y, 'ground_crack').setDepth(y - 8).setDisplaySize(q.rad * 1.6, q.rad * 1.6 * YR) : null; if (cr) this.tweens.add({ targets: cr, alpha: 0, delay: 2500, duration: 1200, onComplete: () => cr.destroy() }); this.cameras.main.shake(90, 0.003); }
    if (q.fire) { this.fireZones.push({ owner: q.owner, x, y, r: q.rad * 0.9, t: a.fire, tick: 0, dmg: q.dmg * 0.25 }); this.vfx('burning_ground', x, y, { scale: 3, below: true }); }
  }
  updateTireShots(dt) {
    this.tireShots = this.tireShots.filter(q => {
      const legs = q.dur.length;
      if (q.squash > 0) {   // contact frame
        if ((q.squash -= dt) > 0) return true;
        if (q.leg >= legs) { q.s.destroy(); q.sh.destroy(); return false; }
        q.s.setTexture(q.fire && this.textures.exists('tire_fire') ? 'tire_fire' : 'tire'); return true;
      }
      q.t += dt; let k = Math.min(1, q.t / q.dur[q.leg]);
      const u = q.fr[q.leg] + (q.fr[q.leg + 1] - q.fr[q.leg]) * k; let gx = q.x0 + q.dx * q.D * u, gy = q.y0 + q.dy * q.D * u;
      if (!isWalk(gx, gy)) { k = 1; gx = q.lx ?? q.x0; gy = q.ly ?? q.y0; } else { q.lx = gx; q.ly = gy; }
      const h = 150 * (1 - 0.28 * q.leg) * Math.sin(Math.PI * k);
      q.s.setPosition(gx, gy - h - 22).setDepth(gy + 1).setRotation(q.s.rotation + dt * 12).setDisplaySize(54, 54); q.sh.setPosition(gx, gy).setScale(1 - h / 260);
      if (k >= 1) {
        this.tireLand(q, gx, gy); q.leg++; q.t = 0; q.squash = 0.14; q.s.setRotation(0).setPosition(gx, gy - 18);
        const sq = q.fire ? 'tire_fire_squash' : 'tire_squash';
        if (this.textures.exists(sq)) q.s.setTexture(sq).setDisplaySize(70, 46); else q.s.setDisplaySize(72, 36);
        if (q.leg >= legs) q.squash = 0.35;
      }
      return true;
    });
  }
  updateFireZones(dt) {
    this.fireZones = this.fireZones.filter(z => {
      z.t -= dt; z.tick -= dt;
      if (z.tick <= 0) { z.tick = 0.5; this.vfx('burning_ground', z.x + Phaser.Math.Between(-30, 30), z.y + Phaser.Math.Between(-20, 20), { scale: 2.4, below: true, alpha: 0.9 }); for (const t of this.enemiesOf(z.owner)) if (!t.isTower && !t.def?.lane && eDist(t.x, t.y, z.x, z.y) <= z.r + t.br * 0.5) this.damage(z.owner, t, z.dmg, 'magic', true); }
      return z.t > 0;
    });
  }
"""
s = s[:a] + tires + s[b:]
s = sub(s, "this.cages = []; this.tireShots = [];", "this.cages = []; this.tireShots = []; this.fireZones = [];")
s = sub(s, "this.updateTireShots(dt); this.updateCages(dt);", "this.updateTireShots(dt); this.updateFireZones(dt); this.updateCages(dt);")
# cage visuals: virtual arena
a = s.index("  updateCages(dt) {"); b = s.index("  // Leandro's tire throw:")
cage = """  arenaTex() {   // procedural fallback of the virtual arena floor (Codex's `virtual_arena` replaces it)
    if (this.textures.exists('virtual_arena')) return 'virtual_arena';
    if (!this.textures.exists('virt_arena_gen')) {
      const S = 512, t = this.textures.createCanvas('virt_arena_gen', S, S), x = t.getContext();
      x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, 6.2832); x.clip();
      const g = x.createRadialGradient(S / 2, S / 2, 20, S / 2, S / 2, S / 2); g.addColorStop(0, '#0d2a44'); g.addColorStop(1, '#050d1c'); x.fillStyle = g; x.fillRect(0, 0, S, S);
      x.strokeStyle = 'rgba(70,230,230,0.28)'; x.lineWidth = 2; for (let i = 0; i <= S; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.moveTo(0, i); x.lineTo(S, i); x.stroke(); }
      x.strokeStyle = 'rgba(120,255,240,0.55)'; x.lineWidth = 3; for (const r of [60, 130, 200, 250]) { x.beginPath(); x.arc(S / 2, S / 2, r, 0, 6.2832); x.stroke(); }
      x.lineWidth = 6; x.strokeStyle = 'rgba(100,255,230,0.9)'; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 6, 0, 6.2832); x.stroke(); t.refresh();
    }
    return 'virt_arena_gen';
  }
  updateCages(dt) {
    this.cages = this.cages.filter(c => (c.t -= dt) > 0 || (c.img?.destroy(), false));
    if (this.bot) return;
    const g = (this.cageG ||= this.add.graphics().setDepth(99980)), dk = (this.cageDark ||= this.add.graphics().setDepth(99985)); g.clear(); dk.clear(); const tt = this.time.now / 1000;
    for (const c of this.cages) {
      const fade = Math.min(1, c.t * 2, (c.T - c.t) * 3), pulse = 0.5 + 0.5 * Math.sin(tt * 6), inside = c.inside.has(this.pc);
      // the virtual arena replaces the terrain: under the units for the two inside, an opaque dome over everything for the rest
      c.img ||= this.add.image(c.x, c.y, this.arenaTex()).setDisplaySize(c.r * 2, c.r * 2);
      c.img.setDepth(inside ? -4 : 99970).setAlpha((inside ? 1 : 0.97) * fade).setRotation(inside ? 0 : Math.sin(tt * 0.5) * 0.02);
      if (inside) {   // everything outside the arena is pitch black for those inside
        const v = this.cameras.main.worldView, pad = 500, X0 = v.x - pad, Y0 = v.y - pad, X1 = v.right + pad, Y1 = v.bottom + pad, pts = [{ x: X0, y: Y0 }, { x: X1, y: Y0 }, { x: X1, y: Y1 }, { x: X0, y: Y1 }, { x: X0, y: Y0 }];
        for (let i = 0; i <= 64; i++) { const a = -i / 64 * Math.PI * 2; pts.push({ x: c.x + Math.cos(a) * c.r, y: c.y + Math.sin(a) * c.r }); }
        pts.push({ x: X0, y: Y0 }); dk.fillStyle(0x000000, 0.97 * fade).fillPoints(pts, true);
      }
      g.lineStyle(4, 0x66ffcc, (0.7 + 0.25 * pulse) * fade).strokeCircle(c.x, c.y, c.r);
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2 + tt * 0.3, x = c.x + Math.cos(a) * c.r, y = c.y + Math.sin(a) * c.r; g.lineStyle(3, 0x9fffe8, 0.55 * fade).lineBetween(x, y, x, y - 60); }
    }
  }
"""
s = s[:a] + cage + s[b:]
open(p, 'w', encoding='utf-8').write(s)

# ================= process_sprites.py =================
p = 'tools/process_sprites.py'; s = open(p, encoding='utf-8').read()
s = sub(s, "transform=8, lunge=6)", "transform=8, lunge=6, power1b=8, power2b_pull=6, power2b_push=6, power3b=6, ultb=8)")
open(p, 'w', encoding='utf-8').write(s)
print('ok')
