def edit(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (p, a[:90]); s = s.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(s)

# ================= data.js =================
s = open('src/data.js', encoding='utf-8').read()
a = s.index("    p1: { name: 'Decreto presidencial', icon: 'maduro_p1',"); b = s.index("  sb: {", a)
new = """    p1: { name: 'Decreto presidencial', icon: 'maduro_p1', cd: [10, 9, 8], mana: [60, 65, 70], windup: 0.3, dur: 0.6,
          desc: 'Lanza un discurso por un megáfono gigante en línea recta. Nivel 1: daño mágico y SILENCIO 1.5 s (el segundo campeón golpeado se ralentiza un 40 %). Nivel 2: las ondas se vuelven de un amarillo intenso y además ATURDEN 1 s. Nivel 3: las ondas son rojas, aturden 1.5 s, hacen mucho más daño y dejan manchas en el suelo.',
          dmg: [60, 100, 190], apScale: 0.6, length: 640, width: 84, silence: 1.5, stun: [0, 1, 1.5], slowPct: 0.4, slowTime: 2, stainTime: 7 },
    p2: { name: 'Colectivo protector', icon: 'maduro_p2', cd: [20, 18, 16], mana: [50, 55, 60], windup: 0.1, dur: 0.5,
          desc: 'Invoca guardaespaldas que lo siguen y lo rodean siempre. Al activarla aparecen 2 al instante; después invoca uno nuevo cada 15 s hasta llegar al límite (5 en el nivel 1), y al llegar al máximo no invoca más. Atacan con daño físico a los enemigos cercanos, tienen vida y son permanentes. Al mejorarla aumentan su daño, su vida, su cantidad máxima (5 → 7) y la invocación es más rápida.',
          initial: 2, cap: [5, 6, 7], interval: [15, 12, 10], hp: [260, 380, 520], dmg: [14, 22, 32], atkScale: 0.25 },
    p3: { name: 'La cesta básica', icon: 'maduro_p3', cd: [14, 13, 12], mana: [60, 65, 70], windup: 0.25, dur: 0.6,
          desc: 'Arroja una caja de recursos vacía que, al caer, queda en el mapa durante 1 minuto con su propia vida (desaparece al llegar a 0). Va soltando cucarachas que atacan al objetivo más cercano, y el área alrededor de la caja ENVENENA a los enemigos. Al mejorarla la caja tiene más vida, suelta más bichos y estos son MÁS GRANDES, con más vida y más armadura, y el veneno es más fuerte.',
          range: 520, radius: 160, life: 60, hp: [220, 340, 480], bugEvery: [6, 5, 4], bugCap: [4, 5, 6], bugHp: [60, 110, 180], bugArmor: [5, 18, 32], bugScale: [1, 1.5, 2.1], bugDmg: [8, 12, 16], poison: [10, 15, 22] },
    ult: { name: '¡Aparición de Súper Bigote!', icon: 'maduro_ult', cd: [100, 90, 80], mana: [100, 100, 100], windup: 0.5, dur: 0.9,
           desc: 'Se transforma en el superhéroe Súper Bigote durante 15 s. Una onda expansiva EMPUJA hacia atrás a todos a su alrededor (aliados incluidos, que no reciben daño) y daña a los enemigos. Nivel 1: onda blanca, empuje ligero. Nivel 2: onda azul, aleja más a todos. Nivel 3: onda roja, aleja aún más y causa mucho más daño. Mientras dura gana velocidad y armadura, y su Q, F y E se vuelven ofensivas: Puño de hierro, Escudo antimperialista y Mano de hierro.',
           time: 15, speed: 0.3, armor: [30, 45, 60], mr: [15, 25, 35], radius: [280, 360, 440], push: [200, 330, 470], dmg: [30, 55, 120], apScale: 0.4 },
  },
"""
s = s[:a] + new + s[b:]
open('src/data.js', 'w', encoding='utf-8').write(s)

# ================= fighter.js =================
s = open('src/fighter.js', encoding='utf-8').read()
def sub(a, b):
    global s
    assert a in s, a[:90]; s = s.replace(a, b, 1)
sub("  bot_melee:  { name: 'Bot',", """  bodyguard: { name: 'Guardaespaldas', isBot: true, bot: 'melee', guard: true, phys: true, ref: 'bodyguard', stats: { hp: 260, mana: 0, atk: 0, ap: 0, armor: 25, mr: 15, speed: 175, run: 215, range: 70, atkCd: 0.9 }, height: 100 },   // Maduro's permanent escorts
  crate: { name: 'Cesta', isBot: true, bot: 'crate', phys: true, ref: 'empty_box', radius: 34, stats: { hp: 220, mana: 0, atk: 0, ap: 0, armor: 10, mr: 0, speed: 0, run: 0, range: 0, atkCd: 9 }, height: 60 },   // Maduro's box: lasts a minute, spawns bugs and poisons the area
  roach: { name: 'Cucaracha', isBot: true, bot: 'melee', phys: true, ref: 'roach', stats: { hp: 60, mana: 0, atk: 0, ap: 0, armor: 5, mr: 0, speed: 190, run: 190, range: 46, atkCd: 0.7 }, height: 30 },
  bot_melee:  { name: 'Bot',""")
sub("      this.w.damage(this, t, this.botAp, 'magic');\n      this.w.vfx('spark', t.x, t.cy, { scale: 2.5 });","      this.w.damage(this, t, this.botAp, this.def.phys ? 'physical' : 'magic');\n      this.w.vfx('spark', t.x, t.cy, { scale: this.def.guard ? 2.2 : 1.6, tint: this.def.guard ? 0xffffff : 0xb8e06a });")
sub("  tintBot() { if (this.antivirus && this.hasAnims) return;","  tintBot() { if (this.def.guard || this.def.bot === 'crate' || this.key === 'roach') return; if (this.antivirus && this.hasAnims) return;")
# Maduro: guards
sub("  // ---- Diosa Canales ----\n", """  // ---- Maduro: bodyguards (W) ----
  guardTick(dt) {   // one more bodyguard every `interval` seconds until the cap; they are permanent
    if (this.w.net?.role === 'client') return;
    const a = CHAMPIONS.maduro.abilities.p2, r = this.ranks.p2; this.guards = (this.guards || []).filter(g => g.alive && !g.dispose);
    const dmg = rk(a.dmg, r) + this.atk * a.atkScale, hp = rk(a.hp, r);
    this.guards.forEach(g => { g.botAp = dmg; if (g.def.stats.hp !== hp) { g.hp += hp - g.def.stats.hp; g.def = { ...g.def, stats: { ...g.def.stats, hp } }; } });   // upgrades also improve the ones already out
    if (this.guards.length >= rk(a.cap, r)) { this.guardT = rk(a.interval, r); return; }
    if ((this.guardT = (this.guardT ?? rk(a.interval, r)) - dt) <= 0) { this.spawnGuard(); this.guardT = rk(a.interval, r); }
  }
  spawnGuard() {
    const w = this.w; if (w.net?.role === 'client') return false;
    const a = CHAMPIONS.maduro.abilities.p2, r = this.ranks.p2 || 1; this.guards = (this.guards || []).filter(g => g.alive && !g.dispose);
    if (this.guards.length >= rk(a.cap, r)) return false;
    const ang = Math.random() * 6.283, g = new Fighter(w, 'bodyguard', this.team, this.x + Math.cos(ang) * 70, this.y + Math.sin(ang) * 45, { ai: true, owner: this, botAp: rk(a.dmg, r) + this.atk * a.atkScale });
    g.def = { ...g.def, stats: { ...g.def.stats, hp: rk(a.hp, r) } }; g.hp = g.maxHp; g.ax = this.ax; g.ay = this.ay; w.fighters.push(g); this.guards.push(g);
    this.guards.forEach((q, i) => { const t = i / this.guards.length * Math.PI * 2; q.slot = { x: Math.cos(t) * 95, y: Math.sin(t) * 62 }; });   // always surrounding Maduro
    w.vfx('summon', g.x, g.y - 10, { scale: 2.4 }); return true;
  }
  // ---- Diosa Canales ----
""")
sub("    if (this.revealT > 0) this.revealT -= dt;","    if (this.key === 'maduro' && this.alive && this.ranks.p2 > 0) this.guardTick(dt);\n    if (this.revealT > 0) this.revealT -= dt;")
# p1: stun + colours + stains
sub("    if (k === 'p1' && !sb) {   // megaphone: damage + silence along a line, the second champion is also slowed\n      const dmg = rk(a.dmg, rank) + this.ap * a.apScale, pts = line(a.length);\n      for (let i = 1; i <= 6; i++) w.vfx('shockwave', this.x + this.ax * a.length * i / 6, this.y + this.ay * a.length * i / 6 - 8, { scale: 1 + i * 0.35, tint: 0xffd23f, alpha: 0.8 });",
    "    if (k === 'p1' && !sb) {   // megaphone: damage + silence along a line (+ stun from rank 2); the waves are pale yellow / intense yellow / red\n      const dmg = rk(a.dmg, rank) + this.ap * a.apScale, pts = line(a.length), col = [0xfff0b0, 0xffd000, 0xff2a2a][Math.min(2, rank - 1)], stun = rk(a.stun, rank);\n      for (let i = 1; i <= 6; i++) w.vfx('shockwave', this.x + this.ax * a.length * i / 6, this.y + this.ay * a.length * i / 6 - 8, { scale: 1 + i * 0.35, tint: col, alpha: 0.9 });\n      if (rank >= 3) for (let i = 1; i <= 8; i++) w.addStain(this.x + this.ax * a.length * i / 8, this.y + this.ay * a.length * i / 8, 38 + (i % 3) * 10, a.stainTime);   // red stains on the ground")
sub("        w.damage(this, t, dmg, 'magic'); t.silenceT = Math.max(t.silenceT, a.silence);\n        if (t.isChamp && ++champs === 2) t.slow(a.slowPct, a.slowTime);\n        w.vfx('spark', t.x, t.cy, { scale: 2.5, tint: 0xffd23f });",
    "        w.damage(this, t, dmg, 'magic'); t.silenceT = Math.max(t.silenceT, a.silence); if (stun > 0 && !t.isTower && !t.def?.static) t.stun(stun);\n        if (t.isChamp && ++champs === 2) t.slow(a.slowPct, a.slowTime);\n        w.vfx('spark', t.x, t.cy, { scale: 2.5, tint: col });")
# p2: bodyguards
a = s.index("    } else if (k === 'p2' && !sb) {   // bodyguards"); b = s.index("    } else if (k === 'p2') {   // Escudo antimperialista")
s = s[:a] + "    } else if (k === 'p2' && !sb) {   // bodyguards: 2 appear instantly, more come over time up to the cap (see guardTick)\n      for (let i = 0; i < a.initial; i++) this.spawnGuard(); this.guardT = rk(a.interval, rank);\n      w.vfx('shockwave', this.x, this.y - 6, { scale: 4, below: true, tint: 0x7ee0ff });\n" + s[b:]
# p3: thrown box
a = s.index("    } else if (k === 'p3' && !sb) {   // empty supply box"); b = s.index("    } else {   // Mano de hierro")
s = s[:a] + "    } else if (k === 'p3' && !sb) {   // the box is thrown, lands and stays on the map (see World.throwBox)\n      const c = this.castPoint || w.aiPoint(this, a.range); this.castPoint = null; w.throwBox(this, c, a, rank);\n" + s[b:]
# ult: shockwave
a = s.index("      w.vfx('shockwave', this.x, this.y - 6, { scale: 9, below: true, tint: 0xff4a3a }); w.vfx('levelup'"); b = s.index("      w.float(this.x, this.y - this.def.height - 50, '¡Con mi mano de hierro")
s = s[:a] + """      const R = rk(a.radius, rank), P = rk(a.push, rank), D = rk(a.dmg, rank) + this.ap * a.apScale, col = [0xffffff, 0x4aa3ff, 0xff3a3a][Math.min(2, rank - 1)];   // white / blue / red shockwave
      for (let i = 0; i < 4; i++) w.after(i * 0.06, () => w.vfx('shockwave', this.x, this.y - 6, { scale: R / 40 * (0.55 + i * 0.25), below: true, tint: col }));
      w.vfx('levelup', this.x, this.y - 10, { scale: 5 }); w.vfx('buff', this.x, this.cy, { scale: 3.5, tint: col }); w.zoneDecal(this.x, this.y, R, col, 0.9);
      w.fighters.forEach(t => {   // everybody around is pushed back (allies too, without damage)
        if (t === this || !t.alive || t.away || t.isTower || t.def?.static || t.def?.bot === 'crate') return;
        const dx = t.x - this.x, dy = t.y - this.y, d = Math.hypot(dx, dy) || 1; if (d > R) return;
        const amt = P * (t.isChamp ? 1 : 0.6) * (1 - 0.35 * d / R); t.shove = { vx: dx / d * amt / 0.3, vy: dy / d * amt / 0.3, t: 0.3 }; t.carriedT = Math.max(t.carriedT || 0, 0.3);
        if (t.team !== this.team) { w.damage(this, t, D, 'magic'); w.vfx('spark', t.x, t.cy, { scale: 3, tint: col }); }
      });
""" + s[b:]
s = s.replace("'¡Con mi mano de hierro, destruiré el sabotaje enemigo!', '#ffe27a');\n      w.showBanner?.({ title: '¡APARICIÓN DE SÚPER BIGOTE!', sub: 'Los enemigos del mapa se ralentizan',","'¡Con mi mano de hierro, destruiré el sabotaje enemigo!', '#ffe27a');\n      w.showBanner?.({ title: '¡APARICIÓN DE SÚPER BIGOTE!', sub: 'La onda expansiva empuja a todos hacia atrás',", 1)
open('src/fighter.js', 'w', encoding='utf-8').write(s)

# ================= world.js =================
s = open('src/world.js', encoding='utf-8').read()
def sub2(a, b):
    global s
    assert a in s, a[:90]; s = s.replace(a, b, 1)
sub2("    if (f.def.bot === 'wall') return;\n    if (f.isNexus) return;","    if (f.def.bot === 'wall') return;\n    if (f.def.bot === 'crate') return this.crateTick(f, dt);\n    if (f.isNexus) return;")
sub2("    const t = this.nearestEnemy(f, f.blindT > 0 ? 150 : f.enraged ? 1500 : f.isBot ? 600 : 900);\n    if (!t) {","    let t = this.nearestEnemy(f, f.blindT > 0 ? 150 : f.enraged ? 1500 : f.isBot ? 600 : f.def.guard ? 260 : 900);\n    if (f.def.guard && t && f.owner && dist(t, f.owner) > 340) t = null;   // bodyguards only fight what is close to Maduro\n    if (!t) {\n      if (f.home) { if (!f.home.alive || f.home.dispose) { f.dispose = true; return; } const dx = f.home.x - f.x, dy = f.home.y - f.y; if (Math.hypot(dx, dy) > 150) { f.in.mx = dx; f.in.my = dy; f.setAim(dx, dy); } return; }   // bugs hang around their box")
sub2("  updateMeet(dt) {","""  // ---- Maduro's box (E): thrown, stays on the map, spawns bugs, poisons the area ----
  throwBox(owner, c, a, rank) {
    const img = this.add.image(owner.x, owner.y - owner.def.height * 0.6, 'empty_box').setDepth(99000), sc = 64 / Math.max(1, img.height); img.setScale(sc);
    const x0 = owner.x, y0 = owner.y - owner.def.height * 0.6, k = { v: 0 };
    this.tweens.add({ targets: k, v: 1, duration: 650, ease: 'Sine.easeInOut', onUpdate: () => { img.setPosition(x0 + (c.x - x0) * k.v, y0 + (c.y - y0) * k.v - Math.sin(Math.PI * k.v) * 190).setAngle(k.v * 540); },
      onComplete: () => {
        img.destroy(); this.vfx('shockwave', c.x, c.y, { scale: 3, below: true, tint: 0xffd23f }); this.vfx('run_dust', c.x, c.y - 6, { scale: 3, alpha: 0.9 });
        if (this.net?.role === 'client') return;
        const cr = new Fighter(this, 'crate', owner.team, c.x, c.y, { ai: true, owner, life: a.life }); cr.def = { ...cr.def, stats: { ...cr.def.stats, hp: rk(a.hp, rank) } }; cr.hp = cr.maxHp; cr.spawnT = 1.5; cr.bugs = []; cr.crateRank = rank; this.fighters.push(cr);
      } });
  }
  crateTick(f, dt) {
    const a = CHAMPIONS.maduro.abilities.p3, r = f.owner?.ranks?.p3 || f.crateRank || 1; f.bugs = (f.bugs || []).filter(b => b.alive && !b.dispose);
    if (f.bugs.length < rk(a.bugCap, r) && (f.spawnT = (f.spawnT ?? 2) - dt) <= 0) {
      f.spawnT = rk(a.bugEvery, r); const ang = Math.random() * 6.283, b = new Fighter(this, 'roach', f.team, f.x + Math.cos(ang) * 40, f.y + Math.sin(ang) * 30, { ai: true, owner: f.owner, botAp: rk(a.bugDmg, r) });
      b.def = { ...b.def, stats: { ...b.def.stats, hp: rk(a.bugHp, r), armor: rk(a.bugArmor, r) } }; b.hp = b.maxHp; b.home = f; { const k = rk(a.bugScale, r); b.baseScale *= k; b.spr.setScale(b.baseScale); b.shadow?.setScale(b.shadow.scaleX * k, b.shadow.scaleY * k); } this.fighters.push(b); f.bugs.push(b); this.vfx('run_dust', b.x, b.y - 4, { scale: 1.2, alpha: 0.8 });
    }
    if ((f.poisonT = (f.poisonT || 0) - dt) <= 0) { f.poisonT = 0.5; this.enemiesNear(f.team, f.x, f.y, a.radius).forEach(t => { if (!t.isTower && !t.def?.static) t.poison(rk(a.poison, r), 1.0, f.owner, 'physical', 'crate' + f.nid); }); }
  }
  drawCrates() {   // poison area around every box
    const g = (this.crateG ||= this.add.graphics().setDepth(-869)); g.clear(); if (this.bot) return; const t = this.time.now / 1000, R = CHAMPIONS.maduro.abilities.p3.radius;
    for (const f of this.fighters) if (f.def?.bot === 'crate' && f.alive) { const pulse = 0.5 + 0.5 * Math.sin(t * 2 + f.nid); g.fillStyle(0x7dff4a, 0.08 + 0.05 * pulse).fillEllipse(f.x, f.y, R * 2, R * 2 * YR).lineStyle(2, 0x9cff6a, 0.45).strokeEllipse(f.x, f.y, R * 2, R * 2 * YR); }
  }
  // ground stains (Decreto presidencial level 3)
  addStain(x, y, r, life) { const bl = []; for (let i = 0; i < 6; i++) bl.push([(Math.random() - 0.5) * r * 1.4, (Math.random() - 0.5) * r * 0.9, r * (0.35 + Math.random() * 0.4)]); (this.stains ||= []).push({ x, y, bl, t: life, T: life }); }
  drawStains(dt) {
    const g = (this.stainG ||= this.add.graphics().setDepth(-868)); g.clear(); if (!this.stains?.length) return;
    this.stains = this.stains.filter(s => (s.t -= dt) > 0);
    for (const s of this.stains) { const a = Math.min(1, s.t / 1.5) * 0.55; for (const [dx, dy, r] of s.bl) g.fillStyle(0x8a0f0f, a).fillEllipse(s.x + dx, s.y + dy, r * 2, r * 2 * YR); g.fillStyle(0x500606, a * 0.7).fillEllipse(s.x, s.y, s.bl[0][2] * 1.2, s.bl[0][2] * 0.9); }
  }
  updateMeet(dt) {""")
sub2(" this.updateBushes(dt); this.updateMeet(dt); this.updateRecallFx(dt);"," this.updateBushes(dt); this.updateMeet(dt); this.updateRecallFx(dt); this.drawCrates(); this.drawStains(dt);")
# roach placeholder texture
ROACH = """    mk('roach', 40, 24, g => {   // Maduro's cockroach: brown oval body, head, legs and antennae, facing right
      g.lineStyle(2, 0x2a1608).beginPath().moveTo(12, 10).lineTo(6, 3).moveTo(18, 10).lineTo(18, 2).moveTo(24, 10).lineTo(30, 3).moveTo(12, 15).lineTo(6, 22).moveTo(18, 16).lineTo(18, 23).moveTo(24, 15).lineTo(30, 22).moveTo(33, 11).lineTo(39, 5).moveTo(33, 13).lineTo(39, 17).strokePath();
      g.fillStyle(0x2a1608).fillEllipse(19, 13, 28, 17).fillCircle(31, 13, 7); g.fillStyle(0x7a3f14).fillEllipse(19, 13, 25, 14).fillCircle(31, 13, 5); g.fillStyle(0xb8742a).fillEllipse(17, 11, 14, 5);
    });
"""
A = "    for (const [key, up] of [['bird_a', true], ['bird_b', false]]) mk(key, 34, 28, g => {"
sub2(A, ROACH + A)
open('src/world.js', 'w', encoding='utf-8').write(s)
print('ok')
